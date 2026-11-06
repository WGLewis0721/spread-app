import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir:'./tests/iphone',outputDir:'test-results/iphone-artifacts',workers:1,timeout:30000,
  use:{timezoneId:'America/Chicago',locale:'en-US',baseURL:process.env.PROTOTYPE_URL||'http://127.0.0.1:4173',trace:'retain-on-failure'},
  projects:[
    {name:'Chrome iPhone',use:{...devices['iPhone 13'],defaultBrowserType:'chromium',browserName:'chromium',channel:'chrome'}},
    {name:'WebKit iPhone',use:{...devices['iPhone 13'],browserName:'webkit'}},
  ],
  reporter:[['list'],['json',{outputFile:'test-results/iphone-results.json'}]],
});
