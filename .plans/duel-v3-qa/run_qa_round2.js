const fs = require('fs');
const path = require('path');
const { chromium } = require('/home/mchodulski/orca/workspaces/collabothon26/duel-v3/front/node_modules/playwright');

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

const round2Dir = '/home/mchodulski/orca/workspaces/collabothon26/duel-v3/.plans/duel-v3-qa/round2';
if (!fs.existsSync(round2Dir)) fs.mkdirSync(round2Dir, { recursive: true });

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
    if (msg.type() === 'error') console.log('CONSOLE_ERR:', text);
  });
  page.on('pageerror', err => {
    console.error('PAGE_ERR:', err.message);
  });
  page.on('response', res => {
    if (res.status() >= 400) {
      const text = `HTTP ${res.status()} ${res.request().method()} ${res.url()}`;
      httpErrors.push(text);
      console.log('HTTP_ERR:', text);
    }
  });

  await page.route('**/api/check-questions', route => route.fulfill({ json: [] }));

  console.log('--- Step 1: Navigate to App & Onboarding ---');
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

  console.log('--- Step 2: Open Duel Lobby ---');
  await page.getByTestId('nav-duel').click();
  await page.waitForTimeout(1500);

  // We want to test Tokyo and Berlin
  console.log('Setting categories to Tokyo and Berlin...');
  await page.getByTestId('duel-category-seoul').click();
  await page.waitForTimeout(200);
  await page.getByTestId('duel-category-sao-paulo').click();
  await page.waitForTimeout(200);

  let capturedSort = false;
  let capturedMatch = false;

  console.log('--- Step 3: Match session ---');
  await page.getByTestId('duel-start-cta').click();

  for (let q = 0; q < 6; q++) {
    console.log(`\nQuestion ${q + 1} of 6:`);
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

    const qData = findQuestionData(bodyText);
    console.log(`Type: ${stepType}, id: ${qData ? qData.id : 'unknown'}`);

    // Check 3: Scoreboard detail
    if (q === 0 || q === 1) {
      await page.screenshot({ path: path.join(round2Dir, `08-scoreboard-q${q}.png`) });
      console.log(`Saved 08-scoreboard-q${q}.png`);
      const scoreboardText = await page.getByTestId('duel-scoreboard').innerText();
      console.log('Scoreboard text content:\n', scoreboardText);
    }

    // CHECK 1: MATCH QUESTION SPECIFICS
    if (stepType === 'match') {
      capturedMatch = true;
      console.log('Checking MATCH question specifically:');

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

      const matchStep = qData ? qData.step : null;
      const leftCount = await page.locator('[data-testid^="match-left-"]').count();
      const rightCount = await page.locator('[data-testid^="match-right-"]').count();

      // Pair finding logic
      const pairTargets = [];
      for (let l = 0; l < leftCount; l++) {
        const leftText = (await page.getByTestId(`match-left-${l}`).innerText()).trim().toLowerCase();
        let matchedRightText = null;
        if (matchStep && matchStep.pairs) {
          for (const [leftSide, rightSide] of matchStep.pairs) {
            if (leftSide.trim().toLowerCase() === leftText) {
              matchedRightText = rightSide.trim().toLowerCase();
              break;
            }
          }
        }
        let rightIdx = -1;
        for (let r = 0; r < rightCount; r++) {
          const rText = (await page.getByTestId(`match-right-${r}`).innerText()).trim().toLowerCase();
          if (matchedRightText && rText === matchedRightText) {
            rightIdx = r;
            break;
          }
        }
        if (rightIdx === -1) rightIdx = l;
        pairTargets.push({ l, r: rightIdx });
      }

      // Make 2 pairs
      console.log('Making 2 pairs...');
      for (let i = 0; i < 2 && i < pairTargets.length; i++) {
        await page.getByTestId(`match-left-${pairTargets[i].l}`).click();
        await page.waitForTimeout(200);
        await page.getByTestId(`match-right-${pairTargets[i].r}`).click();
        await page.waitForTimeout(200);
      }
      await page.waitForTimeout(300);
      await page.screenshot({ path: path.join(round2Dir, '03-match-2-pairs.png') });
      console.log('Saved 03-match-2-pairs.png');

      // Make remaining pairs (total 4 pairs)
      console.log('Making remaining pairs (4 pairs)...');
      for (let i = 2; i < pairTargets.length; i++) {
        await page.getByTestId(`match-left-${pairTargets[i].l}`).click();
        await page.waitForTimeout(200);
        await page.getByTestId(`match-right-${pairTargets[i].r}`).click();
        await page.waitForTimeout(200);
      }
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(round2Dir, '04-match-4-pairs.png') });
      console.log('Saved 04-match-4-pairs.png');

      // Submit
      await page.getByTestId('duel-match-submit').click();

    } else if (stepType === 'sort') {
      // CHECK 2: SORT QUESTION SPECIFICS
      capturedSort = true;
      console.log('Checking SORT question specifically:');

      // 360x640 screenshot
      await page.setViewportSize({ width: 360, height: 640 });
      await page.waitForTimeout(400);
      await page.screenshot({ path: path.join(round2Dir, '05-sort-360x640.png') });
      console.log('Saved 05-sort-360x640.png');
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(400);

      // Initial screenshot with hint under Submit
      await page.screenshot({ path: path.join(round2Dir, '06-sort-initial-hint.png') });
      console.log('Saved 06-sort-initial-hint.png');
      
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
        const lefts = page.locator('[data-testid^="duel-sort-left-"]');
        while ((await lefts.count()) > 0) {
          await lefts.first().click();
          await page.waitForTimeout(100);
        }
      }

      await page.waitForTimeout(400);
      // Screenshot after all placed
      await page.screenshot({ path: path.join(round2Dir, '07-sort-all-placed.png') });
      console.log('Saved 07-sort-all-placed.png');

      // Verify hint is hidden
      const hintCount = await page.locator('text="Sort every card to submit"').count();
      console.log('Hint text count after all placed (expect 0):', hintCount);

      // Verify banner copy
      const bannerText = await page.locator('[data-testid="duel-sort"]').innerText();
      console.log('Banner text in sort view:\n', bannerText.split('\n').filter(l => l.includes('cards') || l.includes('placed') || l.includes('Submit')));

      await page.getByTestId('duel-sort-submit').click();

    } else if (stepType === 'predict') {
      if (qData && qData.step && qData.step.answer !== undefined) {
        const min = qData.step.input ? qData.step.input.min : qData.step.min;
        const max = qData.step.input ? qData.step.input.max : qData.step.max;
        const answer = qData.step.answer;
        const slider = page.getByTestId('duel-predict-slider');
        const box = await slider.boundingBox();
        if (box && Number.isFinite(min) && Number.isFinite(max)) {
          const fraction = Math.min(1, Math.max(0, (answer - min) / (max - min)));
          await page.mouse.click(Math.round(box.x + fraction * box.width), Math.round(box.y + box.height / 2));
          await page.waitForTimeout(150);
        }
      }
      await page.getByTestId('duel-predict-submit').click();

    } else if (stepType === 'chart') {
      if (qData && qData.step && qData.step.answer !== undefined) {
        const min = qData.step.input ? qData.step.input.min : qData.step.min;
        const max = qData.step.input ? qData.step.input.max : qData.step.max;
        const answer = qData.step.answer;
        const slider = page.getByTestId('duel-chart-slider');
        const box = await slider.boundingBox();
        if (box && Number.isFinite(min) && Number.isFinite(max)) {
          const fraction = Math.min(1, Math.max(0, (answer - min) / (max - min)));
          await page.mouse.click(Math.round(box.x + fraction * box.width), Math.round(box.y + box.height / 2));
          await page.waitForTimeout(150);
        }
      }
      await page.getByTestId('duel-chart-submit').click();

    } else if (stepType === 'quiz') {
      const correctIdx = qData && qData.step && qData.step.correctIndex !== undefined ? qData.step.correctIndex : 0;
      await page.getByTestId(`duel-option-${correctIdx}`).click();
    }

    const nextBtn = page.getByTestId('duel-next-question');
    await nextBtn.waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(400);
    await nextBtn.click();
    await page.waitForTimeout(400);
  }

  console.log('\n--- Step 4: Result & Level-Up Overlay timing ---');
  await page.getByTestId('duel-result').waitFor({ state: 'visible', timeout: 25000 });

  // CHECK 4: Level-up overlay timing at 0.3s, 1s, and 2s
  const overlay = page.getByTestId('level-up-overlay');
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(round2Dir, '09-level-up-0.3s.png') });
  console.log('Saved 09-level-up-0.3s.png');

  await page.waitForTimeout(700); // 300ms + 700ms = 1000ms (1.0s)
  await page.screenshot({ path: path.join(round2Dir, '10-level-up-1.0s.png') });
  console.log('Saved 10-level-up-1.0s.png');

  await page.waitForTimeout(1000); // 1.0s + 1.0s = 2.0s
  await page.screenshot({ path: path.join(round2Dir, '11-level-up-2.0s.png') });
  console.log('Saved 11-level-up-2.0s.png');

  // Dismiss level-up overlay(s)
  if (await overlay.isVisible().catch(() => false)) {
    console.log('Dismissing level-up overlay 1...');
    await overlay.click();
    await page.waitForTimeout(800);
    if (await overlay.isVisible().catch(() => false)) {
      console.log('Dismissing level-up overlay 2...');
      await page.waitForTimeout(1500);
      await overlay.click();
      await page.waitForTimeout(500);
    }
  }

  // Result screen screenshot (verify names 'First L.')
  await page.screenshot({ path: path.join(round2Dir, '12-result-view.png') });
  console.log('Saved 12-result-view.png');

  const youNameResult = await page.getByTestId('result-you-name').innerText().catch(() => 'N/A');
  const rivalNameResult = await page.getByTestId('result-rival-name').innerText().catch(() => 'N/A');
  console.log(`Result names: You="${youNameResult}", Rival="${rivalNameResult}"`);

  console.log('\n--- Step 5: Rankings Screen & Climb timing ---');
  const seeRankingsBtn = page.getByTestId('result-see-rankings');
  if (await seeRankingsBtn.isVisible()) {
    await seeRankingsBtn.click();
  } else {
    await page.getByTestId('result-back-lobby').click();
    await page.getByTestId('duel-open-rankings').click();
  }

  await page.getByTestId('screen-duel-rankings').waitFor({ state: 'visible', timeout: 15000 });

  // Capture immediately (0 ms)
  await page.screenshot({ path: path.join(round2Dir, '13-rankings-climb-0ms.png') });
  console.log('Saved 13-rankings-climb-0ms.png');

  // 600 ms
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(round2Dir, '14-rankings-climb-600ms.png') });
  console.log('Saved 14-rankings-climb-600ms.png');

  // 1500 ms (600 + 900 = 1500 ms)
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(round2Dir, '15-rankings-climb-1500ms.png') });
  console.log('Saved 15-rankings-climb-1500ms.png');

  // Top 3 medal cards
  await page.screenshot({ path: path.join(round2Dir, '16-rankings-medal-cards.png') });
  console.log('Saved 16-rankings-medal-cards.png');

  // Check rankings header copy
  const headerText = await page.locator('[data-testid="screen-duel-rankings"]').innerText();
  console.log('Rankings screen header text:\n', headerText.slice(0, 300));

  // Scroll down so your row goes off-screen
  console.log('Scrolling down to test sticky row...');
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(round2Dir, '17-rankings-sticky-scrolled.png') });
  console.log('Saved 17-rankings-sticky-scrolled.png');

  const stickyRowVisible = await page.getByTestId('rankings-pinned-me').isVisible().catch(() => false);
  console.log('Sticky row visible when scrolled:', stickyRowVisible);

  // Scroll back up to merge
  await page.mouse.wheel(0, -350);
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(round2Dir, '18-rankings-merged.png') });
  console.log('Saved 18-rankings-merged.png');

  // If sort or match was not met, play another quick session to guarantee both are captured!
  if (!capturedSort || !capturedMatch) {
    console.log(`Need additional session for sort (${capturedSort}) or match (${capturedMatch})...`);
    await page.getByTestId('rankings-back').click();
    await page.getByTestId('screen-duel').waitFor({ state: 'visible', timeout: 10000 });
    
    // Choose specific category: Tokyo for match & sort, or Berlin for sort
    // Deselect all, select Tokyo only
    for (const c of ['berlin']) {
      await page.getByTestId(`duel-category-${c}`).click();
      await page.waitForTimeout(200);
    }
    await page.getByTestId('duel-start-cta').click();

    for (let q = 0; q < 6; q++) {
      await page.getByTestId('duel-question').waitFor({ state: 'visible', timeout: 20000 });
      await page.waitForTimeout(400);

      const isSort = await page.getByTestId('duel-sort').isVisible().catch(() => false);
      const isMatch = await page.getByTestId('duel-match').isVisible().catch(() => false);
      const isQuiz = await page.getByTestId('duel-option-0').isVisible().catch(() => false);
      const isPredict = await page.getByTestId('duel-predict-slider').isVisible().catch(() => false);
      const isChart = await page.getByTestId('duel-chart-slider').isVisible().catch(() => false);

      const body = await page.getByTestId('duel-question').innerText();
      const qd = findQuestionData(body);

      if (isSort && !capturedSort) {
        capturedSort = true;
        console.log('Found SORT question in session 2!');
        await page.setViewportSize({ width: 360, height: 640 });
        await page.waitForTimeout(400);
        await page.screenshot({ path: path.join(round2Dir, '05-sort-360x640.png') });
        await page.setViewportSize({ width: 390, height: 844 });
        await page.waitForTimeout(400);
        await page.screenshot({ path: path.join(round2Dir, '06-sort-initial-hint.png') });

        if (qd && qd.step && Array.isArray(qd.step.items)) {
          for (let itemIdx = 0; itemIdx < qd.step.items.length; itemIdx++) {
            const itemObj = qd.step.items[itemIdx];
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
        }
        await page.waitForTimeout(400);
        await page.screenshot({ path: path.join(round2Dir, '07-sort-all-placed.png') });
        await page.getByTestId('duel-sort-submit').click();
      } else if (isMatch && !capturedMatch) {
        capturedMatch = true;
        console.log('Found MATCH question in session 2!');
        await page.setViewportSize({ width: 360, height: 640 });
        await page.waitForTimeout(400);
        await page.screenshot({ path: path.join(round2Dir, '01-match-360x640.png') });
        await page.setViewportSize({ width: 390, height: 844 });
        await page.waitForTimeout(400);
        await page.screenshot({ path: path.join(round2Dir, '02-match-initial.png') });

        const leftCount = await page.locator('[data-testid^="match-left-"]').count();
        const rightCount = await page.locator('[data-testid^="match-right-"]').count();
        const pts = [];
        for (let l = 0; l < leftCount; l++) {
          const lt = (await page.getByTestId(`match-left-${l}`).innerText()).trim().toLowerCase();
          let mrt = null;
          if (qd && qd.step && qd.step.pairs) {
            for (const [ls, rs] of qd.step.pairs) {
              if (ls.trim().toLowerCase() === lt) { mrt = rs.trim().toLowerCase(); break; }
            }
          }
          let ridx = -1;
          for (let r = 0; r < rightCount; r++) {
            const rt = (await page.getByTestId(`match-right-${r}`).innerText()).trim().toLowerCase();
            if (mrt && rt === mrt) { ridx = r; break; }
          }
          if (ridx === -1) ridx = l;
          pts.push({ l, r: ridx });
        }

        for (let i = 0; i < 2 && i < pts.length; i++) {
          await page.getByTestId(`match-left-${pts[i].l}`).click();
          await page.waitForTimeout(150);
          await page.getByTestId(`match-right-${pts[i].r}`).click();
          await page.waitForTimeout(150);
        }
        await page.waitForTimeout(300);
        await page.screenshot({ path: path.join(round2Dir, '03-match-2-pairs.png') });

        for (let i = 2; i < pts.length; i++) {
          await page.getByTestId(`match-left-${pts[i].l}`).click();
          await page.waitForTimeout(150);
          await page.getByTestId(`match-right-${pts[i].r}`).click();
          await page.waitForTimeout(150);
        }
        await page.waitForTimeout(400);
        await page.screenshot({ path: path.join(round2Dir, '04-match-4-pairs.png') });
        await page.getByTestId('duel-match-submit').click();
      } else {
        // Quick answer
        if (isQuiz) await page.getByTestId('duel-option-0').click();
        else if (isPredict) await page.getByTestId('duel-predict-submit').click();
        else if (isChart) await page.getByTestId('duel-chart-submit').click();
        else if (isSort) {
          const ls = page.locator('[data-testid^="duel-sort-left-"]');
          while ((await ls.count()) > 0) { await ls.first().click(); await page.waitForTimeout(50); }
          await page.getByTestId('duel-sort-submit').click();
        } else if (isMatch) {
          const lc = await page.locator('[data-testid^="match-left-"]').count();
          for (let i = 0; i < lc; i++) {
            await page.getByTestId(`match-left-${i}`).click();
            await page.getByTestId(`match-right-${i}`).click();
          }
          await page.getByTestId('duel-match-submit').click();
        }
      }

      const nextBtn = page.getByTestId('duel-next-question');
      await nextBtn.waitFor({ state: 'visible', timeout: 15000 });
      await nextBtn.click();
      await page.waitForTimeout(300);
    }
  }

  await browser.close();
  console.log('\n=== ROUND 2 QA PASS COMPLETE ===');
}

run().catch(err => {
  console.error('Fatal QA error:', err);
  process.exit(1);
});
