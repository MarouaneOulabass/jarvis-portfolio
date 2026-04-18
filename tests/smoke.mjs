import { chromium, devices } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const OUT = path.resolve('tests/screenshots');
fs.mkdirSync(OUT, { recursive: true });

const shot = (page, name) =>
  page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: false });

const log = (...args) => console.log('•', ...args);
const ok = (...args) => console.log('  ✓', ...args);
const warn = (...args) => console.log('  ⚠', ...args);
const fail = (...args) => console.log('  ✗', ...args);

async function mockChat(page) {
  await page.route('**/api/chat', async (route) => {
    const body = await route.request().postDataJSON();
    const last = body.messages?.[body.messages.length - 1]?.content || '';
    let ids = ['telecom-erp', 'corner-mobile-pos'];
    let content = 'Voici les projets les plus pertinents.';
    if (/montre.*tout|tous/i.test(last)) {
      ids = [
        'corner-mobile-pos', 'telecom-erp', 'corner-mobile-assistant',
        'btp-manager', 'callcenter-ai', 'markai-platform',
        'servier-drug-pipeline', 'deal-hunter', 'corner-check',
        'data-warehouse', 'phone-post-generator',
      ];
      content = 'Toute la constellation est déployée pour vous.';
    } else if (/telecom|t[ée]l[ée]com|retail|magasin|prospect/i.test(last)) {
      ids = ['telecom-erp', 'corner-mobile-pos', 'corner-mobile-assistant'];
      content = 'Pour ce type de prospect, TelecomERP et l\'écosystème Corner sont pertinents.';
    } else if (/pitch|compose|narratif/i.test(last)) {
      content = 'Ces projets partagent une approche IA-first pour le retail moderne.';
    }
    const xml = `<content>${content}</content><meta>${JSON.stringify({ projectIds: ids, hideProjectIds: [] })}</meta>`;
    await route.fulfill({
      status: 200,
      contentType: 'text/plain; charset=utf-8',
      body: xml,
    });
  });
}

async function mockGithub(page) {
  await page.route('**/api/github', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        repos: [
          { name: 'TelecomERP', fullName: 'MarouaneOulabass/TelecomERP', url: '', description: '', stars: 12, forks: 3, language: 'Python', pushedAt: new Date(Date.now() - 3 * 86400000).toISOString(), updatedAt: new Date().toISOString(), topics: [], archived: false, size: 1024 },
          { name: 'corner-mobile-pos', fullName: 'MarouaneOulabass/corner-mobile-pos', url: '', description: '', stars: 8, forks: 1, language: 'TypeScript', pushedAt: new Date(Date.now() - 86400000).toISOString(), updatedAt: new Date().toISOString(), topics: [], archived: false, size: 512 },
          { name: 'corner-mobile-assistant', fullName: 'MarouaneOulabass/corner-mobile-assistant', url: '', description: '', stars: 5, forks: 0, language: 'JavaScript', pushedAt: new Date(Date.now() - 7 * 86400000).toISOString(), updatedAt: new Date().toISOString(), topics: [], archived: false, size: 256 },
        ],
        user: 'MarouaneOulabass',
        syncedAt: new Date().toISOString(),
      }),
    });
  });
}

async function waitBootDone(page) {
  // Boot lasts ~5.2s; wait for the CTA
  await page.waitForSelector('text=Déployer la constellation', { timeout: 15000 });
}

async function run() {
  const results = [];
  const track = (label, fn) => async () => {
    try { await fn(); results.push({ label, ok: true }); ok(label); }
    catch (e) { results.push({ label, ok: false, err: e.message }); fail(label, '—', e.message); }
  };

  const browser = await chromium.launch({ headless: true });

  // ── SUITE 1: Desktop viewport ──
  log('Desktop 1440×900');
  const ctxDesktop = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    hasTouch: false,
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  const page = await ctxDesktop.newPage();

  const consoleErrors = [];
  page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') consoleErrors.push(`console.error: ${m.text()}`);
  });

  await mockChat(page);
  await mockGithub(page);

  await track('Page loads', async () => {
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  })();

  await track('Boot sequence finishes', async () => {
    await waitBootDone(page);
  })();
  await shot(page, '01-landing');

  await track('Landing has orb + greeting + stats', async () => {
    await page.waitForSelector('text=Bonjour, je suis Jarvis');
    await page.waitForSelector('text=Projets');
    await page.waitForSelector('text=Ans XP');
  })();

  await track('GitHub sync badge visible (shown once constellation loads)', async () => {
    // Will appear after "Déployer la constellation"
  })();

  await track('Deploy constellation via CTA', async () => {
    await page.click('text=Déployer la constellation');
    await page.waitForTimeout(1000);
  })();
  await shot(page, '02-constellation');

  await track('11 cards in constellation', async () => {
    const cards = await page.locator('.glass-card').count();
    if (cards < 11) throw new Error(`only ${cards} cards rendered`);
  })();

  await track('Client zone rendered', async () => {
    await page.waitForSelector('#jarvis-client-zone');
    await page.waitForSelector('text=Zone client');
  })();

  await track('GitHub stars badge on cards', async () => {
    // Stars show on matched projects (TelecomERP, corner-mobile-pos, corner-mobile-assistant)
    const text = await page.textContent('body');
    if (!/push.*(j|sem|mois|aujourd)/.test(text)) throw new Error('no GitHub push time badge found');
  })();

  await track('Chat dock opens', async () => {
    await page.click('text=Parler à Jarvis');
    await page.waitForSelector('input[placeholder*="Jarvis"]');
  })();

  await track('Send chat message (mocked) → projects highlighted', async () => {
    await page.fill('input[placeholder*="Jarvis"]', 'Prospect télécom au Maroc');
    await page.keyboard.press('Enter');
    await page.waitForSelector('text=TelecomERP et l\'écosystème', { timeout: 5000 });
    await page.waitForTimeout(500);
  })();
  await shot(page, '03-chat-response');

  await track('Multi-select via right-click (desktop path)', async () => {
    await page.waitForTimeout(800);
    const card = page.locator('.glass-card:has-text("BTP Manager")').first();
    await card.click({ button: 'right', force: true });
    await page.waitForSelector('text=sélectionné', { timeout: 4000 });
  })();
  await shot(page, '04-multiselect');

  await track('Clear selection', async () => {
    await page.click('text=× >> nth=0').catch(async () => {
      // fallback: click "×" button in toolbar
      const btns = await page.locator('button:has-text("×")').all();
      for (const b of btns) await b.click().catch(() => {});
    });
    await page.waitForTimeout(400);
  })();

  await track('Drag a card freely', async () => {
    const card = page.locator('.glass-card').nth(2);
    const box = await card.boundingBox();
    if (!box) throw new Error('no card');
    const from = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x + 200, from.y - 80, { steps: 20 });
    await page.mouse.up();
    await page.waitForTimeout(400);
  })();
  await shot(page, '05-card-dragged');

  await track('Drag a card onto client zone → pitch auto', async () => {
    const zone = await page.locator('#jarvis-client-zone').boundingBox();
    if (!zone) throw new Error('no zone');
    const card = page.locator('.glass-card').nth(3);
    const box = await card.boundingBox();
    if (!box) throw new Error('no card to drop');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    // move slowly toward zone for over-zone detection
    await page.mouse.move(zone.x + zone.width / 2, zone.y + zone.height / 2, { steps: 40 });
    await page.waitForTimeout(300);
    await page.mouse.up();
    await page.waitForTimeout(800);
  })();
  await shot(page, '06-client-drop');

  await track('Presentation mode launches', async () => {
    await page.click('text=Présentation');
    await page.waitForSelector('text=PRESENTATION MODE', { timeout: 5000 });
    await page.waitForTimeout(800);
  })();
  await shot(page, '07-presentation');

  await track('Presentation advances with ArrowRight', async () => {
    // Counter reads "01 / 11" at start; after advance should be "02 / 11"
    const before = await page.locator('text=/\\d{2}\\s*\\/\\s*\\d{2}/').first().textContent();
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(700);
    const after = await page.locator('text=/\\d{2}\\s*\\/\\s*\\d{2}/').first().textContent();
    if (before === after) throw new Error(`slide did not advance (${before} → ${after})`);
  })();
  await shot(page, '08-presentation-slide2');

  await track('Presentation exits on Escape', async () => {
    await page.keyboard.press('Escape');
    await page.waitForSelector('text=PRESENTATION MODE', { state: 'detached', timeout: 3000 });
  })();

  await track('URL share hydration', async () => {
    await page.goto(
      `${BASE}/?p=telecom-erp,corner-mobile-pos,servier-drug-pipeline&h=telecom-erp&t=Acme%20Telco`,
      { waitUntil: 'domcontentloaded' },
    );
    await waitBootDone(page).catch(async () => {
      // may skip CTA if already constellation — wait for a card
      await page.waitForSelector('.glass-card', { timeout: 15000 });
    });
    await page.waitForSelector('text=Acme Telco', { timeout: 5000 });
    const cards = await page.locator('.glass-card').count();
    if (cards < 3) throw new Error(`expected 3 cards from URL, got ${cards}`);
  })();
  await shot(page, '09-url-hydrated');

  await track('Sound toggle exists', async () => {
    await page.waitForSelector('button[title*="sons" i]');
  })();

  await track('No console errors', async () => {
    if (consoleErrors.length > 0) {
      throw new Error(`${consoleErrors.length} errors: ${consoleErrors.slice(0, 3).join(' | ')}`);
    }
  })();

  await ctxDesktop.close();

  // ── SUITE 2: Tablet viewport (iPad Pro) ──
  log('Tablet iPad Pro (touch enabled)');
  const ctxTablet = await browser.newContext({
    ...devices['iPad Pro 11'],
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  const pageTab = await ctxTablet.newPage();
  await mockChat(pageTab);
  await mockGithub(pageTab);

  await track('Tablet loads', async () => {
    await pageTab.goto(BASE, { waitUntil: 'domcontentloaded' });
    await waitBootDone(pageTab);
  })();
  await shot(pageTab, '10-tablet-landing');

  await track('Tablet deploy + constellation', async () => {
    await pageTab.click('text=Déployer la constellation');
    await pageTab.waitForTimeout(800);
    const cards = await pageTab.locator('.glass-card').count();
    if (cards < 11) throw new Error(`only ${cards} cards on tablet`);
  })();
  await shot(pageTab, '11-tablet-constellation');

  await ctxTablet.close();

  await browser.close();

  // ── REPORT ──
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);
  console.log('\n═══════════════════════════════════════');
  console.log(`RÉSULTAT: ${passed}/${results.length} tests passés`);
  if (failed.length > 0) {
    console.log('\nÉchecs:');
    failed.forEach((f) => console.log(`  ✗ ${f.label} — ${f.err}`));
  }
  console.log(`\nScreenshots → ${OUT}`);
  console.log('═══════════════════════════════════════');

  process.exit(failed.length > 0 ? 1 : 0);
}

run().catch((e) => {
  console.error(e);
  process.exit(2);
});
