import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Use repository name as base so assets resolve correctly on GitHub Pages
  base: '/Pawapuro-6/',
})
