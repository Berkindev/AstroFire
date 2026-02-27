import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  server: {
    port: 3000,
    open: true,
  },
  build: {
    target: 'esnext',
  },
  optimizeDeps: {
    exclude: ['swisseph-wasm'],
  },
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/swisseph-wasm/wsam/*',
          dest: 'wsam',
        },
      ],
    }),
  ],
});
