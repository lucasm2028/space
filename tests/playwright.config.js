// Two projects: http (GitHub-Pages-like) and file:// (open-from-disk), proving both
// supported ways of running the site.
const { defineConfig } = require('@playwright/test');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

module.exports = defineConfig({
  testDir: __dirname,
  timeout: 60000,
  retries: 0,
  use: {
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  },
  projects: [
    {
      name: 'http',
      use: { baseURL: 'http://127.0.0.1:8123' },
    },
    {
      name: 'file',
      use: { baseURL: 'file://' + ROOT },
    },
  ],
  webServer: {
    command: 'python3 -m http.server 8123 --directory ' + ROOT,
    url: 'http://127.0.0.1:8123',
    reuseExistingServer: true,
  },
});
