import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    projects: [
      {
        extends: true,
        test: {
          name: 'fast',
          include: ['tests/**/*.test.ts'],
          exclude: ['tests/**/*.extended.test.ts', 'tests/**/*.nightly.test.ts']
        }
      },
      {
        extends: true,
        test: {
          name: 'extended',
          include: ['tests/**/*.test.ts', 'tests/**/*.extended.test.ts'],
          exclude: ['tests/**/*.nightly.test.ts']
        }
      },
      {
        extends: true,
        test: {
          name: 'nightly',
          include: ['tests/**/*.test.ts', 'tests/**/*.extended.test.ts', 'tests/**/*.nightly.test.ts']
        }
      }
    ]
  }
});
