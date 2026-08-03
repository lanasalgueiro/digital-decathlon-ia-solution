import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { slackApiPlugin } from './vite.slack-plugin'

export default defineConfig({
  plugins: [react(), slackApiPlugin()],
  server: {
    // Libera túneis (ngrok etc.) para compartilhar o dev server.
    allowedHosts: true,
  },
})
