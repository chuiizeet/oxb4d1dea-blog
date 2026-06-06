import { defineConfig } from 'astro/config';
import svelte from '@astrojs/svelte';
import node from '@astrojs/node';

export default defineConfig({
  output: 'server',
  // detrás del proxy TLS de DO, el check de origen de Astro da falso positivo
  // ("Cross-site POST form submissions are forbidden"). La cookie SameSite=lax
  // sigue protegiendo contra CSRF.
  security: { checkOrigin: false },
  adapter: node({ mode: 'standalone' }),
  integrations: [svelte()],
});
