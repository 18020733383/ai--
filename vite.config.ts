import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        rollupOptions: {
          output: {
            manualChunks(id) {
              if (id.includes('node_modules')) {
                if (id.includes('react')) return 'react';
                if (id.includes('lucide-react')) return 'lucide';
                if (id.includes('@google/genai')) return 'genai';
                return 'vendor';
              }
              if (id.includes('/views/')) return 'views';
              if (id.includes('/components/')) return 'components';
              if (id.includes('/services/')) return 'services';
            }
          }
        }
      }
    };
});
