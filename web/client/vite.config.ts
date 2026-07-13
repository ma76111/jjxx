import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0', // Allow external access for tunneling
    strictPort: false,
    hmr: {
      protocol: 'ws',
      host: '0.0.0.0', // Fixed: Allow HMR from tunnel domains
      clientPort: 443, // Use HTTPS port for tunnel
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
