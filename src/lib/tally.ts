/**
 * Client helper for the cumulative, cross-visitor goal tally.
 * ----------------------------------------------------------------------------
 * Talks to the /api/tally serverless route (Vercel KV / Upstash Redis). Goals
 * are keyed by bag id; the UI maps those to bag names via config — the country
 * name is never surfaced.
 */

export interface Tally {
  /** Total goals scored with each bag, keyed by bag (team) id. */
  goals: Record<string, number>;
  /** Completed matches with each bag, keyed by bag (team) id. */
  plays: Record<string, number>;
}

const EMPTY: Tally = { goals: {}, plays: {} };

/** Read the current cumulative tally. Returns an empty board if anything fails. */
export async function getTally(): Promise<Tally> {
  try {
    const res = await fetch('/api/tally');
    if (!res.ok) return EMPTY;
    return (await res.json()) as Tally;
  } catch {
    return EMPTY;
  }
}

/**
 * Record the goals scored with a bag for a completed match and get the updated
 * board back. Falls back to a plain read if the write fails so the UI still
 * renders the latest totals.
 */
export async function recordGoals(bagId: string, goals: number): Promise<Tally> {
  try {
    const res = await fetch('/api/tally', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ bagId, goals })
    });
    if (!res.ok) return getTally();
    return (await res.json()) as Tally;
  } catch {
    return getTally();
  }
}
