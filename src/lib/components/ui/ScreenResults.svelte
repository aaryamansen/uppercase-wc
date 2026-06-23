<script lang="ts">
  import { onMount } from 'svelte';
  import { coupon, goalsScored, muted, replaySameTeam, resetMatch, screen, selectedTeam, shotHistory } from '$lib/stores';
  import { TEAMS, TOTAL_PENALTIES } from '$lib/config';
  import { Audio } from '$lib/game/audio';
  import { track } from '$lib/analytics';
  import { colorwayGradient, colorwayTextStyle } from '$lib/game/ball';
  import { recordGoals, type Tally } from '$lib/tally';
  import Ball from './Ball.svelte';

  const team = $derived($selectedTeam);
  const reward = $derived($coupon);

  let copied = $state(false);
  let shareCopied = $state(false);

  // Cumulative, cross-visitor tally (null while loading).
  let tally = $state<Tally | null>(null);

  // Join the live tally onto bag metadata and rank by goals. Bag names only —
  // the country name is never shown anywhere on the coupon screen.
  const tallyRows = $derived(
    tally
      ? TEAMS.map((t) => ({
          id: t.id,
          name: t.bag.name,
          image: t.bag.image,
          accent: t.bag.accent,
          goals: tally!.goals[t.id] ?? 0
        })).sort((a, b) => b.goals - a.goals)
      : []
  );
  const totalGoals = $derived(tallyRows.reduce((sum, r) => sum + r.goals, 0));
  const maxGoals = $derived(Math.max(1, ...tallyRows.map((r) => r.goals)));

  const shareUrl = $derived(typeof location !== 'undefined' ? location.origin : reward.shopUrl);
  const shareText = $derived(
    `I scored ${$goalsScored}/${TOTAL_PENALTIES} in Penalty Cup and unlocked ${reward.discount}% off the ${team?.bag.name ?? 'Kicks'}! 🎯⚽ Use code ${reward.code}.`
  );

  onMount(async () => {
    if (!$muted) Audio.sting();
    // Record this match's goals against the chosen bag, then show the live board.
    if (team) tally = await recordGoals(team.id, $goalsScored);
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

      <!-- Social sharing — platform icons -->
      <p class="mt-4 text-center text-[11px] font-semibold uppercase tracking-widest text-sand/50">Share your result</p>
      <div class="mt-2 flex items-center justify-center gap-3">
        <button
          onclick={() => shareTo('whatsapp')}
          aria-label="Share on WhatsApp"
          class="grid h-12 w-12 place-items-center rounded-full bg-[#25D366] text-white shadow-[0_6px_14px_-4px_rgba(0,0,0,0.6)] transition active:scale-[0.9] touch-target"
        >
          <svg viewBox="0 0 24 24" class="h-6 w-6" fill="currentColor" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.36.101 11.945c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.652a11.96 11.96 0 005.71 1.448h.005c6.582 0 11.944-5.361 11.945-11.945a11.86 11.86 0 00-3.495-8.404"/>
          </svg>
        </button>
        <button
          onclick={() => shareTo('x')}
          aria-label="Share on X"
          class="grid h-12 w-12 place-items-center rounded-full border border-white/20 bg-black text-white shadow-[0_6px_14px_-4px_rgba(0,0,0,0.6)] transition active:scale-[0.9] touch-target"
        >
          <svg viewBox="0 0 24 24" class="h-5 w-5" fill="currentColor" aria-hidden="true">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
        </button>
        <button
          onclick={() => shareTo('telegram')}
          aria-label="Share on Telegram"
          class="grid h-12 w-12 place-items-center rounded-full bg-[#229ED9] text-white shadow-[0_6px_14px_-4px_rgba(0,0,0,0.6)] transition active:scale-[0.9] touch-target"
        >
          <svg viewBox="0 0 24 24" class="h-6 w-6" fill="currentColor" aria-hidden="true">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212-.07-.062-.174-.041-.249-.024-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
          </svg>
        </button>
        <button
          onclick={copyShare}
          aria-label="Copy share link"
          class="grid h-12 w-12 place-items-center rounded-full border border-white/15 bg-white/10 text-cream shadow-[0_6px_14px_-4px_rgba(0,0,0,0.6)] transition active:scale-[0.9] touch-target"
        >
          {#if shareCopied}
            <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          {:else}
            <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          {/if}
        </button>
      </div>
    </div>

    <!-- Cumulative cross-visitor tally -->
    <div class="mt-6 rounded-[var(--radius-card)] border border-white/10 bg-black/30 p-4 backdrop-blur-sm">
      <div class="flex items-baseline justify-between gap-2">
        <p class="font-display text-sm font-bold text-cream">Goals scored worldwide</p>
        <p class="font-display text-base font-black text-gold tabular-nums">{totalGoals.toLocaleString()}</p>
      </div>
      <p class="mt-0.5 text-[11px] text-sand/50">Every visitor's goals, tallied for each Kick.</p>

      {#if tally === null}
        <p class="py-4 text-center text-xs text-sand/40">Loading tally…</p>
      {:else}
        <ol class="mt-3 space-y-2">
          {#each tallyRows as row, i (row.id)}
            <li
              class="flex items-center gap-3 rounded-2xl border px-3 py-2 {row.id === team.id
                ? 'border-gold/50 bg-gold/10'
                : 'border-white/8 bg-ink-soft/60'}"
            >
              <span class="w-4 shrink-0 text-center font-display text-xs font-black text-sand/60">{i + 1}</span>
              <img src={row.image} alt={row.name} class="h-9 w-9 shrink-0 object-contain" />
              <div class="min-w-0 flex-1">
                <p class="truncate font-display text-sm font-bold text-cream">
                  {row.name}{#if row.id === team.id}<span class="ml-1 text-[10px] font-semibold text-gold-soft">· yours</span>{/if}
                </p>
                <div class="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                  <span class="block h-full rounded-full transition-all" style={`width:${(row.goals / maxGoals) * 100}%;background:${row.accent}`}></span>
                </div>
              </div>
              <span class="shrink-0 font-display text-base font-black tabular-nums text-cream">{row.goals.toLocaleString()}</span>
            </li>
          {/each}
        </ol>
      {/if}
    </div>

    <div class="mt-6 space-y-3">
      <button
        onclick={shop}
        class="w-full rounded-2xl py-4 text-center font-display text-lg font-black uppercase tracking-wide shadow-[0_12px_30px_-8px_rgba(0,0,0,0.6)] transition active:scale-[0.98] touch-target"
        style={`background:${colorwayGradient(team.colorway)};color:${colorwayTextStyle(team.colorway).color};text-shadow:${colorwayTextStyle(team.colorway).shadow}`}
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
