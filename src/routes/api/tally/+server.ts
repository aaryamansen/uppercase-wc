/**
 * Cumulative goal tally — shared by every visitor.
 * ----------------------------------------------------------------------------
 * A serverless route backed by a Vercel KV (Upstash Redis) store. Each completed
 * match POSTs the goals scored with the chosen bag here; the running total per
 * bag is kept in two Redis hashes and read back to render the tally board on the
 * coupon screen.
 *
 *   tally:goals  →  { germany: 1234, brazil: 980, ... }   total goals per bag
 *   tally:plays  →  { germany: 540,  brazil: 410, ... }   completed matches per bag
 *
 * Storage is reached over Upstash's REST API (just `fetch`, no SDK). The env vars
 * are injected automatically when a Vercel KV / Upstash store is connected to the
 * project. With no store configured (e.g. local dev) it falls back to an
 * in-memory tally so the UI still works — that copy is per-instance and resets.
 *
 * Debug: GET /api/tally?debug=1 reports (without leaking secrets) whether the
 * store env vars are visible to the function and whether a PING succeeds.
 */
import { json, type RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { TEAMS } from '$lib/config';

// This route is dynamic — never prerender it (the root layout opts pages in).
export const prerender = false;

const GOALS_KEY = 'tally:goals';
const PLAYS_KEY = 'tally:plays';

/** Valid bag identifiers — only these may be written to, so the tally can't be spammed. */
const BAG_IDS = new Set(TEAMS.map((t) => t.id));

// Read lazily on each request: $env/dynamic/private is resolved at runtime, and
// reading per-request avoids any module-load timing surprises on the platform.
function redisCreds() {
  const url = env.KV_REST_API_URL ?? env.UPSTASH_REDIS_REST_URL ?? '';
  const token = env.KV_REST_API_TOKEN ?? env.UPSTASH_REDIS_REST_TOKEN ?? '';
  return { url: url.replace(/\/$/, ''), token, configured: Boolean(url && token) };
}

// In-memory fallback for local dev / unconfigured deploys (per-instance, resets).
const memGoals: Record<string, number> = {};
const memPlays: Record<string, number> = {};

type Tally = { goals: Record<string, number>; plays: Record<string, number> };

/** Run a list of Redis commands in one round trip via the Upstash REST pipeline. */
async function pipeline(commands: (string | number)[][]): Promise<unknown[]> {
  const { url, token } = redisCreds();
  const res = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(commands)
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Redis pipeline ${res.status}: ${text.slice(0, 200)}`);
  const out = JSON.parse(text) as { result?: unknown; error?: string }[];
  const failed = out.find((r) => r.error);
  if (failed) throw new Error(`Redis command error: ${failed.error}`);
  return out.map((r) => r.result);
}

/**
 * Fold an Upstash HGETALL reply into a number map. Raw REST returns a flat
 * [field, value, …] array, but be tolerant of an object reply too.
 */
function toNumberMap(reply: unknown): Record<string, number> {
  const map: Record<string, number> = {};
  if (Array.isArray(reply)) {
    for (let i = 0; i < reply.length; i += 2) map[String(reply[i])] = Number(reply[i + 1]) || 0;
  } else if (reply && typeof reply === 'object') {
    for (const [k, v] of Object.entries(reply as Record<string, unknown>)) map[k] = Number(v) || 0;
  }
  return map;
}

/** Ensure every known bag id is present (default 0) so the UI always has all four. */
function normalize(raw: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const id of BAG_IDS) out[id] = raw[id] ?? 0;
  return out;
}

async function readTally(): Promise<Tally> {
  if (!redisCreds().configured) {
    return { goals: normalize(memGoals), plays: normalize(memPlays) };
  }
  const [goals, plays] = await pipeline([
    ['HGETALL', GOALS_KEY],
    ['HGETALL', PLAYS_KEY]
  ]);
  return { goals: normalize(toNumberMap(goals)), plays: normalize(toNumberMap(plays)) };
}

export const GET: RequestHandler = async ({ url }) => {
  // Safe diagnostic — never returns the URL or token, only whether they're seen.
  if (url.searchParams.get('debug')) {
    const { url: redisUrl, token, configured } = redisCreds();
    let ping: string | null = null;
    let error: string | null = null;
    if (configured) {
      try {
        const res = await fetch(`${redisUrl}/ping`, { headers: { authorization: `Bearer ${token}` } });
        ping = `${res.status}: ${(await res.text()).slice(0, 120)}`;
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
      }
    }
    return json({
      configured,
      urlPresent: Boolean(redisUrl),
      tokenPresent: Boolean(token),
      urlHost: redisUrl ? new URL(redisUrl).host : null,
      source: env.KV_REST_API_URL ? 'KV_REST_API_*' : env.UPSTASH_REDIS_REST_URL ? 'UPSTASH_REDIS_REST_*' : null,
      ping,
      error
    });
  }

  try {
    return json(await readTally());
  } catch (e) {
    // Storage hiccup must never break the coupon screen — return an empty board,
    // but log so it shows up in the Vercel function logs.
    console.error('[tally] GET failed:', e);
    return json({ goals: normalize({}), plays: normalize({}) });
  }
};

export const POST: RequestHandler = async ({ request }) => {
  let bagId = '';
  let goals = 0;
  try {
    const body = (await request.json()) as { bagId?: unknown; goals?: unknown };
    bagId = String(body.bagId ?? '');
    goals = Math.round(Number(body.goals));
  } catch {
    return json({ error: 'invalid body' }, { status: 400 });
  }

  // Guard the counters: known bag only, and a sane goals range (0–3 per match).
  if (!BAG_IDS.has(bagId) || !Number.isFinite(goals) || goals < 0 || goals > 3) {
    return json({ error: 'invalid bag or goals' }, { status: 400 });
  }

  try {
    if (!redisCreds().configured) {
      memGoals[bagId] = (memGoals[bagId] ?? 0) + goals;
      memPlays[bagId] = (memPlays[bagId] ?? 0) + 1;
      return json({ goals: normalize(memGoals), plays: normalize(memPlays) });
    }
    const results = await pipeline([
      ['HINCRBY', GOALS_KEY, bagId, goals],
      ['HINCRBY', PLAYS_KEY, bagId, 1],
      ['HGETALL', GOALS_KEY],
      ['HGETALL', PLAYS_KEY]
    ]);
    return json({
      goals: normalize(toNumberMap(results[2])),
      plays: normalize(toNumberMap(results[3]))
    });
  } catch (e) {
    console.error('[tally] POST failed:', e);
    return json({ error: 'storage unavailable' }, { status: 502 });
  }
};
