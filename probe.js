// Jednorázová zkouška, které zdroje ukazují program kina.
const { chromium } = require('playwright');
const URLS = [
  'https://www.kinobox.cz/kino_program/praha/100-modransky-biograf',
  'https://kulturnimapa.cz/kina/program-kina-modransky-biograf.html?id=97&na=tyden',
  'https://kinomaniak.cz/program-kin/praha/dnes/seznam',
  'https://www.programprazskychkin.cz/kina/20-modransky-biograf-praha',
  'https://goout.net/en/modrany-biograf/vznrf/events/',
];
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ locale: 'cs-CZ', timezoneId: 'Europe/Prague' });
  for (const url of URLS) {
    console.log('\n=== ' + url);
    try {
      const robots = await (await fetch(new URL('/robots.txt', url))).text();
      console.log('ROBOTS:', robots.slice(0, 500).replace(/\n/g, ' | '));
      const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(6000);
      const text = await page.evaluate(() => document.body.innerText);
      const lines = text.split('\n').map((s) => s.trim()).filter(Boolean);
      const idx = lines.findIndex((l) => /^\d{1,2}:\d{2}/.test(l));
      console.log('STATUS', res.status(), 'TITLE', await page.title(), 'LINES', lines.length);
      console.log(lines.slice(Math.max(0, idx - 12), Math.max(0, idx - 12) + 60).join(' | ').slice(0, 2500));
    } catch (e) { console.log('ERROR', e.message.slice(0, 200)); }
  }
  await browser.close();
})();
