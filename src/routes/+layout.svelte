<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { initAnalytics } from '$lib/analytics';

  let { children } = $props();

  onMount(initAnalytics);
</script>

<div id="app-stage">
  {@render children()}
</div>
