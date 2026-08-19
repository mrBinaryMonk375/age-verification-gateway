// Age Verification Gateway - Vitest Configuration
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Only run age-gate tests, not the old bboard tests
    include: ['src/test/age-gate.test.ts'],
    environment: 'node',
    reporters: ['verbose'],
  },
});
