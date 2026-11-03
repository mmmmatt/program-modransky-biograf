// Uloží akce Kulturního centra 12 z veřejné stránky prodejce TicketLIVE do kc12.json.
const fs = require('fs');

const SOURCE = 'https://www.ticketlive.cz/cs/event/kulturni-centrum-12';

function parseEvents(text) {
  const lines = text.split('\n').map((s) => s.trim()).filter(Boolean);
  const events = [];
  lines.forEach((line, i) => {
    const date = line.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    const title = (lines[i + 1] || '').match(/^(.+?)\s+(\d{1,2}:\d{2})$/);
    if (!date || !title) return;
    events.push({
      date: `${date[3]}-${date[2]}-${date[1]}`,
      time: title[2],
      title: title[1],
      status: lines[i + 2] || '',
    });
  });
  return events;
}

async function main() {
  const { chromium } = require('playwright');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ locale: 'cs-CZ', timezoneId: 'Europe/Prague' });
    await page.goto(SOURCE, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(4000);
    const events = parseEvents(await page.evaluate(() => document.body.innerText));
    if (events.length === 0) throw new Error('Na stránce TicketLIVE nebyla nalezena žádná akce.');
    const links = await page.$$eval('a', (anchors) => anchors.filter((a) => /VSTUPENKY/i.test(a.innerText)).map((a) => a.href));
    const open = events.filter((event) => /VSTUPENKY/i.test(event.status));
    open.forEach((event, i) => { event.link = links[i] || ''; });
    for (const event of open.slice(0, 12)) {
      if (!event.link) continue;
      await page.waitForTimeout(1500);
      await page.goto(event.link, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(2000);
      const detail = (await page.evaluate(() => document.body.innerText)).replace(/\s*\n\s*/g, ' | ');
      const start = detail.indexOf(event.title);
      event.detail = detail.slice(Math.max(0, start), Math.max(0, start) + 900);
    }
    fs.writeFileSync('kc12.json', JSON.stringify({ source: SOURCE, generated_at: new Date().toISOString(), events }, null, 2) + '\n');
    console.log(`Uloženo ${events.length} akcí.`);
    for (const event of events) console.log(event.date, event.time, event.title, '|', event.status, '|', (event.detail || '').slice(0, 500));
  } finally {
    await browser.close();
  }
}

if (require.main === module) main().catch((err) => { console.error(err); process.exit(1); });
module.exports = { parseEvents };
