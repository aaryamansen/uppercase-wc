<script lang="ts">
  import { TEAMS, type Team } from '$lib/config';
  import { screen, selectedTeamId } from '$lib/stores';

  function choose(team: Team) {
    selectedTeamId.set(team.id);
    screen.set('intro');
  }
</script>

<section class="flex min-h-[100dvh] flex-col px-5 pb-8 pt-[max(28px,env(safe-area-inset-top))]">
  <header class="mb-5 mt-2 text-center">
    <p class="mb-3 inline-block rounded-full border border-gold/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-soft">
      Penalty Cup · Brand Activation
    </p>
    <h1 class="font-display text-4xl font-extrabold leading-none tracking-tight text-cream">
      Pick Your Bag
    </h1>
    <p class="mt-2 text-base text-sand/80">Your bag sets your ball. Score to unlock savings.</p>
  </header>

  <div class="grid flex-1 grid-cols-2 gap-3 content-center">
    {#each TEAMS as team (team.id)}
      <button
        onclick={() => choose(team)}
        aria-label={`Pick the ${team.bag.name}`}
        class="group relative flex items-center justify-center overflow-hidden rounded-[var(--radius-card)] border border-white/10 bg-ink-soft/80 p-3 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.7)] transition active:scale-[0.97] touch-target"
      >
        <span
          class="pointer-events-none absolute -top-12 left-1/2 h-32 w-32 -translate-x-1/2 rounded-full opacity-25 blur-2xl transition group-active:opacity-45"
          style={`background:${team.bag.accent}`}
        ></span>

        <div class="relative grid h-44 w-full place-items-center">
          <img
            src={team.bag.image}
            alt={team.bag.name}
            class="h-44 w-auto object-contain drop-shadow-[0_12px_18px_rgba(0,0,0,0.55)]"
            loading="eager"
          />
        </div>
      </button>
    {/each}
  </div>

  <p class="mt-5 text-center text-xs text-sand/50">3 penalties · 3 keepers · win up to 20% off</p>
</section>
