import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { viteSingleFile } from "vite-plugin-singlefile"

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    viteSingleFile(), // <--- This squashes everything into one file
  ],
  server: {
    port: 3000,
  },
  build: {
    // This ensures the output is 100% compliant with GAS
    outDir: 'dist',
    emptyOutDir: true,
  },
})