/** True in the Playwright e2e run: `e2e/fixtures.ts` sets the flag before the app loads. Never set for users. */
export const isE2E = () => (globalThis as { __E2E__?: boolean }).__E2E__ === true;
