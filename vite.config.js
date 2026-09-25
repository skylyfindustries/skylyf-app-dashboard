import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// The dev server proxies /api to the backend, so no CORS setup is needed. Override with BACKEND_URL.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': process.env.BACKEND_URL || 'http://localhost:4000' } },
});
