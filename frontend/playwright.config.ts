import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  reporter: 'line',
  use: { baseURL: 'http://127.0.0.1:5173', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    { command: 'bundle exec rails server -e development -p 3000', cwd: '../backend', url: 'http://127.0.0.1:3000/up', reuseExistingServer: !process.env.CI, timeout: 120_000 },
    { command: 'npm run dev -- --host 127.0.0.1 --port 5173', cwd: '.', url: 'http://127.0.0.1:5173', reuseExistingServer: !process.env.CI, timeout: 120_000 },
  ],
})
