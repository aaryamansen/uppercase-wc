# Penalty Cup — Mobile POV Penalty Promo Game

A lightweight, mobile-first web game for a bag-brand campaign. Pick a World
Cup–inspired **bag**, take **3 first-person penalty kicks** against three
progressively smarter keepers, and walk away with a discount code for the
matching bag — all in under 60 seconds.

> **You only see the ball.** It's a POV penalty: tap the goal to aim, set the
> power, and bend your shot past the keeper. Your chosen bag loads the matching
> flag-coloured football.

No backend. No accounts. No database. No commerce integration. All state lives
in memory and the whole thing deploys as a **static site**.

## Stack

- **SvelteKit** + **TypeScript** (static adapter, SPA, fully prerendered)
- **TailwindCSS v4** for the modern UI layer
- **DOM + CSS transforms** for the gameplay scene — a photographic pitch
  (`public/assets/pitch.png`), PNG goalkeeper sprites and an inline **SVG
  football** that recolours to the chosen team. No canvas, no sprite sheets.
- **WebAudio** procedural SFX (no audio files shipped)

Campaign art lives in `public/` (served at `/assets/...`).

## Run it

```bash
npm install
npm run dev        # local dev at http://localhost:5173
npm run build      # static export to ./build
npm run preview    # preview the production build
npm run check      # type-check
```

Append `?debug=1` to the URL to overlay the goal grid + penalty spot used to
place the keeper and ball against the pitch photo.

`./build` is a static site — drop it on any static host (Netlify, Vercel,
S3/CloudFront, GitHub Pages, …).

## User flow

1. **Pick Your Bag** — four bags (2×2), one per country. The bag you choose
   sets your **ball colourway** and themes the UI gradient.
2. **Match Intro** — your flag-coloured football and the three-level ladder.
3. **Gameplay (POV)** — tap the goal to aim (you can aim *wide* and miss),
   drag the colourway **power** slider, then **SHOOT**. Light 2D physics curves
   and dips the ball. Three kicks, one keeper per level.
4. **Results** — score, bag, discount %, coupon code (copy), **SHOP NOW**, and
   Play Again / Change Bag.

## The three keepers

One kick per level — the keeper gets harder to beat each time
(`PenaltyGame.keeperDecision`):

| Level | Keeper behaviour                                                              | How to beat it                              |
| ----: | ---------------------------------------------------------------------------- | ------------------------------------------- |
|     1 | Commits to a pre-chosen dive, telegraphed by an idle **lean** (a "tell").     | Read the lean, shoot the other way.         |
|     2 | **Roves** left↔right and can only dive in the direction he is already moving. | Shoot to the side he's moving *away* from.  |
|     3 | Always reads your **side** (L/M/R) but **guesses the height** (up/mid/down).  | Beat him on height — go high if he sits low. |

The goalkeeper is real PNG art: standing → diving, **flipped** for a left-hand
dive, **rotated up/down** for the top/bottom corners, and a straight-up **jump**
for a high ball down the middle. Every dive is clamped to the goal mouth so the
keeper never dives past the posts.

## Project structure

```
src/
├─ lib/
│  ├─ config.ts                 ← campaign data (teams, colourways, bags, coupons)
│  ├─ stores.ts                 ← in-memory game state (Svelte stores)
│  ├─ components/
│  │  ├─ ui/                     ← MODERN brand UI
│  │  │  ├─ ScreenHero.svelte    ← "Pick Your Bag" selector
│  │  │  ├─ ScreenIntro.svelte   ← ball + level ladder
│  │  │  ├─ ScreenResults.svelte
│  │  │  └─ Ball.svelte          ← recolourable vector football (UI)
│  │  └─ game/
│  │     └─ GameCanvas.svelte    ← POV scene host + HUD, power slider, banners
│  └─ game/
│     ├─ PenaltyGame.ts          ← POV scene, 2D physics + 3-level keeper AI
│     ├─ ball.ts                 ← football SVG generator + colourway gradient
│     └─ audio.ts                ← procedural SFX
└─ routes/
   ├─ +layout.svelte / +layout.ts
   └─ +page.svelte               ← screen orchestrator

public/assets/                   ← pitch.png, keeper-standing/diving.png, bags/
```

## Re-skinning a campaign (no game code changes)

Everything a marketer needs is in [`src/lib/config.ts`](src/lib/config.ts):

- **Teams** — name, tagline, a 3-colour flag `colorway` (which drives the
  football skin + UI gradient), and the paired `bag` (`name`, `image`, `accent`).
  Drop product photos under `public/assets/bags/` and point `bag.image` at them.
- **Rewards** — discount %, coupon code, message and shop URL per score tier
  (0/1/2/3 goals). `DEFAULT_SHOP_URL` is the single place to repoint every CTA.

Change those values and the selector cards, intro, in-game ball and results all
update automatically.

## Reward ladder

| Goals | Discount | Code          | Message                 |
| ----: | -------- | ------------- | ----------------------- |
|     0 | 5%       | `TRYAGAIN5`   | Better luck next match. |
|     1 | 10%      | `STRIKER10`   | Nice finish.            |
|     2 | 15%      | `PLAYMAKER15` | Strong performance.     |
|     3 | 20%      | `HATTRICK20`  | Perfect hat trick.      |

## Accessibility & performance

- 44×44px minimum touch targets, high-contrast UI, portrait-locked 320–430px.
- `prefers-reduced-motion` shortens flashes/shakes and the result hold.
- The scene is a handful of GPU-composited transforms (one pitch image, two
  keeper sprites, one SVG ball) on a capped-DPR layout, so it stays ~60 FPS on
  mid-range phones.
