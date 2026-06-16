<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { PenaltyGame, type ShotResult } from '$lib/game/PenaltyGame';
  import { colorwayGradient } from '$lib/game/ball';
  import { Audio } from '$lib/game/audio';
  import { currentPenalty, muted, recordShot, screen, shotHistory, TOTAL_PENALTIES } from '$lib/stores';
  import { LEVELS, type Team } from '$lib/config';

  let { team }: { team: Team } = $props();

  let host: HTMLDivElement;
  let game: PenaltyGame | null = null;

  let armed = $state(false);
  let power = $state(0.62);
  let level = $state(1);
  let banner = $state<{ result: ShotResult } | null>(null);
  let hint = $state(true);

  const grad = $derived(colorwayGradient(team.colorway));
  // Shoot button is teal blue regardless of the chosen bag.
  const SHOOT_BG = 'linear-gradient(135deg, #2dd4bf 0%, #14b8a6 45%, #0e7490 100%)';
  const reducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const labels: Record<ShotResult, string> = { goal: 'GOAL!', saved: 'SAVED', missed: 'MISS' };
  const bannerColor: Record<ShotResult, string> = {
    goal: 'text-grass',
    saved: 'text-[#ff7a7a]',
    missed: 'text-sand'
  };

  onMount(async () => {
    Audio.setMuted($muted);
    const debug = typeof location !== 'undefined' && location.search.includes('debug');
    game = new PenaltyGame().init(host);
    game.start({
      totalPenalties: TOTAL_PENALTIES,
      colorway: team.colorway,
      reducedMotion,
      debug,
      onTurnReady: ({ level: lv }) => {
        level = lv;
        armed = true;
      },
      onAimStart: () => (hint = false),
      onShotResolved: (result) => {
        recordShot(result);
        banner = { result };
        setTimeout(() => (banner = null), reducedMotion ? 650 : 1050);
      },
      onMatchComplete: () => setTimeout(() => screen.set('results'), 450)
    });
  });

  onDestroy(() => game?.destroy());

  function fire() {
    if (!armed) return;
    armed = false;
    hint = false;
    game?.shoot(power);
  }

  // ---- colourway power slider (drag to preview, then SHOOT) ----
  let track: HTMLDivElement;
  function setFromEvent(clientX: number) {
    const r = track.getBoundingClientRect();
    power = Math.max(0.05, Math.min(1, (clientX - r.left) / r.width));
  }
  function startDrag(e: PointerEvent) {
    if (!armed) return;
    setFromEvent(e.clientX);
    const move = (ev: PointerEvent) => setFromEvent(ev.clientX);
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  function toggleMute() {
    muted.update((m) => !m);
    Audio.setMuted($muted);
  }

  const pips = $derived(
    Array.from({ length: TOTAL_PENALTIES }, (_, i) => {
      const h = $shotHistory[i];
      if (h === 'goal') return 'goal';
      if (h) return 'miss';
      return i === $currentPenalty ? 'active' : 'pending';
    })
  );
</script>

<div class="relative h-[100dvh] w-full overflow-hidden">
  <!-- Blurred pitch fill — covers the gaps above/below/beside the main scene box -->
  <img src="/assets/pitch.png" alt="" aria-hidden="true" class="pointer-events-none absolute inset-0 h-full w-full scale-125 select-none object-cover" style="filter: blur(80px);" />
  <!-- POV scene mounts here -->
  <div bind:this={host} class="absolute inset-0"></div>

  <!-- Top HUD -->
  <div class="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between px-4 pt-[max(12px,env(safe-area-inset-top))]">
    <div class="flex flex-col gap-1.5">
      <div class="flex items-center gap-2 rounded-full bg-black/40 px-3 py-1.5 backdrop-blur-sm">
        {#each pips as p}
          {#if p === 'goal'}
            <span class="grid h-5 w-5 place-items-center rounded-full bg-grass text-[10px]">⚽</span>
          {:else if p === 'miss'}
            <span class="h-5 w-5 rounded-full border-2 border-[#ff7a7a]/70"></span>
          {:else if p === 'active'}
            <span class="h-5 w-5 animate-pulse rounded-full border-2 border-gold"></span>
          {:else}
            <span class="h-5 w-5 rounded-full border-2 border-white/30"></span>
          {/if}
        {/each}
      </div>
      <span class="self-start rounded-full bg-black/40 px-3 py-1 text-[11px] font-semibold backdrop-blur-sm">
        <span class="font-display font-extrabold tracking-wide">LVL {level}</span>
        <span class="text-sand/70">· {LEVELS[level - 1].keeper}</span>
      </span>
    </div>

    <button
      onclick={toggleMute}
      class="pointer-events-auto grid h-9 w-9 place-items-center rounded-full bg-black/40 text-base backdrop-blur-sm touch-target"
      aria-label={$muted ? 'Unmute sound' : 'Mute sound'}
    >
      {$muted ? '🔇' : '🔊'}
    </button>
  </div>

  <!-- Aim hint -->
  {#if hint}
    <div class="pointer-events-none absolute inset-x-0 top-[30%] z-10 flex flex-col items-center gap-1 text-center">
      <span class="rounded-full bg-black/45 px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
        Tap the goal to aim 🎯
      </span>
    </div>
  {/if}

  <!-- Result banner -->
  {#if banner}
    <div class="pointer-events-none absolute inset-0 z-20 grid place-items-center">
      <span class="result-pop font-display text-6xl font-black tracking-tight drop-shadow-[0_4px_0_rgba(0,0,0,0.4)] {bannerColor[banner.result]}">
        {labels[banner.result]}
      </span>
    </div>
  {/if}

  <!-- Bottom control panel -->
  <div class="absolute inset-x-0 bottom-0 z-10 px-5 pb-[max(18px,env(safe-area-inset-bottom))]">
    <div class="rounded-[var(--radius-card)] border border-white/10 bg-black/45 p-3.5 backdrop-blur-md">
      <div class="mb-2 flex items-center justify-between">
        <span class="text-[11px] font-bold uppercase tracking-[0.2em] text-sand/80">Power</span>
        <span class="font-display text-sm font-extrabold tabular-nums text-cream">{Math.round(power * 100)}%</span>
      </div>
      <div
        bind:this={track}
        onpointerdown={startDrag}
        role="slider"
        tabindex="0"
        aria-label="Shot power"
        aria-valuenow={Math.round(power * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        class="power-track relative h-7 w-full cursor-pointer touch-none rounded-full bg-white/12"
        class:opacity-50={!armed}
      >
        <div class="pointer-events-none absolute inset-y-0 left-0 rounded-full" style={`width:${power * 100}%;background:${grad}`}></div>
        <div class="pointer-events-none absolute top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-white/20 shadow-[0_2px_8px_rgba(0,0,0,0.5)]" style={`left:${power * 100}%`}></div>
      </div>
      <button
        onclick={fire}
        disabled={!armed}
        class="mt-3 w-full rounded-2xl py-3.5 text-center font-display text-lg font-black uppercase tracking-[0.15em] text-white shadow-[0_10px_26px_-10px_rgba(0,0,0,0.8)] transition active:scale-[0.98] disabled:opacity-45 touch-target"
        style={`background:${SHOOT_BG};text-shadow:0 1px 3px rgba(0,0,0,0.55)`}
      >
        {armed ? 'Shoot' : '…'}
      </button>
    </div>
  </div>
</div>

<style>
  .result-pop {
    animation: pop 0.35s cubic-bezier(0.22, 1.4, 0.4, 1) both;
  }
  @keyframes pop {
    0% {
      transform: scale(0.4);
      opacity: 0;
    }
    60% {
      transform: scale(1.12);
      opacity: 1;
    }
    100% {
      transform: scale(1);
      opacity: 1;
    }
  }
</style>
