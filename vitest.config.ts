import { defineConfig } from 'vitest/config'

// Kept separate from vite.config.ts so the app's build config stays free
// of test-only settings.
export default defineConfig({
  test: {
    // Node environment: everything under test is a pure function
    // (adjustedExpiry, itemStatus, validateItem, guessCategory,
    // dashboardStats), deliberately written free of React and Supabase so
    // it can be tested without mounting a component or hitting a database.
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
  },
})
