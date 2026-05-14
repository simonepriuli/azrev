import { defineConfig } from 'vite'
import path from 'node:path'
import react from '@vitejs/plugin-react'
import electron from 'vite-plugin-electron/simple'

// https://vitejs.dev/config/
export default defineConfig({
  worker: {
    format: 'es',
  },
  optimizeDeps: {
    include: [
      '@pierre/diffs',
      '@pierre/diffs/react',
      '@pierre/diffs/worker/worker.js',
      '@pierre/theme/pierre-dark',
      '@pierre/theme/pierre-light',
    ],
  },
  plugins: [
    react(),
    electron({
      main: {
        entry: 'electron/main.ts',
      },
      preload: {
        input: path.join(__dirname, 'electron/preload.ts'),
        // With package "type":"module", the plugin names output `preload.mjs` but Rollup
        // still emits CommonJS (`require`). Electron loads `.mjs` as ESM, so `require`
        // is missing and the bridge never mounts — force a `.cjs` filename instead.
        vite: {
          build: {
            rollupOptions: {
              output: {
                entryFileNames: 'preload.cjs',
                chunkFileNames: 'preload-chunk.cjs',
              },
            },
          },
        },
      },
      renderer: process.env.NODE_ENV === 'test' ? undefined : {},
    }),
  ],
})
