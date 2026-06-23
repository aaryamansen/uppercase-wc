import { json } from "@sveltejs/kit";
import { b as private_env } from "../../../../chunks/shared-server.js";
import { T as TEAMS } from "../../../../chunks/config.js";
const prerender = false;
const GOALS_KEY = "tally:goals";
const PLAYS_KEY = "tally:plays";
const BAG_IDS = new Set(TEAMS.map((t) => t.id));
function redisCreds() {
  const url = private_env.KV_REST_API_URL ?? private_env.UPSTASH_REDIS_REST_URL ?? "";
  const token = private_env.KV_REST_API_TOKEN ?? private_env.UPSTASH_REDIS_REST_TOKEN ?? "";
  return { url: url.replace(/\/$/, ""), token, configured: Boolean(url && token) };
}
const memGoals = {};
const memPlays = {};
async function pipeline(commands) {
  const { url, token } = redisCreds();
  const res = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(commands)
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Redis pipeline ${res.status}: ${text.slice(0, 200)}`);
  const out = JSON.parse(text);
  const failed = out.find((r) => r.error);
  if (failed) throw new Error(`Redis command error: ${failed.error}`);
  return out.map((r) => r.result);
}
function toNumberMap(reply) {
  const map = {};
  if (Array.isArray(reply)) {
    for (let i = 0; i < reply.length; i += 2) map[String(reply[i])] = Number(reply[i + 1]) || 0;
  } else if (reply && typeof reply === "object") {
    for (const [k, v] of Object.entries(reply)) map[k] = Number(v) || 0;
  }
  return map;
}
function normalize(raw) {
  const out = {};
  for (const id of BAG_IDS) out[id] = raw[id] ?? 0;
  return out;
}
async function readTally() {
  if (!redisCreds().configured) {
    return { goals: normalize(memGoals), plays: normalize(memPlays) };
  }
  const [goals, plays] = await pipeline([
    ["HGETALL", GOALS_KEY],
    ["HGETALL", PLAYS_KEY]
  ]);
  return { goals: normalize(toNumberMap(goals)), plays: normalize(toNumberMap(plays)) };
}
const GET = async ({ url }) => {
  if (url.searchParams.get("debug")) {
    const { url: redisUrl, token, configured } = redisCreds();
    let ping = null;
    let error = null;
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
      source: private_env.KV_REST_API_URL ? "KV_REST_API_*" : private_env.UPSTASH_REDIS_REST_URL ? "UPSTASH_REDIS_REST_*" : null,
      ping,
      error
    });
  }
  try {
    return json(await readTally());
  } catch (e) {
    console.error("[tally] GET failed:", e);
    return json({ goals: normalize({}), plays: normalize({}) });
  }
};
const POST = async ({ request }) => {
  let bagId = "";
  let goals = 0;
  try {
    const body = await request.json();
    bagId = String(body.bagId ?? "");
    goals = Math.round(Number(body.goals));
  } catch {
    return json({ error: "invalid body" }, { status: 400 });
  }
  if (!BAG_IDS.has(bagId) || !Number.isFinite(goals) || goals < 0 || goals > 3) {
    return json({ error: "invalid bag or goals" }, { status: 400 });
  }
  try {
    if (!redisCreds().configured) {
      memGoals[bagId] = (memGoals[bagId] ?? 0) + goals;
      memPlays[bagId] = (memPlays[bagId] ?? 0) + 1;
      return json({ goals: normalize(memGoals), plays: normalize(memPlays) });
    }
    const results = await pipeline([
      ["HINCRBY", GOALS_KEY, bagId, goals],
      ["HINCRBY", PLAYS_KEY, bagId, 1],
      ["HGETALL", GOALS_KEY],
      ["HGETALL", PLAYS_KEY]
    ]);
    return json({
      goals: normalize(toNumberMap(results[2])),
      plays: normalize(toNumberMap(results[3]))
    });
  } catch (e) {
    console.error("[tally] POST failed:", e);
    return json({ error: "storage unavailable" }, { status: 502 });
  }
};
export {
  GET,
  POST,
  prerender
};
