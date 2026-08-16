import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendUrl = env.VITE_API_BASE_URL || 'http://localhost:3000';

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      proxy: {
        '/api/v1': {
          target: backendUrl,
          changeOrigin: true,
        },
        '/admin/api': {
          target: backendUrl,
          changeOrigin: true,
        },
        '/webhooks': {
          target: backendUrl,
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: path.resolve(__dirname, '../public'),
      emptyOutDir: true,
    },
  };
});
