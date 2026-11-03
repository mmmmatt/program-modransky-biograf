const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ locale: 'cs-CZ', timezoneId: 'Europe/Prague' });
  const reqs = [];
  page.on('response', (r) => { const t = r.request().resourceType(); if (['xhr', 'fetch'].includes(t)) reqs.push(`${r.status()} ${r.url().slice(0, 160)} ${r.headers()['content-type'] || ''}`); });
  await page.goto('https://kinokinokino.cz/', { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);
  console.log('REQS', reqs.slice(0, 20).join('\n'));
  const lines = (await page.evaluate(() => document.body.innerText)).split('\n').map((s) => s.trim()).filter(Boolean);
  console.log('LINES', lines.length);
  console.log(lines.slice(25, 60).join(' | '));
  lines.forEach((l, i) => { if (/Modřansk/.test(l)) console.log('M', lines.slice(i - 3, i + 3).join(' | ')); });
  console.log('HTML', await page.evaluate(() => { const a = [...document.querySelectorAll('a[href*="modranskybiograf.cz/akce"]')][0]; let p = a; for (let i = 0; i < 3 && p.parentElement; i++) p = p.parentElement; return p.outerHTML.slice(0, 1800); }));
  const dayButtons = await page.evaluate(() => [...document.querySelectorAll('button,a')].filter((b) => /^(po|út|st|čt|pá|so|ne)\s*\d+$/i.test(b.innerText.trim().replace(/\s+/g, ' '))).slice(0, 3).map((b) => b.outerHTML.slice(0, 300)));
  console.log('DAYBTN', dayButtons.join('\n'));
  await browser.close();
})();
