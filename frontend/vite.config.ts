import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    // Target Safari 15+ (iOS 15+, released Sept 2021)
    // Ensures Vite/esbuild transpiles away any syntax not supported on that target
    target: ['es2020', 'safari15'],
  },
})
