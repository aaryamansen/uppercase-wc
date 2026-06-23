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

const REDIS_URL = env.KV_REST_API_URL ?? env.UPSTASH_REDIS_REST_URL ?? '';
const REDIS_TOKEN = env.KV_REST_API_TOKEN ?? env.UPSTASH_REDIS_REST_TOKEN ?? '';
const hasRedis = Boolean(REDIS_URL && REDIS_TOKEN);

// In-memory fallback for local dev / unconfigured deploys (per-instance, resets).
const memGoals: Record<string, number> = {};
const memPlays: Record<string, number> = {};

type Tally = { goals: Record<string, number>; plays: Record<string, number> };

/** Run a list of Redis commands in one round trip via the Upstash REST pipeline. */
async function pipeline(commands: (string | number)[][]): Promise<unknown[]> {
  const res = await fetch(`${REDIS_URL}/pipeline`, {
    method: 'POST',
    headers: { authorization: `Bearer ${REDIS_TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify(commands)
  });
  if (!res.ok) throw new Error(`Redis pipeline failed: ${res.status}`);
  const out = (await res.json()) as { result?: unknown; error?: string }[];
  return out.map((r) => r.result);
}

/** Upstash HGETALL returns a flat [field, value, …] array — fold it into a number map. */
function toNumberMap(flat: unknown): Record<string, number> {
  const map: Record<string, number> = {};
  if (Array.isArray(flat)) {
    for (let i = 0; i < flat.length; i += 2) {
      map[String(flat[i])] = Number(flat[i + 1]) || 0;
    }
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
  if (!hasRedis) {
    return { goals: normalize(memGoals), plays: normalize(memPlays) };
  }
  const [goals, plays] = await pipeline([
    ['HGETALL', GOALS_KEY],
    ['HGETALL', PLAYS_KEY]
  ]);
  return { goals: normalize(toNumberMap(goals)), plays: normalize(toNumberMap(plays)) };
}

export const GET: RequestHandler = async () => {
  try {
    return json(await readTally());
  } catch {
    // Storage hiccup must never break the coupon screen — return an empty board.
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
    if (!hasRedis) {
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
  } catch {
    return json({ error: 'storage unavailable' }, { status: 502 });
  }
};
