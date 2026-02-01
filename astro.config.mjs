// @ts-check
import { defineConfig } from 'astro/config';
import clerk from '@clerk/astro';
import react from '@astrojs/react';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  integrations: [clerk(), react()],
  output: 'server',
  adapter: node({
    mode: 'standalone'
  })
});
