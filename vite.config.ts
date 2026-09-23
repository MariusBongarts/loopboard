import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { trackerApi } from './server/plugin';

export default defineConfig({
  plugins: [vue(), trackerApi({ basePath: process.env.BASE_PATH || 'ai' })],
  server: {
    port: 5180,
    strictPort: true,
  },
});
