import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts', 'playground/**', 'tests/**'],
      reportsDirectory: './coverage',
      reportOnFailure: true,
      thresholds: {
        100: true,
      },
    },
  },
});
