import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 90_000,
  use: { baseURL: 'http://localhost:8081' },
  // Metro bundles on the first request and proxies /api/* to the backend (metro.config.js).
  webServer: [
    {
      command: './mvnw spring-boot:test-run',
      cwd: '../back',
      url: 'http://localhost:8080/actuator/health',
      timeout: 300_000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npx expo start --web --port 8081',
      url: 'http://localhost:8081',
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
