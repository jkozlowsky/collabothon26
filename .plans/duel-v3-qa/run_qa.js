const fs = require('fs');
const path = require('path');
const { chromium } = require('/home/mchodulski/orca/workspaces/collabothon26/duel-v3/front/node_modules/playwright');

// Load all questions from content/duel/*.json for correct answers
const duelDir = '/home/mchodulski/orca/workspaces/collabothon26/duel-v3/back/src/main/resources/content/duel';
const files = fs.readdirSync(duelDir).filter(f => f.endsWith('.json'));
const allQuestions = [];
for (const file of files) {
  const story = file.replace('.json', '');
  const data = JSON.parse(fs.readFileSync(path.join(duelDir, file), 'utf8'));
  for (const q of data.questions) {
    q.story = story;
    allQuestions.push(q);
  }
}

function findQuestionData(bodyText) {
  if (!bodyText) return null;
  const clean = bodyText.trim().toLowerCase();
  for (const q of allQuestions) {
    const p = (q.step.prompt || '').trim().toLowerCase();
    if (p && (clean.includes(p) || p.includes(clean))) return q;
  }
  return null;
}

const qaDir = '/home/mchodulski/orca/workspaces/collabothon26/duel-v3/.plans/duel-v3-qa';
if (!fs.existsSync(qaDir)) fs.mkdirSync(qaDir, { recursive: true });

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'
  });
  const page = await context.newPage();

  const consoleLogs = [];
  const httpErrors = [];

  page.on('console', msg => {
    const text = `[${msg.type()}] ${msg.text()}`;
    consoleLogs.push(text);
    if (msg.type() === 'error') console.log('BROWSER_CONSOLE_ERR:', text);
  });
  page.on('pageerror', err => {
    const text = `PAGE_ERROR: ${err.message}`;
    consoleLogs.push(text);
    console.error('BROWSER_PAGE_ERR:', err.message);
  });
  page.on('response', res => {
    if (res.status() >= 400) {
      const text = `HTTP ${res.status()} ${res.request().method()} ${res.url()}`;
      httpErrors.push(text);
      console.log('HTTP_ERR:', text);
    }
  });

  await page.route('**/api/check-questions', route => route.fulfill({ json: [] }));

  console.log('=== Step 1: Navigating to App and Onboarding bypass ===');
  await page.goto('http://localhost:8082/');
  await page.waitForTimeout(1000);
  await page.getByTestId('nav-learn').click();
  await page.waitForTimeout(1000);

  const welcome = page.getByTestId('onboarding-welcome');
  if (await welcome.isVisible()) {
    console.log('Bypassing onboarding...');
    await page.getByTestId('onboarding-start').click();
    await page.getByTestId('onboarding-next').click();
    await page.getByTestId('onboarding-challenge-next').click();
    await page.getByTestId('onboarding-skip-all').click();
    await page.getByTestId('consent-decline').click();
    await page.getByTestId('summary-start').click();
    await page.waitForTimeout(1000);
  }

  console.log('=== Step 2: Duel Lobby verification ===');
  await page.getByTestId('nav-duel').click();
  await page.waitForTimeout(1500);

  // Screenshot lobby
  await page.screenshot({ path: path.join(qaDir, '01-lobby.png') });
  console.log('Saved 01-lobby.png');

  // Verify all 7 categories
  const categoriesExpected = [
    { slug: 'seoul', name: 'Hype & leverage' },
    { slug: 'berlin', name: 'Inflation & savings' },
    { slug: 'sao-paulo', name: 'Instalments & debt' },
    { slug: 'tokyo', name: 'Diversification' },
    { slug: 'buenos-aires', name: 'Fast inflation' },
    { slug: 'nairobi', name: 'Small savings' },
    { slug: 'mumbai', name: 'Gold' },
  ];

  for (const cat of categoriesExpected) {
    const row = page.getByTestId(`duel-category-${cat.slug}`);
    const visible = await row.isVisible();
    const text = await row.innerText();
    console.log(`Category ${cat.slug}: visible=${visible}, text=${text.replace(/\n/g, ' ')}`);
  }

  console.log('Deselecting seoul and sao-paulo to leave 2 categories (berlin, tokyo)...');
  await page.getByTestId('duel-category-seoul').click();
  await page.waitForTimeout(300);
  await page.getByTestId('duel-category-sao-paulo').click();
  await page.waitForTimeout(300);

  await page.screenshot({ path: path.join(qaDir, '02-lobby-2-selected.png') });
  console.log('Saved 02-lobby-2-selected.png');

  const ctaBtn = page.getByTestId('duel-start-cta');
  console.log('CTA Button text:', await ctaBtn.innerText());

  console.log('=== Step 3: Match 1 (HUMAN mode, 2 categories) ===');
  await ctaBtn.click();

  const match1Questions = [];
  const metTypes = new Set();

  for (let q = 0; q < 6; q++) {
    console.log(`\n--- Question ${q + 1} of 6 ---`);
    await page.getByTestId('duel-question').waitFor({ state: 'visible', timeout: 20000 });
    await page.waitForTimeout(600);

    const bodyText = await page.getByTestId('duel-question').innerText();
    const isQuiz = await page.getByTestId('duel-option-0').isVisible().catch(() => false);
    const isPredict = await page.getByTestId('duel-predict-slider').isVisible().catch(() => false);
    const isChart = await page.getByTestId('duel-chart-slider').isVisible().catch(() => false);
    const isSort = await page.getByTestId('duel-sort').isVisible().catch(() => false);
    const isMatch = await page.getByTestId('duel-match').isVisible().catch(() => false);

    let stepType = 'unknown';
    if (isQuiz) stepType = 'quiz';
    else if (isPredict) stepType = 'predict';
    else if (isChart) stepType = 'chart';
    else if (isSort) stepType = 'sort';
    else if (isMatch) stepType = 'match';
    metTypes.add(stepType);

    const qData = findQuestionData(bodyText);
    const qId = qData ? qData.id : `unknown-q${q}`;
    const qPrompt = qData ? (qData.step.prompt || qData.id) : bodyText.slice(0, 100);
    match1Questions.push({ index: q, id: qId, type: stepType, prompt: qPrompt });
    console.log(`Match 1 Q${q}: id=${qId}, type=${stepType}`);
    console.log(`Prompt: "${qPrompt}"`);

    // Verify scoreboard
    const youScore = await page.getByTestId('duel-scoreboard-your-score').innerText().catch(() => 'N/A');
    const rivalScore = await page.getByTestId('duel-scoreboard-rival-score').innerText().catch(() => 'N/A');
    console.log(`Scoreboard: you=${youScore}, rival=${rivalScore}`);

    // Check 360x640 check on Q0 or when meeting first type
    if (q === 0) {
      await page.setViewportSize({ width: 360, height: 640 });
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(qaDir, `03-q${q}-${stepType}-360x640.png`) });
      console.log(`Saved 03-q${q}-${stepType}-360x640.png`);
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(400);
    }

    // Screenshot BEFORE answering
    await page.screenshot({ path: path.join(qaDir, `04-q${q}-${stepType}-before.png`) });
    console.log(`Saved 04-q${q}-${stepType}-before.png`);

    // Answer according to question type
    if (stepType === 'sort') {
      const submitBtn = page.getByTestId('duel-sort-submit');
      console.log('Sort submit aria-disabled:', await submitBtn.getAttribute('aria-disabled'));
      await page.screenshot({ path: path.join(qaDir, `05-q${q}-sort-disabled.png`) });

      // Sort items based on qData solution or items mapping
      const sortStep = qData ? qData.step : null;
      if (sortStep && Array.isArray(sortStep.items)) {
        for (let itemIdx = 0; itemIdx < sortStep.items.length; itemIdx++) {
          const itemObj = sortStep.items[itemIdx];
          const targetBucket = (typeof itemObj === 'object' && itemObj.bucket !== undefined) ? itemObj.bucket : 0;
          if (targetBucket === 0) {
            const btn = page.getByTestId(`duel-sort-left-${itemIdx}`);
            if (await btn.isVisible()) await btn.click();
          } else {
            const btn = page.getByTestId(`duel-sort-right-${itemIdx}`);
            if (await btn.isVisible()) await btn.click();
          }
          await page.waitForTimeout(150);
        }
      } else {
        // Fallback
        const lefts = page.locator('[data-testid^="duel-sort-left-"]');
        while ((await lefts.count()) > 0) {
          await lefts.first().click();
          await page.waitForTimeout(100);
        }
      }

      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(qaDir, `06-q${q}-sort-placed.png`) });
      console.log('Sort submit aria-disabled after placing:', await submitBtn.getAttribute('aria-disabled'));
      await submitBtn.click();

    } else if (stepType === 'match') {
      const submitBtn = page.getByTestId('duel-match-submit');
      console.log('Match submit aria-disabled:', await submitBtn.getAttribute('aria-disabled'));
      await page.screenshot({ path: path.join(qaDir, `07-q${q}-match-disabled.png`) });

      const matchStep = qData ? qData.step : null;
      if (matchStep && Array.isArray(matchStep.pairs)) {
        // matchStep.pairs is [[leftText, rightText], ...]
        // Find which right index matches each left index
        const leftCount = await page.locator('[data-testid^="match-left-"]').count();
        const rightCount = await page.locator('[data-testid^="match-right-"]').count();

        for (let l = 0; l < leftCount; l++) {
          const leftText = (await page.getByTestId(`match-left-${l}`).innerText()).trim();
          // Find matching right text
          let matchedRightText = null;
          for (const [leftSide, rightSide] of matchStep.pairs) {
            if (leftSide.trim().toLowerCase() === leftText.toLowerCase()) {
              matchedRightText = rightSide.trim().toLowerCase();
              break;
            }
          }

          let rightIdxToClick = -1;
          for (let r = 0; r < rightCount; r++) {
            const rText = (await page.getByTestId(`match-right-${r}`).innerText()).trim().toLowerCase();
            if (matchedRightText && rText === matchedRightText) {
              rightIdxToClick = r;
              break;
            }
          }
          if (rightIdxToClick === -1) rightIdxToClick = l; // fallback

          await page.getByTestId(`match-left-${l}`).click();
          await page.waitForTimeout(150);
          await page.getByTestId(`match-right-${rightIdxToClick}`).click();
          await page.waitForTimeout(150);
        }
      } else {
        const leftCount = await page.locator('[data-testid^="match-left-"]').count();
        for (let i = 0; i < leftCount; i++) {
          await page.getByTestId(`match-left-${i}`).click();
          await page.waitForTimeout(150);
          await page.getByTestId(`match-right-${i}`).click();
          await page.waitForTimeout(150);
        }
      }

      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(qaDir, `08-q${q}-match-paired.png`) });
      console.log('Match submit aria-disabled after pairs:', await submitBtn.getAttribute('aria-disabled'));
      await submitBtn.click();

    } else if (stepType === 'predict') {
      const submitBtn = page.getByTestId('duel-predict-submit');
      console.log('Predict submit disabled:', await submitBtn.getAttribute('aria-disabled'));

      if (qData && qData.step && qData.step.answer !== undefined) {
        const min = qData.step.input ? qData.step.input.min : qData.step.min;
        const max = qData.step.input ? qData.step.input.max : qData.step.max;
        const answer = qData.step.answer;
        const slider = page.getByTestId('duel-predict-slider');
        const box = await slider.boundingBox();
        if (box && Number.isFinite(min) && Number.isFinite(max)) {
          const fraction = Math.min(1, Math.max(0, (answer - min) / (max - min)));
          await page.mouse.click(Math.round(box.x + fraction * box.width), Math.round(box.y + box.height / 2));
          await page.waitForTimeout(200);
        }
      }
      await page.screenshot({ path: path.join(qaDir, `09-q${q}-predict-answered.png`) });
      await submitBtn.click();

    } else if (stepType === 'chart') {
      const submitBtn = page.getByTestId('duel-chart-submit');
      console.log('Chart submit disabled:', await submitBtn.getAttribute('aria-disabled'));

      if (qData && qData.step && qData.step.answer !== undefined) {
        const min = qData.step.input ? qData.step.input.min : qData.step.min;
        const max = qData.step.input ? qData.step.input.max : qData.step.max;
        const answer = qData.step.answer;
        const slider = page.getByTestId('duel-chart-slider');
        const box = await slider.boundingBox();
        if (box && Number.isFinite(min) && Number.isFinite(max)) {
          const fraction = Math.min(1, Math.max(0, (answer - min) / (max - min)));
          await page.mouse.click(Math.round(box.x + fraction * box.width), Math.round(box.y + box.height / 2));
          await page.waitForTimeout(200);
        }
      }
      await page.screenshot({ path: path.join(qaDir, `10-q${q}-chart-answered.png`) });
      await submitBtn.click();

    } else if (stepType === 'quiz') {
      const correctIdx = qData && qData.step && qData.step.correctIndex !== undefined ? qData.step.correctIndex : 0;
      console.log(`Quiz selecting option ${correctIdx}`);
      await page.getByTestId(`duel-option-${correctIdx}`).click();
    }

    // Wait for feedback
    const nextBtn = page.getByTestId('duel-next-question');
    await nextBtn.waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(500);

    // AFTER screenshot
    await page.screenshot({ path: path.join(qaDir, `11-q${q}-${stepType}-after.png`) });
    console.log(`Saved 11-q${q}-${stepType}-after.png`);

    await nextBtn.click();
    await page.waitForTimeout(500);
  }

  console.log('\n=== Step 4: Result Screen & Celebration ===');
  await page.getByTestId('duel-result').waitFor({ state: 'visible', timeout: 25000 });
  await page.waitForTimeout(800);

  // Result screen screenshot
  await page.screenshot({ path: path.join(qaDir, '15-result-win.png') });
  console.log('Saved 15-result-win.png');

  // Check level up overlay
  const levelUpOverlay = page.getByTestId('level-up-overlay');
  const levelUpVisible = await levelUpOverlay.isVisible().catch(() => false);
  console.log('Level-up overlay visible:', levelUpVisible);

  if (levelUpVisible) {
    await page.screenshot({ path: path.join(qaDir, '16-level-up-mid.png') });
    console.log('Saved 16-level-up-mid.png');

    await page.waitForTimeout(1600);
    await page.screenshot({ path: path.join(qaDir, '17-level-up-end.png') });
    console.log('Saved 17-level-up-end.png');

    console.log('Dismissing first level-up overlay...');
    await levelUpOverlay.click();
    await page.waitForTimeout(800);

    // Check if second level-up overlay appeared (for the other category!)
    if (await levelUpOverlay.isVisible().catch(() => false)) {
      console.log('Second level-up overlay appeared!');
      await page.screenshot({ path: path.join(qaDir, '17b-level-up-second.png') });
      await page.waitForTimeout(1600);
      await levelUpOverlay.click();
      await page.waitForTimeout(500);
    }
  }

  await page.screenshot({ path: path.join(qaDir, '18-result-post-levelup.png') });
  console.log('Saved 18-result-post-levelup.png');

  console.log('\n=== Step 5: Rankings Screen & Climb Animation ===');
  const seeRankingsBtn = page.getByTestId('result-see-rankings');
  if (await seeRankingsBtn.isVisible()) {
    await seeRankingsBtn.click();
  } else {
    await page.getByTestId('result-back-lobby').click();
    await page.getByTestId('duel-open-rankings').click();
  }

  await page.getByTestId('screen-duel-rankings').waitFor({ state: 'visible', timeout: 15000 });

  // Climb animation frames
  await page.screenshot({ path: path.join(qaDir, '20-rankings-climb-start.png') });
  console.log('Saved 20-rankings-climb-start.png');

  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(qaDir, '21-rankings-climb-mid.png') });
  console.log('Saved 21-rankings-climb-mid.png');

  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(qaDir, '22-rankings-climb-end.png') });
  console.log('Saved 22-rankings-climb-end.png');

  // Top 3 medal cards
  await page.screenshot({ path: path.join(qaDir, '23-rankings-medal-cards.png') });
  console.log('Saved 23-rankings-medal-cards.png');

  // Scroll down to check sticky row
  console.log('Scrolling down to test sticky row...');
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(qaDir, '24-rankings-sticky.png') });
  console.log('Saved 24-rankings-sticky.png');

  const stickyRow = page.getByTestId('rankings-pinned-me');
  console.log('Sticky row visible:', await stickyRow.isVisible().catch(() => false));

  // Scroll back so Alex row is merged
  await page.mouse.wheel(0, -350);
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(qaDir, '25-rankings-merged.png') });
  console.log('Saved 25-rankings-merged.png');

  // Return to lobby
  await page.getByTestId('rankings-back').click();
  await page.getByTestId('screen-duel').waitFor({ state: 'visible', timeout: 10000 });

  console.log('\n=== Step 6: Match 2 (Verify different questions) ===');
  await page.getByTestId('duel-start-cta').click();
  const match2Questions = [];

  for (let q = 0; q < 6; q++) {
    await page.getByTestId('duel-question').waitFor({ state: 'visible', timeout: 20000 });
    await page.waitForTimeout(400);

    const bodyText = await page.getByTestId('duel-question').innerText();
    const isQuiz = await page.getByTestId('duel-option-0').isVisible().catch(() => false);
    const isPredict = await page.getByTestId('duel-predict-slider').isVisible().catch(() => false);
    const isChart = await page.getByTestId('duel-chart-slider').isVisible().catch(() => false);
    const isSort = await page.getByTestId('duel-sort').isVisible().catch(() => false);
    const isMatch = await page.getByTestId('duel-match').isVisible().catch(() => false);

    let stepType = 'unknown';
    if (isQuiz) stepType = 'quiz';
    else if (isPredict) stepType = 'predict';
    else if (isChart) stepType = 'chart';
    else if (isSort) stepType = 'sort';
    else if (isMatch) stepType = 'match';
    metTypes.add(stepType);

    const qData = findQuestionData(bodyText);
    const qId = qData ? qData.id : `unknown-q${q}`;
    const qPrompt = qData ? (qData.step.prompt || qData.id) : bodyText.slice(0, 100);
    match2Questions.push({ index: q, id: qId, type: stepType, prompt: qPrompt });
    console.log(`Match 2 Q${q}: id=${qId}, type=${stepType}`);
    console.log(`Prompt: "${qPrompt}"`);

    if (isQuiz) {
      await page.getByTestId('duel-option-0').click();
    } else if (isPredict) {
      await page.getByTestId('duel-predict-submit').click();
    } else if (isChart) {
      await page.getByTestId('duel-chart-submit').click();
    } else if (isSort) {
      const lefts = page.locator('[data-testid^="duel-sort-left-"]');
      while ((await lefts.count()) > 0) {
        await lefts.first().click();
        await page.waitForTimeout(80);
      }
      await page.getByTestId('duel-sort-submit').click();
    } else if (isMatch) {
      const leftCount = await page.locator('[data-testid^="match-left-"]').count();
      for (let i = 0; i < leftCount; i++) {
        await page.getByTestId(`match-left-${i}`).click();
        await page.getByTestId(`match-right-${i}`).click();
      }
      await page.getByTestId('duel-match-submit').click();
    }

    const nextBtn = page.getByTestId('duel-next-question');
    await nextBtn.waitFor({ state: 'visible', timeout: 15000 });
    await nextBtn.click();
  }

  await page.getByTestId('duel-result').waitFor({ state: 'visible', timeout: 25000 });
  await page.waitForTimeout(1000);
  if (await page.getByTestId('level-up-overlay').isVisible().catch(() => false)) {
    await page.waitForTimeout(1500);
    await page.getByTestId('level-up-overlay').click();
    await page.waitForTimeout(500);
  }
  await page.getByTestId('result-back-lobby').click();
  await page.getByTestId('screen-duel').waitFor({ state: 'visible', timeout: 10000 });

  console.log('\n=== Step 7: Solo Match ===');
  await page.getByTestId('duel-mode-solo').click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(qaDir, '29-lobby-solo-mode.png') });
  console.log('Saved 29-lobby-solo-mode.png');

  await page.getByTestId('duel-start-cta').click();

  for (let q = 0; q < 6; q++) {
    await page.getByTestId('duel-question').waitFor({ state: 'visible', timeout: 20000 });
    await page.waitForTimeout(300);

    const isQuiz = await page.getByTestId('duel-option-0').isVisible().catch(() => false);
    const isPredict = await page.getByTestId('duel-predict-slider').isVisible().catch(() => false);
    const isChart = await page.getByTestId('duel-chart-slider').isVisible().catch(() => false);
    const isSort = await page.getByTestId('duel-sort').isVisible().catch(() => false);
    const isMatch = await page.getByTestId('duel-match').isVisible().catch(() => false);

    if (isQuiz) {
      await page.getByTestId('duel-option-0').click();
    } else if (isPredict) {
      await page.getByTestId('duel-predict-submit').click();
    } else if (isChart) {
      await page.getByTestId('duel-chart-submit').click();
    } else if (isSort) {
      const lefts = page.locator('[data-testid^="duel-sort-left-"]');
      while ((await lefts.count()) > 0) {
        await lefts.first().click();
        await page.waitForTimeout(50);
      }
      await page.getByTestId('duel-sort-submit').click();
    } else if (isMatch) {
      const leftCount = await page.locator('[data-testid^="match-left-"]').count();
      for (let i = 0; i < leftCount; i++) {
        await page.getByTestId(`match-left-${i}`).click();
        await page.getByTestId(`match-right-${i}`).click();
      }
      await page.getByTestId('duel-match-submit').click();
    }

    const nextBtn = page.getByTestId('duel-next-question');
    await nextBtn.waitFor({ state: 'visible', timeout: 15000 });
    await nextBtn.click();
  }

  await page.getByTestId('duel-result').waitFor({ state: 'visible', timeout: 25000 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(qaDir, '30-result-solo.png') });
  console.log('Saved 30-result-solo.png');

  // Summary JSON
  const summary = {
    metTypes: Array.from(metTypes),
    match1Questions,
    match2Questions,
    consoleLogs,
    httpErrors,
  };
  fs.writeFileSync(path.join(qaDir, 'qa-summary.json'), JSON.stringify(summary, null, 2));

  await browser.close();
  console.log('\n=== QA PASS COMPLETE ===');
}

run().catch(err => {
  console.error('QA script fatal error:', err);
  process.exit(1);
});
