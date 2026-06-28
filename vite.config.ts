import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the build works both locally and on GitHub Pages
// (which serves from /<repo-name>/). './' makes all asset paths relative.
export default defineConfig({
  base: './',
  plugins: [react()],
});
