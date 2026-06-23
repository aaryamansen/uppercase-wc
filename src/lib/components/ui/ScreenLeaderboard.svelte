<script lang="ts">
  import {
    goalsScored,
    leaderboard,
    replaySameTeam,
    resetMatch,
    saveScore,
    screen,
    selectedTeam
  } from '$lib/stores';
  import { TOTAL_PENALTIES } from '$lib/config';
  import { track } from '$lib/analytics';

  const team = $derived($selectedTeam);

  let name = $state('');
  let savedId = $state<string | null>(null);

  const top = $derived($leaderboard.slice(0, 10));
  const myRank = $derived(
    savedId ? $leaderboard.findIndex((e) => e.id === savedId) + 1 : 0
  );

  function save() {
    if (savedId || !name.trim()) return;
    const entry = saveScore(name, $goalsScored, TOTAL_PENALTIES, team?.name ?? '');
    savedId = entry.id;
    track('leaderboard_save', { name: entry.name, goals: entry.goals, team: entry.team });
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Enter') save();
  }

  const medals = ['🥇', '🥈', '🥉'];
</script>

<section class="flex min-h-[100dvh] flex-col px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-[max(20px,env(safe-area-inset-top))]">
  <button
    onclick={() => screen.set('results')}
    class="absolute left-4 top-[max(16px,env(safe-area-inset-top))] z-10 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-lg backdrop-blur-sm touch-target"
    aria-label="Back to results"
  >
    ←
  </button>

  <header class="mt-1 text-center">
    <p class="text-xs font-semibold uppercase tracking-[0.25em] text-gold-soft">Hall of fame</p>
    <h1 class="mt-1 font-display text-3xl font-extrabold text-cream">Leaderboard</h1>
  </header>

  <!-- Save your score -->
  {#if savedId}
    <div class="mt-5 rounded-[var(--radius-card)] border border-gold/40 bg-black/35 p-4 text-center backdrop-blur-sm">
      <p class="text-sm text-sand/80">
        Saved! You're <span class="font-display font-black text-gold">#{myRank}</span>
        with <span class="font-display font-black text-cream">{$goalsScored}/{TOTAL_PENALTIES}</span>.
      </p>
    </div>
  {:else}
    <div class="mt-5 rounded-[var(--radius-card)] border border-white/12 bg-black/35 p-4 backdrop-blur-sm">
      <p class="mb-2 text-center text-sm text-sand/80">
        You scored <span class="font-display font-black text-gold">{$goalsScored}/{TOTAL_PENALTIES}</span> — claim your spot.
      </p>
      <div class="flex gap-2">
        <input
          bind:value={name}
          onkeydown={onKey}
          maxlength="20"
          placeholder="Your name"
          aria-label="Your name"
          class="min-w-0 flex-1 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-cream placeholder:text-sand/40 outline-none focus:border-gold/60 touch-target"
        />
        <button
          onclick={save}
          disabled={!name.trim()}
          class="shrink-0 rounded-xl bg-gold px-5 py-3 font-display font-black text-ink transition active:scale-[0.97] disabled:opacity-40 touch-target"
        >
          Save
        </button>
      </div>
    </div>
  {/if}

  <!-- Ranked list -->
  <div class="mt-5 flex-1 overflow-y-auto">
    {#if top.length === 0}
      <p class="mt-10 text-center text-sand/50">No scores yet — be the first on the board.</p>
    {:else}
      <ol class="space-y-2">
        {#each top as entry, i (entry.id)}
          <li
            class="flex items-center gap-3 rounded-2xl border px-4 py-2.5 {entry.id === savedId
              ? 'border-gold/60 bg-gold/10'
              : 'border-white/10 bg-ink-soft/70'}"
          >
            <span class="w-7 shrink-0 text-center font-display text-base font-black text-sand/80">
              {medals[i] ?? i + 1}
            </span>
            <div class="min-w-0 flex-1">
              <p class="truncate font-display text-sm font-bold text-cream">{entry.name}</p>
              {#if entry.team}
                <p class="truncate text-[11px] text-sand/60">{entry.team}</p>
              {/if}
            </div>
            <span class="shrink-0 font-display text-lg font-black text-gold">
              {entry.goals}<span class="text-xs text-sand/50">/{entry.total}</span>
            </span>
          </li>
        {/each}
      </ol>
    {/if}
  </div>

  <div class="mt-4 flex gap-3">
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
</section>
