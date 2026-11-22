import { test as base } from '@playwright/test';

export { expect, type APIRequestContext, type Page } from '@playwright/test';

/** Every page opens with the e2e flag set, so the app skips its pauses that exist only for people (`isE2E`). */
export const test = base.extend({
  page: async ({ page }, provide) => {
    await page.addInitScript(() => {
      (window as { __E2E__?: boolean }).__E2E__ = true;
    });
    await provide(page);
  },
});
