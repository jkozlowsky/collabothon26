const fs = require('fs');
const path = require('path');
const { chromium } = require('/home/mchodulski/orca/workspaces/collabothon26/duel-v3/front/node_modules/playwright');

const round2Dir = '/home/mchodulski/orca/workspaces/collabothon26/duel-v3/.plans/duel-v3-qa/round2';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'
  });
  const page = await context.newPage();
  await page.route('**/api/check-questions', route => route.fulfill({ json: [] }));

  console.log('Navigating to app...');
  await page.goto('http://localhost:8082/');
  await page.waitForTimeout(1000);
  await page.getByTestId('nav-learn').click();
  await page.waitForTimeout(1000);

  const welcome = page.getByTestId('onboarding-welcome');
  if (await welcome.isVisible()) {
    await page.getByTestId('onboarding-start').click();
    await page.getByTestId('onboarding-next').click();
    await page.getByTestId('onboarding-challenge-next').click();
    await page.getByTestId('onboarding-skip-all').click();
    await page.getByTestId('consent-decline').click();
    await page.getByTestId('summary-start').click();
    await page.waitForTimeout(1000);
  }

  await page.getByTestId('nav-duel').click();
  await page.waitForTimeout(1000);

  // We want to test a match question. Let's select sao-paulo and tokyo
  // Deselect seoul and berlin
  await page.getByTestId('duel-category-seoul').click();
  await page.waitForTimeout(200);
  await page.getByTestId('duel-category-berlin').click();
  await page.waitForTimeout(200);

  console.log('Starting match with sao-paulo and tokyo...');
  await page.getByTestId('duel-start-cta').click();

  let matchFound = false;

  for (let q = 0; q < 6; q++) {
    await page.getByTestId('duel-question').waitFor({ state: 'visible', timeout: 20000 });
    await page.waitForTimeout(500);

    const isMatch = await page.getByTestId('duel-match').isVisible().catch(() => false);
    console.log(`Q${q} isMatch:`, isMatch);

    if (isMatch) {
      matchFound = true;
      console.log('Capturing match details...');

      // 360x640 screenshot
      await page.setViewportSize({ width: 360, height: 640 });
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(round2Dir, '01-match-360x640.png') });
      console.log('Saved 01-match-360x640.png');
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(400);

      // Initial screenshot
      await page.screenshot({ path: path.join(round2Dir, '02-match-initial.png') });
      console.log('Saved 02-match-initial.png');

      // Make 2 pairs
      // Left 0 with Right 1 (cross pairs to test non-trivial line paths)
      // Left 1 with Right 0
      console.log('Making 2 pairs (cross-paired to test line orientation)...');
      await page.getByTestId('match-left-0').click();
      await page.waitForTimeout(200);
      await page.getByTestId('match-right-1').click();
      await page.waitForTimeout(200);

      await page.getByTestId('match-left-1').click();
      await page.waitForTimeout(200);
      await page.getByTestId('match-right-0').click();
      await page.waitForTimeout(300);

      await page.screenshot({ path: path.join(round2Dir, '03-match-2-pairs.png') });
      console.log('Saved 03-match-2-pairs.png');

      // Make 4 pairs (complete all 4 pairs)
      console.log('Making remaining pairs (4 pairs total)...');
      await page.getByTestId('match-left-2').click();
      await page.waitForTimeout(200);
      await page.getByTestId('match-right-3').click();
      await page.waitForTimeout(200);

      await page.getByTestId('match-left-3').click();
      await page.waitForTimeout(200);
      await page.getByTestId('match-right-2').click();
      await page.waitForTimeout(400);

      await page.screenshot({ path: path.join(round2Dir, '04-match-4-pairs.png') });
      console.log('Saved 04-match-4-pairs.png');

      // Also let's inspect the SVG lines coordinates in DOM!
      const lines = await page.locator('svg[data-testid="match-svg-lines"] line').all();
      console.log('Found SVG lines count:', lines.length);
      for (let i = 0; i < lines.length; i++) {
        const x1 = await lines[i].getAttribute('x1');
        const y1 = await lines[i].getAttribute('y1');
        const x2 = await lines[i].getAttribute('x2');
        const y2 = await lines[i].getAttribute('y2');
        console.log(`Line ${i}: (${x1}, ${y1}) -> (${x2}, ${y2})`);
      }

      break;
    } else {
      // Advance to next question
      const isQuiz = await page.getByTestId('duel-option-0').isVisible().catch(() => false);
      const isPredict = await page.getByTestId('duel-predict-slider').isVisible().catch(() => false);
      const isChart = await page.getByTestId('duel-chart-slider').isVisible().catch(() => false);
      const isSort = await page.getByTestId('duel-sort').isVisible().catch(() => false);

      if (isQuiz) await page.getByTestId('duel-option-0').click();
      else if (isPredict) await page.getByTestId('duel-predict-submit').click();
      else if (isChart) await page.getByTestId('duel-chart-submit').click();
      else if (isSort) {
        const ls = page.locator('[data-testid^="duel-sort-left-"]');
        while ((await ls.count()) > 0) { await ls.first().click(); await page.waitForTimeout(50); }
        await page.getByTestId('duel-sort-submit').click();
      }

      const nextBtn = page.getByTestId('duel-next-question');
      await nextBtn.waitFor({ state: 'visible', timeout: 15000 });
      await nextBtn.click();
      await page.waitForTimeout(400);
    }
  }

  await browser.close();
  console.log('Match capture complete, found =', matchFound);
}

run().catch(e => { console.error(e); process.exit(1); });
