import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  retries: 1,
  reporter: 'list',
  outputDir: process.env.CONTACT_DECK_SHOTS || '../../test-results/contact-deck',
  projects: [
    { name: 'mobile-chromium', use: { ...devices['iPhone 13'], browserName: 'chromium', launchOptions: { executablePath: process.env.PW_CHROME } } },
    ...(process.env.PW_WEBKIT ? [{ name: 'mobile-webkit', use: { ...devices['iPhone 13'], browserName: 'webkit' as const } }] : []),
  ],
});
