import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Configuración limpia y estándar
export default defineConfig({
  plugins: [react()],
  envDir: '../',
  server: {
    port: 5173,
    host: true
  }
})
