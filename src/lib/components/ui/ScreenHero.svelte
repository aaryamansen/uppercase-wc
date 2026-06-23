<script lang="ts">
  import { TEAMS, type Team } from '$lib/config';
  import { screen, selectedTeamId } from '$lib/stores';
  import { track } from '$lib/analytics';

  function choose(team: Team) {
    // Record which bag was picked so picks-per-bag show up in Vercel Analytics.
    track('bag_selected', { bag: team.bag.name, team: team.name, teamId: team.id });
    selectedTeamId.set(team.id);
    screen.set('intro');
  }
</script>

<section class="flex min-h-[100dvh] flex-col px-5 pb-[calc(var(--brand-bar-h)+max(20px,env(safe-area-inset-bottom)))] pt-[max(36px,env(safe-area-inset-top))]">
  <header class="text-center">
    <h1 class="font-display text-4xl font-extrabold leading-[0.95] tracking-tight text-cream">
      Carry Your Colours
    </h1>
    <p class="mx-auto mt-3 max-w-[15rem] text-lg font-semibold leading-snug text-sand/85">
      And score penalty kicks to earn a discount.
    </p>
  </header>

  <div class="flex flex-1 flex-col justify-center">
    <p class="mb-5 text-center text-lg text-sand/70">Pick your favourite Kicks to start</p>
    <div class="grid grid-cols-2 gap-3">
    {#each TEAMS as team (team.id)}
      <button
        onclick={() => choose(team)}
        aria-label={`Pick the ${team.bag.name}`}
        class="group relative flex flex-col items-center justify-center overflow-hidden rounded-[var(--radius-card)] border border-white/10 bg-ink-soft/80 p-3 shadow-[0_10px_30px_-12px_rgba(0,0,0,0.7)] transition active:scale-[0.97] touch-target"
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
        <p class="mt-2 text-center text-sm font-semibold text-cream">{team.bag.name}</p>
      </button>
    {/each}
    </div>
  </div>
</section>
