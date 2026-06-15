<script lang="ts">
  import { onMount } from 'svelte';
  import { coupon, goalsScored, muted, replaySameTeam, resetMatch, selectedTeam, shotHistory } from '$lib/stores';
  import { TOTAL_PENALTIES } from '$lib/config';
  import { Audio } from '$lib/game/audio';
  import { colorwayGradient } from '$lib/game/ball';
  import Ball from './Ball.svelte';

  const team = $derived($selectedTeam);
  const reward = $derived($coupon);

  let copied = $state(false);

  onMount(() => {
    if (!$muted) Audio.sting();
  });

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(reward.code);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = reward.code;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    copied = true;
    setTimeout(() => (copied = false), 1600);
  }

  function shop() {
    window.open(reward.shopUrl, '_blank', 'noopener');
  }
</script>

{#if team}
  <section class="flex min-h-[100dvh] flex-col px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-[max(24px,env(safe-area-inset-top))]">
    <header class="text-center">
      <p class="text-xs font-semibold uppercase tracking-[0.25em] text-gold-soft">Full time</p>
      <div class="mt-2 flex items-center justify-center gap-3">
        {#each Array(TOTAL_PENALTIES) as _, i}
          <span class="text-2xl">{$shotHistory[i] === 'goal' ? '⚽' : '○'}</span>
        {/each}
      </div>
      <h1 class="mt-3 font-display text-[64px] font-black leading-none text-cream">
        {$goalsScored}<span class="text-3xl text-sand/50">/{TOTAL_PENALTIES}</span>
      </h1>
      <p class="mt-1 text-base text-sand/80">{reward.message}</p>
    </header>

    <!-- Reward card -->
    <div class="relative mt-6 overflow-hidden rounded-[var(--radius-card)] border border-gold/30 bg-gradient-to-b from-ink-soft to-[#0c1224] p-5 shadow-[0_18px_40px_-16px_rgba(0,0,0,0.8)]">
      <div class="flex items-center gap-4">
        <div class="shrink-0">
          <img src={team.bag.image} alt={team.bag.name} class="h-24 w-auto object-contain drop-shadow-[0_10px_16px_rgba(0,0,0,0.5)]" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-xs uppercase tracking-wide text-sand/60">{team.name} · Your bag</p>
          <h2 class="truncate font-display text-xl font-bold text-cream">{team.bag.name}</h2>
          <div class="mt-1 flex items-baseline gap-1">
            <span class="font-display text-4xl font-black text-gold">{reward.discount}%</span>
            <span class="text-sm font-semibold text-sand/70">OFF</span>
          </div>
        </div>
        <div class="shrink-0">
          <Ball colorway={team.colorway} size={50} id="result" />
        </div>
      </div>

      <!-- Coupon code -->
      <button
        onclick={copyCode}
        class="mt-5 flex w-full items-center justify-between gap-2 rounded-xl border border-dashed border-gold/50 bg-black/25 px-4 py-3 text-left transition active:scale-[0.99] touch-target"
        aria-label="Copy coupon code"
      >
        <span>
          <span class="block text-[10px] uppercase tracking-widest text-sand/50">Coupon code</span>
          <span class="font-display text-xl font-extrabold tracking-wider text-cream">{reward.code}</span>
        </span>
        <span class="rounded-lg bg-gold px-3 py-1.5 text-xs font-bold text-ink">
          {copied ? 'Copied!' : 'Copy'}
        </span>
      </button>
    </div>

    <div class="mt-auto space-y-3 pt-6">
      <button
        onclick={shop}
        class="w-full rounded-2xl py-4 text-center font-display text-lg font-black uppercase tracking-wide text-white shadow-[0_12px_30px_-8px_rgba(0,0,0,0.6)] transition active:scale-[0.98] touch-target"
        style={`background:${colorwayGradient(team.colorway)};text-shadow:0 1px 3px rgba(0,0,0,0.5)`}
      >
        Shop Now
      </button>
      <div class="flex gap-3">
        <button
          onclick={replaySameTeam}
          class="flex-1 rounded-2xl border border-white/15 bg-white/5 py-3.5 text-center font-semibold text-cream transition active:scale-[0.98] touch-target"
        >
          Play Again
        </button>
        <button
          onclick={resetMatch}
          class="flex-1 rounded-2xl border border-white/15 bg-white/5 py-3.5 text-center font-semibold text-cream transition active:scale-[0.98] touch-target"
        >
          Change Bag
        </button>
      </div>
    </div>
  </section>
{/if}
