import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: {
    port: 5173,
    // Proxy /api → backend so the browser treats everything as same-origin
    // (:5173). This is what makes the httpOnly refresh cookie be stored & sent
    // in dev, mirroring a production reverse proxy. No CORS needed.
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
});
