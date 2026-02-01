// @ts-check
import { defineConfig } from 'astro/config';
import clerk from '@clerk/astro';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  integrations: [clerk(), react()],
  output: 'server',
  adapter: vercel()
});
