import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Puerto fijo: el backend solo acepta los orígenes de CORS_ORIGINS. Si
  // 5173 está ocupado preferimos fallar a levantar en 5174 y que CORS
  // rechace todo sin un error obvio.
  server: { port: 5173, strictPort: true },
})
