import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  allowedHosts: true,
  server: {
    host: '0.0.0.0', // allow LAN access
    port: 5173,
    allowedHosts: true
  },
});
