<script lang="ts">
  // Persistent brand bar.
  // ---------------------------------------------------------------------------
  // A translucent teal glass strip pinned to the bottom of the phone stage so the
  // Uppercase logo stays visible on every non-game UI screen (hero, intro,
  // results). Rendered once in +page.svelte and hidden on the gameplay screen.
  // Purely decorative: pointer-events are disabled so taps pass through to the
  // action buttons that sit above it.
</script>

<div class="brand-bar" aria-hidden="true">
  <img src="/assets/whitelogo.png" alt="uppercase" class="h-6 w-auto opacity-95" loading="eager" />
</div>

<style>
  .brand-bar {
    position: fixed;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    max-width: 430px;
    padding: 11px 0 calc(11px + env(safe-area-inset-bottom));
    /* Translucent teal glass that floats above the screen content. */
    background: linear-gradient(
      180deg,
      rgba(20, 184, 166, 0.14) 0%,
      rgba(13, 148, 136, 0.3) 100%
    );
    backdrop-filter: blur(14px) saturate(140%);
    -webkit-backdrop-filter: blur(14px) saturate(140%);
    border-top: 1px solid rgba(94, 234, 212, 0.3);
    box-shadow:
      0 -10px 26px -12px rgba(0, 0, 0, 0.6),
      inset 0 1px 0 rgba(255, 255, 255, 0.07);
    /* Decorative only — never intercept taps meant for the UI above it. */
    pointer-events: none;
  }
</style>
