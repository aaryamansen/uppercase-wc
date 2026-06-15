<script lang="ts">
  import { footballSvg, type Colorway } from '$lib/game/ball';

  let {
    colorway,
    size = 120,
    id = 'ui'
  }: { colorway: Colorway; size?: number; id?: string } = $props();

  const svg = $derived(footballSvg(colorway, `${id}-${colorway.c1.replace('#', '')}`));
</script>

<div
  class="ball-wrap"
  style={`width:${size}px;height:${size}px`}
  aria-label="Football"
>
  {@html svg}
</div>

<style>
  .ball-wrap {
    display: block;
    line-height: 0;
    filter: drop-shadow(0 8px 12px rgba(0, 0, 0, 0.45));
  }
  .ball-wrap :global(svg) {
    width: 100%;
    height: 100%;
  }
</style>
