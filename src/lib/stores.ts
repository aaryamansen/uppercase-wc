/**
 * In-memory game state.
 * ----------------------------------------------------------------------------
 * Simple Svelte stores — no persistence, no localStorage, no backend.
 * Everything resets on reload, exactly as the brief requires.
 */
import { derived, writable } from 'svelte/store';
import { rewardForGoals, teamById, TOTAL_PENALTIES, type RewardTier, type Team } from './config';

export type Screen = 'hero' | 'intro' | 'game' | 'results';

export type ShotResult = 'goal' | 'saved' | 'missed';

export const screen = writable<Screen>('hero');

/** Selected team id (drives the ball colourway and the bag). */
export const selectedTeamId = writable<string | null>(null);

/** Which penalty we're on (0-indexed during play). */
export const currentPenalty = writable<number>(0);

/** Goals scored so far this session. */
export const goalsScored = writable<number>(0);

/** Ordered history of each shot's outcome. */
export const shotHistory = writable<ShotResult[]>([]);

/** Global mute toggle (muted by default to respect autoplay policies). */
export const muted = writable<boolean>(true);

/** Resolved selected team object. */
export const selectedTeam = derived<typeof selectedTeamId, Team | undefined>(
  selectedTeamId,
  ($id) => teamById($id)
);

/** Resolved reward tier for the current score. */
export const coupon = derived<typeof goalsScored, RewardTier>(goalsScored, ($goals) =>
  rewardForGoals($goals)
);

/** Convenience: the coupon code string. */
export const couponCode = derived(coupon, ($c) => $c.code);

/** Record one shot and advance match state. */
export function recordShot(result: ShotResult) {
  shotHistory.update((h) => [...h, result]);
  if (result === 'goal') goalsScored.update((g) => g + 1);
  currentPenalty.update((p) => p + 1);
}

/** Reset everything for a fresh session (keeps mute preference). */
export function resetMatch() {
  selectedTeamId.set(null);
  currentPenalty.set(0);
  goalsScored.set(0);
  shotHistory.set([]);
  screen.set('hero');
}

/** Reset only the scoreline, keeping the chosen team (Play Again). */
export function replaySameTeam() {
  currentPenalty.set(0);
  goalsScored.set(0);
  shotHistory.set([]);
  screen.set('intro');
}

export { TOTAL_PENALTIES };
