/**
 * PenaltyGame — first-person (POV) penalty mini-game.
 * ----------------------------------------------------------------------------
 * • Photographic pitch background; you see only the ball at the spot.
 * • Tap/drag the goal to aim (you can aim wide → miss), a power slider sets pace.
 * • Light 2D physics: the ball curves and dips on its way to the goal plane.
 * • Real PNG goalkeeper sprites — standing → diving, flipped/rotated per dive.
 * • Three keepers, one per kick (see `keeperDecision`):
 *     L1 commits to a pre-chosen dive with a readable lean (a "tell").
 *     L2 roves left↔right and can only dive the way he is already moving.
 *     L3 always reads your side (L/M/R) but guesses the height.
 *
 * The class owns the pixel-free scene (DOM + transforms); the surrounding Svelte
 * layer owns the HUD, the colourway power slider and the result banners and
 * talks to the engine through callbacks + `shoot(power)`.
 *
 * All scene geometry is expressed as fractions of the pitch image (measured from
 * public/assets/pitch.png) so the keeper, ball and goal stay locked to the art
 * at any screen size. See the constants block below.
 */
import { Audio } from './audio';
import { footballSvg, type Colorway } from './ball';

export type ShotResult = 'goal' | 'saved' | 'missed';
type Side = 'left' | 'center' | 'right';
type Height = 'top' | 'mid' | 'bottom';

export interface PenaltyGameOptions {
  totalPenalties: number;
  colorway: Colorway;
  reducedMotion?: boolean;
  debug?: boolean;
  onTurnReady?: (info: { index: number; level: number }) => void;
  onAimStart?: () => void;
  onShotStart?: () => void;
  onShotResolved?: (result: ShotResult, info: { index: number; goals: number; level: number }) => void;
  onMatchComplete?: (goals: number) => void;
}

// ── Asset URLs (served from /public) ────────────────────────────────────────
const PITCH = '/assets/pitch.png';
const KEEPER_STAND = '/assets/keeper-standing.png';
const KEEPER_DIVE = '/assets/keeper-diving.png';
const PITCH_ASPECT = 941 / 1672; // w / h — keeps the pitch box locked to the art

// ── Pitch geometry, as fractions of the pitch image ─────────────────────────
// (goal posts, crossbar, goal line and penalty spot, measured from the photo)
const POSTS = { left: 0.133, right: 0.878, top: 0.175, line: 0.329 };
const MOUTH_W = POSTS.right - POSTS.left;
const MOUTH_H = POSTS.line - POSTS.top;
const COL_W = MOUTH_W / 3;
const ROW_H = MOUTH_H / 3;
const SPOT = { x: 0.498, y: 0.566 };

const colCenter = (c: number) => POSTS.left + (c + 0.5) * COL_W;
const rowCenter = (r: number) => POSTS.top + (r + 0.5) * ROW_H;

// ── Keeper sprite metrics (content boxes measured from the PNGs) ─────────────
const STAND = { h: 0.235, cyFromCenter: 0.444 }; // img side as frac of pitch H
const DIVE = { h: 0.30 };
const KEEPER_HOME = { x: 0.505, cy: 0.247 };
// The goal mouth is the constraint: the keeper's body centre never dives past it.
const DIVE_CLAMP_X: [number, number] = [POSTS.left + 0.05, POSTS.right - 0.05];
const DIVE_CY: Record<Height, number> = { top: 0.206, mid: 0.247, bottom: 0.286 };
const DIVE_X: Record<Side, number> = { left: colCenter(0), center: colCenter(1), right: colCenter(2) };
const DIVE_ROT: Record<Height, number> = { top: -14, mid: 5, bottom: 21 }; // deg, right-hand dive
const JUMP_DY = -0.065; // centre + high → keeper springs straight up

// ── Ball flight ─────────────────────────────────────────────────────────────
const BALL_START = { x: SPOT.x, y: 0.55 };
const BALL_DIAM_NEAR = 0.165; // frac of pitch width at the spot
const BALL_DIAM_FAR = 0.05; // frac of pitch width at the goal plane

// ── Aim reticle travel (lets the player aim outside the posts → a miss) ──────
const AIM = { xmin: 0.06, xmax: 0.94, ymin: 0.1, ymax: 0.345 };

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const pick = <T>(a: T[]) => a[(Math.random() * a.length) | 0];

interface Tween {
  apply: (v: number) => void;
  from: number;
  to: number;
  dur: number;
  t: number;
  ease: (t: number) => number;
  delay: number;
  onDone?: () => void;
}

interface KeeperPose {
  sprite: 'stand' | 'dive';
  flip: boolean;
  x: number;
  y: number;
  rot: number; // degrees
  scale: number;
}

interface Flight {
  t: number;
  dur: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  curl: number;
  hump: number;
  onDone: () => void;
}

export class PenaltyGame {
  private host!: HTMLElement;
  private box!: HTMLDivElement; // the pitch box (children positioned in %)
  private standImg!: HTMLImageElement;
  private diveImg!: HTMLImageElement;
  private ballEl!: HTMLDivElement;
  private reticle!: HTMLDivElement;
  private flashEl!: HTMLDivElement;
  private debugEl?: HTMLDivElement;

  private opts!: PenaltyGameOptions;
  private raf = 0;
  private last = 0;
  private tweens: Tween[] = [];
  private flight: Flight | null = null;

  private phase: 'aiming' | 'flying' | 'result' | 'idle' | 'done' = 'idle';
  private index = 0;
  private goals = 0;

  // logical scene state (fractions of the pitch box)
  private ball = { x: BALL_START.x, y: BALL_START.y, diam: BALL_DIAM_NEAR, rot: 0 };
  private keeper: KeeperPose = { sprite: 'stand', flip: false, x: KEEPER_HOME.x, y: KEEPER_HOME.cy, rot: 0, scale: 1 };
  private aim = { x: 0.505, y: 0.24 };
  private clock = 0;

  // L1 pre-chosen plan + tell, L2 roving direction
  private plan: { side: Side; height: Height; lean: number } | null = null;
  private roveDir = 1;

  // ── lifecycle ─────────────────────────────────────────────────────────────
  init(host: HTMLElement) {
    this.host = host;
    this.box = document.createElement('div');
    this.box.className = 'pg-box';

    const pitch = document.createElement('img');
    pitch.src = PITCH;
    pitch.className = 'pg-pitch';
    pitch.draggable = false;
    this.box.appendChild(pitch);

    this.standImg = this.sprite(KEEPER_STAND);
    this.diveImg = this.sprite(KEEPER_DIVE);
    this.diveImg.style.display = 'none';

    this.ballEl = document.createElement('div');
    this.ballEl.className = 'pg-ball';

    this.reticle = document.createElement('div');
    this.reticle.className = 'pg-reticle';
    this.reticle.innerHTML =
      '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="15" fill="none" stroke-width="3"/>' +
      '<line x1="20" y1="2" x2="20" y2="12"/><line x1="20" y1="28" x2="20" y2="38"/>' +
      '<line x1="2" y1="20" x2="12" y2="20"/><line x1="28" y1="20" x2="38" y2="20"/></svg>';

    this.flashEl = document.createElement('div');
    this.flashEl.className = 'pg-flash';

    this.box.append(this.standImg, this.diveImg, this.ballEl, this.reticle, this.flashEl);
    this.host.appendChild(this.box);

    this.bindAim();
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.update);
    return this;
  }

  private sprite(src: string) {
    const img = document.createElement('img');
    img.src = src;
    img.className = 'pg-keeper';
    img.draggable = false;
    return img;
  }

  start(opts: PenaltyGameOptions) {
    this.opts = opts;
    this.index = 0;
    this.goals = 0;
    this.ballEl.innerHTML = footballSvg(opts.colorway, 'game');
    if (opts.debug) this.buildDebug();
    Audio.startCrowd();
    Audio.whistle();
    this.nextKick();
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    Audio.stopCrowd();
    this.box?.remove();
  }

  get level() {
    return this.index + 1;
  }

  // ── input: aim by tapping / dragging the goal ───────────────────────────────
  private bindAim() {
    let dragging = false;
    const toFrac = (e: PointerEvent) => {
      const r = this.box.getBoundingClientRect();
      return {
        x: clamp((e.clientX - r.left) / r.width, AIM.xmin, AIM.xmax),
        y: clamp((e.clientY - r.top) / r.height, AIM.ymin, AIM.ymax)
      };
    };
    this.box.addEventListener('pointerdown', (e) => {
      if (this.phase !== 'aiming') return;
      dragging = true;
      this.aim = toFrac(e);
      try {
        this.box.setPointerCapture(e.pointerId);
      } catch {
        /* synthetic / already-released pointer — aim still works */
      }
      this.opts?.onAimStart?.();
    });
    this.box.addEventListener('pointermove', (e) => {
      if (!dragging || this.phase !== 'aiming') return;
      this.aim = toFrac(e);
    });
    const up = () => (dragging = false);
    this.box.addEventListener('pointerup', up);
    this.box.addEventListener('pointercancel', up);
  }

  // ── match flow ──────────────────────────────────────────────────────────────
  private nextKick() {
    if (this.index >= this.opts.totalPenalties) {
      this.phase = 'done';
      Audio.whistle();
      this.opts.onMatchComplete?.(this.goals);
      return;
    }
    // reset scene
    this.ball = { x: BALL_START.x, y: BALL_START.y, diam: BALL_DIAM_NEAR, rot: 0 };
    this.keeper = { sprite: 'stand', flip: false, x: KEEPER_HOME.x, y: KEEPER_HOME.cy, rot: 0, scale: 1 };
    this.aim = { x: 0.505, y: 0.24 };
    this.flight = null;
    this.tweens = [];

    // level-specific keeper prep
    if (this.level === 1) {
      const side = pick<Side>(['left', 'center', 'right']);
      const height = pick<Height>(['top', 'mid', 'bottom']);
      this.plan = { side, height, lean: side === 'left' ? -1 : side === 'right' ? 1 : 0 };
    } else {
      this.plan = null;
    }
    this.roveDir = Math.random() < 0.5 ? -1 : 1;

    this.phase = 'aiming';
    this.opts.onTurnReady?.({ index: this.index, level: this.level });
  }

  /** Fire the shot using the current aim + the supplied power (0–1). */
  shoot(power: number) {
    if (this.phase !== 'aiming') return;
    this.phase = 'flying';
    this.reticle.style.opacity = '0';
    this.opts.onShotStart?.();
    Audio.kick();

    const p = clamp(power, 0.12, 1);
    // ---- physics endpoint: a slight dip (worse at low power), tiny scatter ----
    const dip = (1 - p) * 0.05;
    const finalX = clamp(this.aim.x + (Math.random() - 0.5) * 0.012, 0, 1);
    const finalY = this.aim.y + dip - (p - 0.5) * 0.02;

    // ---- on/off target ----
    const wide = finalX < POSTS.left + 0.004 || finalX > POSTS.right - 0.004;
    const over = finalY < POSTS.top + 0.004;
    const col = clamp(Math.floor((finalX - POSTS.left) / COL_W), 0, 2);
    const row = clamp(Math.floor((finalY - POSTS.top) / ROW_H), 0, 2);
    const shotSide: Side = (['left', 'center', 'right'] as Side[])[col];
    const shotHeight: Height = (['top', 'mid', 'bottom'] as Height[])[row];

    // ---- keeper commits ----
    const { pose, saved } = this.keeperDecision(shotSide, shotHeight);
    let result: ShotResult = wide || over ? 'missed' : saved ? 'saved' : 'goal';

    // ---- launch ball ----
    const curl = clamp((finalX - 0.505) * 0.45 + (Math.random() - 0.5) * 0.05, -0.075, 0.075);
    this.flight = {
      t: 0,
      dur: lerp(0.92, 0.52, p),
      fromX: this.ball.x,
      fromY: this.ball.y,
      toX: finalX,
      toY: finalY,
      curl,
      hump: 0.05 + 0.05 * p,
      onDone: () => this.resolve(result, finalX, finalY, shotSide)
    };

    // ---- keeper dive (reacts shortly after launch) ----
    const react =
      this.level === 1 ? 0.13 + Math.random() * 0.09 : this.level === 2 ? 0.04 : 0.08;
    this.diveTo(pose, this.flight.dur, react);
  }

  /** Per-level goalkeeper AI → the dive pose + whether it stops the shot. */
  private keeperDecision(shotSide: Side, shotHeight: Height): { pose: KeeperPose; saved: boolean } {
    if (this.level === 1) {
      // Commits to its pre-chosen dive (telegraphed by the idle lean).
      const plan = this.plan!;
      let saved = false;
      if (plan.side === shotSide) {
        const dr = Math.abs(['top', 'mid', 'bottom'].indexOf(plan.height) - ['top', 'mid', 'bottom'].indexOf(shotHeight));
        saved = Math.random() < (dr === 0 ? 0.9 : dr === 1 ? 0.6 : 0.35);
      } else {
        saved = Math.random() < 0.05; // rare reflex stop
      }
      return { pose: this.poseFor(plan.side, plan.height), saved };
    }

    if (this.level === 2) {
      // Roves; may only dive in the direction he is already moving.
      const committed: Side = this.roveDir < 0 ? 'left' : 'right';
      const nearCenter = Math.abs(this.keeper.x - KEEPER_HOME.x) < 0.11;
      if (shotSide === 'center') {
        return { pose: this.poseFor('center', shotHeight), saved: nearCenter };
      }
      if (shotSide === committed) {
        return { pose: this.poseFor(shotSide, shotHeight), saved: true };
      }
      // wrong-footed: he lunges the way he was going and misses
      return { pose: this.poseFor(committed, pick<Height>(['top', 'mid', 'bottom'])), saved: false };
    }

    // Level 3 — always the right side, but the height is a guess.
    const guess = pick<Height>(['top', 'mid', 'bottom']);
    return { pose: this.poseFor(shotSide, guess), saved: guess === shotHeight };
  }

  /** Map a (side, height) dive to a concrete sprite pose (the asset choreography). */
  private poseFor(side: Side, height: Height): KeeperPose {
    if (side === 'center') {
      // Down the middle: stay tall; spring straight up for a high ball.
      return {
        sprite: 'stand',
        flip: false,
        x: KEEPER_HOME.x,
        y: KEEPER_HOME.cy + (height === 'top' ? JUMP_DY : height === 'bottom' ? 0.012 : 0),
        rot: 0,
        scale: height === 'top' ? 1.05 : 1
      };
    }
    // Left / right: diving sprite, flipped for the left, rotated for height.
    const dir = side === 'right' ? 1 : -1;
    return {
      sprite: 'dive',
      flip: side === 'left',
      x: clamp(DIVE_X[side], DIVE_CLAMP_X[0], DIVE_CLAMP_X[1]),
      y: DIVE_CY[height],
      rot: dir * DIVE_ROT[height],
      scale: 1
    };
  }

  private diveTo(pose: KeeperPose, dur: number, delay: number) {
    const setSprite = () => {
      this.keeper.sprite = pose.sprite;
      this.keeper.flip = pose.flip;
      this.keeper.scale = pose.scale;
    };
    const d = dur * 0.72;
    this.tween((v) => (this.keeper.x = v), this.keeper.x, pose.x, d, easeOut, delay);
    this.tween((v) => (this.keeper.y = v), this.keeper.y, pose.y, d, easeOut, delay);
    this.tween(
      (v) => (this.keeper.rot = v),
      this.keeper.rot,
      pose.rot,
      d,
      easeOut,
      delay,
      undefined
    );
    // swap to the diving sprite exactly when the dive begins
    this.tween(() => {}, 0, 1, 0.001, (t) => t, delay, setSprite);
  }

  private resolve(result: ShotResult, fx: number, fy: number, side: Side) {
    this.phase = 'result';
    this.index += 1;
    if (result === 'goal') {
      this.goals += 1;
      Audio.goal();
      this.flash();
    } else if (result === 'saved') {
      Audio.save();
      this.shake();
      // ball rebounds off the keeper
      const dir = side === 'left' ? 1 : side === 'right' ? -1 : Math.random() < 0.5 ? -1 : 1;
      this.tween((v) => (this.ball.x = v), fx, clamp(fx + dir * 0.18, 0.05, 0.95), 0.4, easeOut);
      this.tween((v) => (this.ball.y = v), fy, fy + 0.12, 0.4, easeOut);
      this.tween((v) => (this.ball.diam = v), this.ball.diam, this.ball.diam * 1.5, 0.4, easeOut);
    } else {
      Audio.miss();
    }

    this.opts.onShotResolved?.(result, { index: this.index, goals: this.goals, level: this.level });
    const wait = this.opts.reducedMotion ? 700 : 1250;
    window.setTimeout(() => this.nextKick(), wait);
  }

  // ── effects ──────────────────────────────────────────────────────────────
  private flash() {
    if (this.opts.reducedMotion) return;
    this.flashEl.style.transition = 'none';
    this.flashEl.style.opacity = '0.65';
    requestAnimationFrame(() => {
      this.flashEl.style.transition = 'opacity 0.5s ease-out';
      this.flashEl.style.opacity = '0';
    });
  }

  private shake() {
    if (this.opts.reducedMotion) return;
    let n = 9;
    const tick = () => {
      this.box.style.transform = `translateX(-50%) translate(${(Math.random() - 0.5) * 8}px, ${(Math.random() - 0.5) * 5}px)`;
      if (--n > 0) requestAnimationFrame(tick);
      else this.box.style.transform = 'translateX(-50%)';
    };
    tick();
  }

  // ── main loop ──────────────────────────────────────────────────────────────
  private update = (now: number) => {
    const dt = Math.min((now - this.last) / 1000, 0.05);
    this.last = now;
    this.clock += dt;
    this.raf = requestAnimationFrame(this.update);

    // tweens
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      const tw = this.tweens[i];
      if (tw.delay > 0) {
        tw.delay -= dt;
        continue;
      }
      tw.t += dt;
      const p = clamp(tw.t / tw.dur, 0, 1);
      tw.apply(lerp(tw.from, tw.to, tw.ease(p)));
      if (p >= 1) {
        this.tweens.splice(i, 1);
        tw.onDone?.();
      }
    }

    // ball flight
    if (this.flight) {
      const f = this.flight;
      f.t += dt;
      const p = clamp(f.t / f.dur, 0, 1);
      this.ball.x = lerp(f.fromX, f.toX, easeOut(p)) + f.curl * Math.sin(Math.PI * p);
      this.ball.y = lerp(f.fromY, f.toY, easeInOut(p)) - f.hump * Math.sin(Math.PI * p);
      this.ball.diam = lerp(BALL_DIAM_NEAR, BALL_DIAM_FAR, easeOut(p));
      this.ball.rot += dt * 540 * (0.6 + p);
      if (p >= 1) {
        this.flight = null;
        f.onDone();
      }
    }

    // keeper idle behaviour while the player aims
    if (this.phase === 'aiming') {
      if (this.level === 1 && this.plan) {
        const lean = this.plan.lean;
        this.keeper.x = KEEPER_HOME.x + lean * 0.03 + Math.sin(this.clock * 3) * 0.006;
        this.keeper.rot = lean * 3 + Math.sin(this.clock * 2) * 1.5;
      } else if (this.level === 2) {
        const span = 0.205;
        const v = Math.cos(this.clock * 1.7);
        this.roveDir = v >= 0 ? 1 : -1;
        this.keeper.x = KEEPER_HOME.x + Math.sin(this.clock * 1.7) * span;
        this.keeper.rot = this.roveDir * 4;
      } else {
        this.keeper.x = KEEPER_HOME.x;
        this.keeper.rot = Math.sin(this.clock * 2) * 1.2;
      }
      this.reticle.style.opacity = '0.92';
    }

    this.render();
  };

  // ── render: write logical state to DOM transforms ───────────────────────────
  private render() {
    const r = this.box.getBoundingClientRect();
    const W = r.width;
    const H = r.height;
    if (!W || !H) return;

    // keeper
    const active = this.keeper.sprite === 'dive' ? this.diveImg : this.standImg;
    const idle = this.keeper.sprite === 'dive' ? this.standImg : this.diveImg;
    idle.style.display = 'none';
    active.style.display = 'block';
    const side = (this.keeper.sprite === 'dive' ? DIVE.h : STAND.h) * H;
    active.style.width = `${side}px`;
    active.style.height = `${side}px`;
    const kx = this.keeper.x * W - side / 2;
    const ky = this.keeper.y * H - side / 2;
    active.style.transform = `translate(${kx}px, ${ky}px) rotate(${this.keeper.rot}deg) scale(${(this.keeper.flip ? -1 : 1) * this.keeper.scale}, ${this.keeper.scale})`;

    // ball
    const d = this.ball.diam * W;
    this.ballEl.style.width = `${d}px`;
    this.ballEl.style.height = `${d}px`;
    this.ballEl.style.transform = `translate(${this.ball.x * W - d / 2}px, ${this.ball.y * H - d / 2}px) rotate(${this.ball.rot}deg)`;

    // reticle
    const rs = Math.max(26, W * 0.085);
    this.reticle.style.width = `${rs}px`;
    this.reticle.style.height = `${rs}px`;
    this.reticle.style.transform = `translate(${this.aim.x * W - rs / 2}px, ${this.aim.y * H - rs / 2}px)`;

    if (this.debugEl) this.debugEl.style.width = `${W}px`;
  }

  // ── debug overlay (geometry check during tuning) ────────────────────────────
  private buildDebug() {
    const d = document.createElement('div');
    d.className = 'pg-debug';
    const box = (x: number, y: number, w: number, h: number, c: string) =>
      `<div style="position:absolute;left:${x * 100}%;top:${y * 100}%;width:${w * 100}%;height:${h * 100}%;border:1px solid ${c}"></div>`;
    const dot = (x: number, y: number, c: string) =>
      `<div style="position:absolute;left:${x * 100}%;top:${y * 100}%;width:6px;height:6px;margin:-3px;border-radius:50%;background:${c}"></div>`;
    let html = box(POSTS.left, POSTS.top, MOUTH_W, MOUTH_H, '#0ff');
    for (let c = 1; c < 3; c++) html += box(POSTS.left + c * COL_W, POSTS.top, 0, MOUTH_H, '#0ff8');
    for (let rr = 1; rr < 3; rr++) html += box(POSTS.left, POSTS.top + rr * ROW_H, MOUTH_W, 0, '#0ff8');
    html += dot(SPOT.x, SPOT.y, '#f0f') + dot(KEEPER_HOME.x, KEEPER_HOME.cy, '#ff0');
    d.innerHTML = html;
    this.debugEl = d;
    this.box.appendChild(d);
  }

  private tween(
    apply: (v: number) => void,
    from: number,
    to: number,
    dur: number,
    ease: (t: number) => number,
    delay = 0,
    onDone?: () => void
  ) {
    this.tweens.push({ apply, from, to, dur, t: 0, ease, delay, onDone });
  }
}
