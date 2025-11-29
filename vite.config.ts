import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Host the site under the GitHub Pages docs path
  base: '/Pawapuro-6/docs/',
  build: {
    outDir: 'docs',
  },
})
