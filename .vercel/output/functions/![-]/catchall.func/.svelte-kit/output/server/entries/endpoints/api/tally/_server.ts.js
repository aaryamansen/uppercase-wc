import { json } from "@sveltejs/kit";
import { b as private_env } from "../../../../chunks/shared-server.js";
import { T as TEAMS } from "../../../../chunks/config.js";
const prerender = false;
const GOALS_KEY = "tally:goals";
const PLAYS_KEY = "tally:plays";
const BAG_IDS = new Set(TEAMS.map((t) => t.id));
const REDIS_URL = private_env.KV_REST_API_URL ?? private_env.UPSTASH_REDIS_REST_URL ?? "";
const REDIS_TOKEN = private_env.KV_REST_API_TOKEN ?? private_env.UPSTASH_REDIS_REST_TOKEN ?? "";
const hasRedis = Boolean(REDIS_URL && REDIS_TOKEN);
const memGoals = {};
const memPlays = {};
async function pipeline(commands) {
  const res = await fetch(`${REDIS_URL}/pipeline`, {
    method: "POST",
    headers: { authorization: `Bearer ${REDIS_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify(commands)
  });
  if (!res.ok) throw new Error(`Redis pipeline failed: ${res.status}`);
  const out = await res.json();
  return out.map((r) => r.result);
}
function toNumberMap(flat) {
  const map = {};
  if (Array.isArray(flat)) {
    for (let i = 0; i < flat.length; i += 2) {
      map[String(flat[i])] = Number(flat[i + 1]) || 0;
    }
  }
  return map;
}
function normalize(raw) {
  const out = {};
  for (const id of BAG_IDS) out[id] = raw[id] ?? 0;
  return out;
}
async function readTally() {
  if (!hasRedis) {
    return { goals: normalize(memGoals), plays: normalize(memPlays) };
  }
  const [goals, plays] = await pipeline([
    ["HGETALL", GOALS_KEY],
    ["HGETALL", PLAYS_KEY]
  ]);
  return { goals: normalize(toNumberMap(goals)), plays: normalize(toNumberMap(plays)) };
}
const GET = async () => {
  try {
    return json(await readTally());
  } catch {
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
    if (!hasRedis) {
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
  } catch {
    return json({ error: "storage unavailable" }, { status: 502 });
  }
};
export {
  GET,
  POST,
  prerender
};
