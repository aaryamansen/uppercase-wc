/**
 * In-memory game state.
 * ----------------------------------------------------------------------------
 * Simple Svelte stores — no persistence, no localStorage, no backend.
 * Everything resets on reload, exactly as the brief requires.
 */
import { derived, writable } from 'svelte/store';
import { rewardForGoals, teamById, TOTAL_PENALTIES, type RewardTier, type Team } from './config';

export type Screen = 'hero' | 'intro' | 'game' | 'results' | 'leaderboard';

export type ShotResult = 'goal' | 'saved' | 'missed';

/** A saved leaderboard entry. */
export interface LeaderboardEntry {
  id: string;
  name: string;
  goals: number;
  total: number;
  team: string;
  date: number; // epoch ms
}

const LEADERBOARD_KEY = 'penalty-cup-leaderboard';

function loadLeaderboard(): LeaderboardEntry[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LEADERBOARD_KEY);
    return raw ? (JSON.parse(raw) as LeaderboardEntry[]) : [];
  } catch {
    return [];
  }
}

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

/** Persisted leaderboard, ranked high→low. Survives reloads via localStorage. */
export const leaderboard = writable<LeaderboardEntry[]>(loadLeaderboard());

leaderboard.subscribe((entries) => {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(entries));
  } catch {
    /* storage full / blocked — leaderboard simply won't persist */
  }
});

/**
 * Save a score to the leaderboard and return the created entry (so the UI can
 * highlight it). Entries are kept sorted by goals desc, then earliest first.
 */
export function saveScore(name: string, goals: number, total: number, team: string): LeaderboardEntry {
  const entry: LeaderboardEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim().slice(0, 20) || 'Anonymous',
    goals,
    total,
    team,
    date: Date.now()
  };
  leaderboard.update((list) =>
    [...list, entry].sort((a, b) => b.goals - a.goals || a.date - b.date)
  );
  return entry;
}

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
