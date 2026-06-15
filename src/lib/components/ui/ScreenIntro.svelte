<script lang="ts">
  import { muted, resetMatch, screen, selectedTeam } from '$lib/stores';
  import { LEVELS } from '$lib/config';
  import { Audio } from '$lib/game/audio';
  import { colorwayGradient } from '$lib/game/ball';
  import Ball from './Ball.svelte';

  const team = $derived($selectedTeam);

  function takeShot() {
    // First user gesture: safe to unmute audio if the user wants sound.
    Audio.setMuted($muted);
    screen.set('game');
  }
</script>

{#if team}
  <section class="relative flex min-h-[100dvh] flex-col px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-[max(20px,env(safe-area-inset-top))]">
    <button
      onclick={resetMatch}
      class="absolute left-4 top-[max(16px,env(safe-area-inset-top))] z-10 grid h-10 w-10 place-items-center rounded-full bg-white/8 text-lg touch-target"
      aria-label="Back to bag selection"
    >
      ←
    </button>

    <div class="mt-10 flex flex-col items-center text-center">
      <p class="text-xs font-semibold uppercase tracking-[0.25em] text-gold-soft">{team.name}</p>
      <div class="relative my-5 grid place-items-center">
        <span class="absolute h-44 w-44 rounded-full opacity-30 blur-3xl" style={`background:${colorwayGradient(team.colorway)}`}></span>
        <div class="ball-float">
          <Ball colorway={team.colorway} size={168} id="intro" />
        </div>
      </div>
      <h2 class="font-display text-3xl font-extrabold text-cream">3 penalties.</h2>
      <p class="mt-1 text-lg text-sand/85">Beat three keepers. How much can you save?</p>
    </div>

    <!-- Level ladder -->
    <div class="mt-7 space-y-2">
      {#each LEVELS as lvl, i}
        <div class="flex items-center gap-3 rounded-2xl border border-white/10 bg-ink-soft/70 px-4 py-2.5">
          <span
            class="grid h-7 w-7 shrink-0 place-items-center rounded-full font-display text-sm font-black text-ink"
            style={`background:${colorwayGradient(team.colorway, 135)}`}>{i + 1}</span>
          <div class="min-w-0">
            <p class="font-display text-sm font-bold text-cream">{lvl.name}</p>
            <p class="truncate text-xs text-sand/65">Keeper {lvl.keeper.toLowerCase()}</p>
          </div>
        </div>
      {/each}
    </div>

    <button
      onclick={takeShot}
      class="mt-auto w-full rounded-2xl py-4 text-center font-display text-lg font-black uppercase tracking-wide text-white shadow-[0_12px_30px_-8px_rgba(0,0,0,0.6)] transition active:scale-[0.98] touch-target"
      style={`background:${colorwayGradient(team.colorway)};text-shadow:0 1px 3px rgba(0,0,0,0.5)`}
    >
      Take the Shot
    </button>
  </section>
{/if}

<style>
  .ball-float {
    animation: float 3s ease-in-out infinite;
  }
  @keyframes float {
    0%, 100% {
      transform: translateY(0) rotate(-4deg);
    }
    50% {
      transform: translateY(-10px) rotate(4deg);
    }
  }
</style>
