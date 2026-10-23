import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
    plugins: [tsconfigPaths(), react()],
    test: {
        environment: 'jsdom',
        // Loads `.env` before `@/env` validates it, which the database tests need.
        setupFiles: ['./vitest.setup.ts'],
    },
})
