import { defineConfig } from '@playwright/test';

import base from './playwright.config';

/**
 * Demo recordings for the pitch (`make record`): the e2e setup (Pixel 7, the same servers), filmed by
 * recordings/clips.ts as one clip per step.
 *
 * Chromium's screencast sends frames in CSS pixels whatever `deviceScaleFactor` says; only
 * --force-device-scale-factor makes it send the 3× pixels, so the 412 px wide phone becomes a 1236 px wide clip.
 */
const SCALE = 3;

export default defineConfig({
  ...base,
  testDir: 'recordings',
  testMatch: '*.rec.ts',
  retries: 0,
  reporter: 'list',
  use: {
    ...base.use,
    deviceScaleFactor: SCALE,
    launchOptions: { args: [`--force-device-scale-factor=${SCALE}`] },
    // A tap on a covered button fails after 20 s instead of retrying until the test timeout.
    actionTimeout: 20_000,
    video: 'off',
    trace: 'off',
    screenshot: 'off',
  },
});
