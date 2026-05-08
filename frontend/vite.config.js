import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      // Use polling instead of fsevents (fixes native module issues on macOS)
      usePolling: true,
      interval: 100,
    },
  },
})
