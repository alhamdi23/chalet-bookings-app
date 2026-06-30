import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the build works both locally and on GitHub Pages
// (which serves from /<repo-name>/). './' makes all asset paths relative.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Split big, rarely-changing dependencies into their own content-hashed
        // chunks. This keeps the initial bundle small (faster startup) and lets
        // the browser cache these vendors across deploys.
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          recharts: ['recharts'],
        },
      },
    },
  },
});
