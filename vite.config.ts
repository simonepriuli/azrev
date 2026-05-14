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
      },
      renderer: process.env.NODE_ENV === 'test' ? undefined : {},
    }),
  ],
})
