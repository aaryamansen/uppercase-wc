<script lang="ts">
  import { onMount } from 'svelte';
  import { coupon, goalsScored, muted, replaySameTeam, resetMatch, screen, selectedTeam, shotHistory } from '$lib/stores';
  import { TOTAL_PENALTIES } from '$lib/config';
  import { Audio } from '$lib/game/audio';
  import { track } from '$lib/analytics';
  import { colorwayGradient, colorwayTextStyle } from '$lib/game/ball';
  import Ball from './Ball.svelte';

  const team = $derived($selectedTeam);
  const reward = $derived($coupon);

  let copied = $state(false);
  let shareCopied = $state(false);
  let showShareMenu = $state(false);

  const shareUrl = $derived(typeof location !== 'undefined' ? location.origin : reward.shopUrl);
  const shareText = $derived(
    `I scored ${$goalsScored}/${TOTAL_PENALTIES} in Penalty Cup and unlocked ${reward.discount}% off the ${team?.bag.name ?? 'Kicks'}! 🎯⚽ Use code ${reward.code}.`
  );

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

  // ---- social sharing ----
  async function share() {
    const data = { title: 'Penalty Cup', text: shareText, url: shareUrl };
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(data);
        track('share', { method: 'native', goals: $goalsScored });
      } catch {
        /* user dismissed the native sheet — nothing to do */
      }
      return;
    }
    // No native share (most desktops) → reveal explicit network options.
    showShareMenu = !showShareMenu;
  }

  function shareTo(network: 'whatsapp' | 'x' | 'telegram') {
    const msg = encodeURIComponent(`${shareText} ${shareUrl}`);
    const links: Record<string, string> = {
      whatsapp: `https://wa.me/?text=${msg}`,
      x: `https://twitter.com/intent/tweet?text=${msg}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`
    };
    window.open(links[network], '_blank', 'noopener');
    track('share', { method: network, goals: $goalsScored });
  }

  async function copyShare() {
    const full = `${shareText} ${shareUrl}`;
    try {
      await navigator.clipboard.writeText(full);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = full;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    shareCopied = true;
    setTimeout(() => (shareCopied = false), 1600);
    track('share', { method: 'copy', goals: $goalsScored });
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
          <p class="text-xs uppercase tracking-wide text-sand/60">Your bag</p>
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

      <!-- Social sharing -->
      <button
        onclick={share}
        class="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 font-semibold text-cream transition active:scale-[0.99] touch-target"
        aria-label="Share your result"
      >
        <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
          <line x1="8.6" y1="13.5" x2="15.4" y2="17.5" /><line x1="15.4" y1="6.5" x2="8.6" y2="10.5" />
        </svg>
        Share my result
      </button>

      {#if showShareMenu}
        <div class="mt-2 grid grid-cols-3 gap-2">
          <button
            onclick={() => shareTo('whatsapp')}
            class="rounded-xl border border-white/12 bg-black/25 py-2.5 text-sm font-semibold text-cream transition active:scale-[0.97] touch-target"
          >
            WhatsApp
          </button>
          <button
            onclick={() => shareTo('x')}
            class="rounded-xl border border-white/12 bg-black/25 py-2.5 text-sm font-semibold text-cream transition active:scale-[0.97] touch-target"
          >
            X
          </button>
          <button
            onclick={copyShare}
            class="rounded-xl border border-white/12 bg-black/25 py-2.5 text-sm font-semibold text-cream transition active:scale-[0.97] touch-target"
          >
            {shareCopied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      {/if}
    </div>

    <div class="mt-auto space-y-3 pt-6">
      <button
        onclick={shop}
        class="w-full rounded-2xl py-4 text-center font-display text-lg font-black uppercase tracking-wide shadow-[0_12px_30px_-8px_rgba(0,0,0,0.6)] transition active:scale-[0.98] touch-target"
        style={`background:${colorwayGradient(team.colorway)};color:${colorwayTextStyle(team.colorway).color};text-shadow:${colorwayTextStyle(team.colorway).shadow}`}
      >
        Shop Now
      </button>
      <button
        onclick={() => screen.set('leaderboard')}
        class="flex w-full items-center justify-center gap-2 rounded-2xl border border-gold/40 bg-gold/10 py-3.5 text-center font-display font-bold text-gold-soft transition active:scale-[0.98] touch-target"
      >
        🏆 Leaderboard
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
