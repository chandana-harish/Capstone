import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api/auth': {
        target: process.env.VITE_AUTH_SERVICE_URL || 'http://localhost:4001',
        changeOrigin: true,
      },
      '/api/users': {
        target: process.env.VITE_USER_SERVICE_URL || 'http://localhost:4002',
        changeOrigin: true,
      },
      '/api/trainings': {
        target: process.env.VITE_TRAINING_SERVICE_URL || 'http://localhost:4003',
        changeOrigin: true,
      },
      '/api/attendance': {
        target: process.env.VITE_ATTENDANCE_SERVICE_URL || 'http://localhost:4004',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@headlessui/react', '@heroicons/react'],
        },
      },
    },
  },
});
