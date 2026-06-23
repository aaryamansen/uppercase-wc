import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    // Serve campaign art (pitch, keeper sprites, bag photos) from public/.
    files: { assets: 'public' },
    // Deployed on Vercel: the game UI is a prerendered client-rendered SPA, while
    // the cumulative tally lives behind a serverless route (src/routes/api/tally)
    // so it can read/write a Vercel KV (Upstash Redis) store shared by every visitor.
    // Pin the function runtime so the build is reproducible across Node versions.
    adapter: adapter({ runtime: 'nodejs22.x' })
  }
};

export default config;
