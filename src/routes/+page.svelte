<script lang="ts">
  import { fade } from 'svelte/transition';
  import { screen, selectedTeam } from '$lib/stores';
  import ScreenHero from '$lib/components/ui/ScreenHero.svelte';
  import ScreenIntro from '$lib/components/ui/ScreenIntro.svelte';
  import ScreenResults from '$lib/components/ui/ScreenResults.svelte';
  import ScreenLeaderboard from '$lib/components/ui/ScreenLeaderboard.svelte';
  import GameCanvas from '$lib/components/game/GameCanvas.svelte';

  const team = $derived($selectedTeam);
</script>

<svelte:head>
  <title>Penalty Cup — Score goals. Unlock savings.</title>
</svelte:head>

{#key $screen}
  <div in:fade={{ duration: 220 }} class="h-full">
    {#if $screen === 'game' && team}
      <GameCanvas {team} />
    {:else}
      <!-- All non-game UI screens share the branded bg2 backdrop. -->
      <div class="ui-bg relative min-h-[100dvh]">
        {#if $screen === 'intro'}
          <ScreenIntro />
        {:else if $screen === 'results'}
          <ScreenResults />
        {:else if $screen === 'leaderboard'}
          <ScreenLeaderboard />
        {:else}
          <ScreenHero />
        {/if}
      </div>
    {/if}
  </div>
{/key}
