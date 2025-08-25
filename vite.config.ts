import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  build: {
    ssr: 'src/server.ts', // server entry point
    outDir: 'dist',
    rollupOptions: {
      output: {
        entryFileNames: `server.js`,
      },
    },
  },
  resolve: {
    alias: {
      '@db': path.resolve(__dirname, 'src/db'),
      '@lib': path.resolve(__dirname, 'src/lib'),
      '@middleware': path.resolve(__dirname, 'src/middleware'),
      '@routes': path.resolve(__dirname, 'src/routes'),
      '@types': path.resolve(__dirname, 'src/types'),
      '@validation': path.resolve(__dirname, 'src/validation'),
      '@src': path.resolve(__dirname, 'src'),
    },
  },
});
