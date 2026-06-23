/**
 * Campaign configuration.
 * ----------------------------------------------------------------------------
 * Everything a marketer needs to re-skin this activation lives here:
 *   • teams (flag colourway → football skin + UI gradient)
 *   • bags (the product photo the player is choosing between)
 *   • coupon codes, discount values and shop URLs
 *
 * Swap any of these values to run a new campaign WITHOUT touching game code.
 * The chosen team's `colorway` is what loads the matching ball skin in play.
 */

import type { Colorway } from './game/ball';

export interface BagDesign {
  /** Display name of the bag product. */
  name: string;
  /** Product photo (lives under /public/assets/bags). */
  image: string;
  /** Accent colour used for card glow / chrome. */
  accent: string;
}

export interface Team {
  id: string;
  /** Country display name. */
  name: string;
  /** Short tagline shown on the selection card. */
  tagline: string;
  /** Flag colours — drive the football skin and the UI gradient. */
  colorway: Colorway;
  /** The paired bag the player wins. */
  bag: BagDesign;
}

export interface RewardTier {
  goals: number;
  discount: number; // percentage
  code: string;
  message: string;
  /** Where "SHOP NOW" sends the user. Configurable per tier if desired. */
  shopUrl: string;
}

/** Single place to point every CTA. Tiers fall back to this. */
export const DEFAULT_SHOP_URL = 'https://uppercase.co.in';

export const TEAMS: Team[] = [
  {
    id: 'germany',
    name: 'Germany',
    tagline: 'Die Mannschaft',
    colorway: { c1: '#141414', c2: '#DD0000', c3: '#FFCE00' },
    bag: { name: 'Kicks Black', image: '/assets/bags/germany-2.png', accent: '#FFCE00' }
  },
  {
    id: 'brazil',
    name: 'Brazil',
    tagline: 'Seleção · Samba flair',
    colorway: { c1: '#009C3B', c2: '#FFDF00', c3: '#002776' },
    bag: { name: 'Kicks Yellow', image: '/assets/bags/brazil-2.png', accent: '#FFDF00' }
  },
  {
    id: 'argentina',
    name: 'Argentina',
    tagline: 'La Albiceleste',
    colorway: { c1: '#74ACDF', c2: '#FFFFFF', c3: '#F6B40E' },
    bag: { name: 'Kicks Blue', image: '/assets/bags/argentina-2.png', accent: '#74ACDF' }
  },
  {
    id: 'portugal',
    name: 'Portugal',
    tagline: 'Seleção das Quinas',
    colorway: { c1: '#006600', c2: '#FF0000', c3: '#FFD700' },
    bag: { name: 'Kicks Red', image: '/assets/bags/portugal-2.png', accent: '#E4080A' }
  }
];

/**
 * Reward ladder, keyed by goals scored (0–3).
 * Tune discount / code / copy here.
 */
export const REWARDS: Record<number, RewardTier> = {
  0: { goals: 0, discount: 5, code: 'KICKS10', message: 'Better luck next match.', shopUrl: DEFAULT_SHOP_URL },
  1: { goals: 1, discount: 10, code: 'KICKS10', message: 'Nice finish.', shopUrl: DEFAULT_SHOP_URL },
  2: { goals: 2, discount: 15, code: 'KICKS15', message: 'Strong performance.', shopUrl: DEFAULT_SHOP_URL },
  3: { goals: 3, discount: 20, code: 'KICKS20', message: 'Perfect hat trick.', shopUrl: DEFAULT_SHOP_URL }
};

export function rewardForGoals(goals: number): RewardTier {
  return REWARDS[Math.max(0, Math.min(3, goals))];
}

export function teamById(id: string | null): Team | undefined {
  return TEAMS.find((t) => t.id === id);
}

/** Total penalties taken per session (one per difficulty level). */
export const TOTAL_PENALTIES = 3;

/** Short label for each kick's keeper difficulty. */
export const LEVELS = [
  { name: 'Level 1: Easy', keeper: 'Reads a tell' },
  { name: 'Level 2: Tricky', keeper: 'Reads your side, not height' },
  { name: 'Level 3: Elite', keeper: 'Owns his side — go high' }
] as const;
