// Jednorázová zkouška, které zdroje ukazují program kina.
const { chromium } = require('playwright');
const URLS = [
  'https://kinomaniak.cz/program-kin/praha/dnes/seznam',
  'https://kinomaniak.cz/program-kin/praha',
  'https://www.kinokinokino.cz/',
  'https://www.moviezone.cz/kina',
  'https://www.programprazskychkin.cz/kina/20-modransky-biograf-praha?date=tyden',
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
      console.log('MODRANY:', lines.filter((l) => /Mod[řr]an/i.test(l)).slice(0, 10).join(' | '));
      console.log('LINKS:', JSON.stringify(await page.$$eval('a', (a) => a.filter((x) => /mod[rř]an/i.test(x.href + x.innerText)).map((x) => x.href).slice(0, 10))));
      console.log(lines.slice(0, 40).join(' | ').slice(0, 900));
    } catch (e) { console.log('ERROR', e.message.slice(0, 200)); }
  }
  await browser.close();
})();
