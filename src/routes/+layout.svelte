<script lang="ts">
  import '../app.css';
  let { children } = $props();
</script>

<div id="app-stage">
  {@render children()}
</div>
