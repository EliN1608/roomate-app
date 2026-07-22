import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Expose VITE_* / SUPABASE_* from .env.local to Vitest (process.env)
  const env = loadEnv(mode, process.cwd(), '')
  for (const [key, value] of Object.entries(env)) {
    if (!(key in process.env)) process.env[key] = value
  }

  return {
    plugins: [react()],
    test: {
      environment: 'node',
      include: ['src/**/*.test.{js,jsx}', 'tests/**/*.test.js'],
      testTimeout: 90_000,
      hookTimeout: 120_000,
      // Avoid hammering Supabase Auth signup rate limits
      fileParallelism: false,
      sequence: { concurrent: false },
    },
  }
})
