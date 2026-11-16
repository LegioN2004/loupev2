import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3051,
    host: true,
    allowedHosts: ['loupev2.milinda.me', '.milinda.me', 'localhost']
  }
});
