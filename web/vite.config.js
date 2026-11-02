import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  root: 'src/app',
  publicDir: resolve(__dirname, 'public'),
  server: { fs: { allow: [resolve(__dirname, '..')] } },
  test: { root: __dirname, include: ['test/**/*.test.js'] },
  build: { outDir: resolve(__dirname, 'dist'), emptyOutDir: true, rollupOptions: { input: resolve(__dirname, 'src/app/world.html') } }
});
