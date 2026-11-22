import { test as base } from '@playwright/test';

export { expect, type APIRequestContext, type Page } from '@playwright/test';

/** Every page opens with the e2e flag set, so the app skips its pauses that exist only for people (`isE2E`). */
export const test = base.extend({
  page: async ({ page, request }, provide) => {
    await page.addInitScript(() => {
      (window as { __E2E__?: boolean }).__E2E__ = true;
    });
    await provide(page);
    try {
      const devId = await page.evaluate(() => window.localStorage.getItem('fq_device_id'));
      if (devId) {
        await request.delete(`/api/users/demo-user/session?deviceId=${encodeURIComponent(devId)}`).catch(() => {});
      }
    } catch {}
  },
});
