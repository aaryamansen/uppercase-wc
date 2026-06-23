/**
 * Analytics — thin wrapper around Vercel Web Analytics.
 * ----------------------------------------------------------------------------
 * The app is deployed on Vercel, so Web Analytics is enabled automatically once
 * `initAnalytics()` injects the script. Custom events (e.g. which bag a player
 * picks) show up in the Vercel dashboard under Analytics → Events, where you can
 * break the `bag_selected` count down by the `bag` / `team` property.
 *
 * Everything here is wrapped so a blocked/failed analytics script can never
 * interrupt gameplay — tracking is strictly best-effort.
 */
import { injectAnalytics, track as vercelTrack } from '@vercel/analytics/sveltekit';

type EventProps = Record<string, string | number | boolean | null | undefined>;

/** Load the Vercel Analytics script. Call once, on app start. */
export function initAnalytics() {
  try {
    injectAnalytics();
  } catch {
    /* analytics is best-effort — never block the app */
  }
}

/** Fire a custom event. No-op if analytics is unavailable. */
export function track(event: string, props?: EventProps) {
  try {
    vercelTrack(event, props);
  } catch {
    /* swallow — analytics must never break the experience */
  }
}
