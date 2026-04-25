import { defineConfig, type PluginOption } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import path from 'node:path';

const ANALYZE = process.env.ANALYZE === '1';

const plugins: PluginOption[] = [react()];
if (ANALYZE) {
  plugins.push(
    visualizer({
      filename: 'dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
      template: 'treemap',
    }) as PluginOption,
  );
}

export default defineConfig({
  plugins,
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/admin': 'http://localhost:8000',
      '/static': 'http://localhost:8000',
      '/media': 'http://localhost:8000',
    },
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;

          // Faqat haqiqatan ham katta va kamdan-kam ishlatiladigan paketlarni ajratamiz.
          // Qolgani (React, router, tanstack, axios, i18n, hot-toast) bitta vendor chunkda
          // qoladi — bu React chunk load order muammosini oldini oladi.

          if (id.includes('/framer-motion')) {
            return 'vendor-motion';
          }
          if (id.includes('/@radix-ui/')) {
            return 'vendor-radix';
          }
          if (
            id.includes('/react-hook-form') ||
            id.includes('/@hookform/') ||
            id.includes('/zod')
          ) {
            return 'vendor-forms';
          }
          if (id.includes('/react-easy-crop')) {
            return 'vendor-crop';
          }
          if (id.includes('/lucide-react')) {
            return 'vendor-icons';
          }

          return 'vendor';
        },
      },
    },
  },
});
