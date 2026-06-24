import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Le front Vite tourne sur 5173 ; l'API Express sur PORT (3000 par défaut).
// On proxifie /api vers le serveur Express pour avoir une seule origine en dev.
const API_PORT = process.env.PORT || '3000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: `http://localhost:${API_PORT}`,
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
});
