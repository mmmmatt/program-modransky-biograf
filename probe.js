const { chromium } = require('playwright');
const URLS = ['https://www.ticketlive.cz/cs/event/kulturni-centrum-12'];
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ locale: 'cs-CZ', timezoneId: 'Europe/Prague' });
  for (const url of URLS) {
    console.log('\n=== ' + url);
    try {
      const rob = await fetch(new URL('/robots.txt', url)).then((r) => r.text()).catch((e) => 'ERR ' + e.message);
      console.log('ROBOTS', rob.slice(0, 300).replace(/\n/g, ' | '));
      const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(5000);
      const text = await page.evaluate(() => document.body.innerText);
      console.log('STATUS', res.status(), 'TITLE', await page.title(), 'LEN', text.length);
      console.log(text.replace(/\s*\n\s*/g, ' | ').slice(0, 3500));
      console.log('LINKS', JSON.stringify(await page.$$eval('a', (a) => a.filter((x) => /divadl|program|kalend|akce|kultur/i.test(x.href + x.innerText)).map((x) => x.href).filter((v, i, s) => s.indexOf(v) === i).slice(0, 20))));
    } catch (e) { console.log('ERROR', e.message.slice(0, 200)); }
  }
  await browser.close();
})();
