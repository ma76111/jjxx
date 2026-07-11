import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react({
    // Disable fast refresh in Termux to avoid issues
    fastRefresh: true,
    babel: {
      compact: false,
      babelrc: false,
      configFile: false
    }
  })],
  server: {
    port: 5173,
    host: '0.0.0.0',
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
    watch: {
      usePolling: true,
      interval: 1000
    }
  },
  build: {
    target: 'es2015',
    minify: 'terser',
    sourcemap: false
  },
  optimizeDeps: {
    exclude: []
  }
});
