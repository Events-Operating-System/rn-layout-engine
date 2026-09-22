import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

// Config separada de vite.config.ts (que sigue siendo la única fuente de
// verdad para el build de producción) — mismos plugins y el mismo alias
// '@' -> './src', para que los tests compilen JSX/TS exactamente igual
// que el build real, pero con el bloque `test` que vite.config.ts no
// necesita para nada fuera de tests.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
  },
})
