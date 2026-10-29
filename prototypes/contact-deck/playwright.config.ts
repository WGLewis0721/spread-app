import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  retries: 1,
  reporter: 'list',
  outputDir: process.env.CONTACT_DECK_SHOTS || '../../test-results/contact-deck',
  use: { launchOptions: { executablePath: process.env.PW_CHROME } },
  projects: [
    { name: 'mobile-chromium', use: { ...devices['iPhone 13'], browserName: 'chromium' } },
  ],
});
