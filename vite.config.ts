import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // In dev the browser talks to the Vite server and `/api` is proxied to the
  // backend, so there are no CORS headaches. Override with VITE_DEV_API_TARGET.
  const target = env.VITE_DEV_API_TARGET || 'http://localhost:9000';

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 3000,
      host: true,
      proxy: { '/api': { target, changeOrigin: true } },
    },
    build: {
      sourcemap: false,
      chunkSizeWarningLimit: 700,
    },
  };
});
