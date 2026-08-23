import { defineConfig } from 'vite';

export default defineConfig({
  base: '/fps-game/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'three';
          if (id.includes('node_modules/howler')) return 'howler';
        }
      }
    }
  },
  server: {
    port: 3000,
    open: true
  }
});
