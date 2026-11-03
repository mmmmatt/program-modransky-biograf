// Stáhne program Modřanského biografu do program.json.
const fs = require('fs');
const { chromium } = require('playwright');

const BASE = process.env.CINEMA_URL || 'https://www.modranskybiograf.cz/';
const TAGS = new Set(['Dětské', 'Doporučené', 'Kino Senior']);
const TZ = 'Europe/Prague';

function parseDay(text) {
  const lines = text.split('\n').map((s) => s.trim()).filter(Boolean);
  const items = [];
  let prev = -1;
  lines.forEach((line, i) => {
    if (!/^\d{1,2}:\d{2}$/.test(line)) return;
    let sal = i - 1;
    while (sal > prev && lines[sal] !== 'Sál') sal--;
    if (sal <= prev || sal === 0) throw new Error(`Nerozpoznané promítání v ${line}`);
    const meta = lines.slice(sal + 1, i);
    items.push({
      time: line,
      title: lines[sal - 1],
      details: meta.filter((m) => !TAGS.has(m)).join(' • '),
      tags: meta.filter((m) => TAGS.has(m)),
    });
    prev = i;
  });
  return items;
}

function pragueToday() {
  const [y, m, d] = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date()).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function dateForTab(today, index, label) {
  const date = new Date(today.getTime() + index * 86400000);
  const match = label.match(/(\d{1,2})\. (\d{1,2})\./);
  if (match && (+match[1] !== date.getUTCDate() || +match[2] !== date.getUTCMonth() + 1)) {
    throw new Error(`Záložka „${label}“ neodpovídá datu ${date.toISOString().slice(0, 10)}`);
  }
  return date.toISOString().slice(0, 10);
}

async function scrape() {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ locale: 'cs-CZ', timezoneId: TZ });
    const open = async (index) => {
      await page.goto(`${BASE}?filterIndex=${index}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForSelector('a[href^="?filterIndex="]', { timeout: 30000 });
      await page.waitForFunction(() => document.querySelector('main')?.innerText.includes('NEJBLIŽŠÍ PROJEKCE'), null, { timeout: 30000 });
      await page.waitForTimeout(2000);
    };
    await open(0);
    const labels = await page.$$eval('a[href^="?filterIndex="]', (links) => links.map((a) => a.innerText.trim()));
    const lastLabel = labels[labels.length - 1];
    const today = pragueToday();
    const days = [];
    for (let i = 0; i < labels.length; i++) {
      if (i > 0) await open(i);
      const main = await page.$eval('main', (el) => el.innerText);
      const start = main.indexOf(lastLabel) + lastLabel.length;
      const end = main.indexOf('NEJBLIŽŠÍ PROJEKCE');
      days.push({ date: dateForTab(today, i, labels[i]), label: labels[i], screenings: parseDay(main.slice(start, end)) });
    }
    return days;
  } finally {
    await browser.close();
  }
}

async function main() {
  const days = await scrape();
  const count = days.reduce((sum, day) => sum + day.screenings.length, 0);
  if (count === 0) throw new Error('Nenalezeno žádné promítání, web se možná změnil.');
  const output = { source: BASE, generated_at: new Date().toISOString(), days };
  fs.writeFileSync(process.env.OUTPUT || 'program.json', JSON.stringify(output, null, 2) + '\n');
  console.log(`Uloženo ${count} promítání za ${days.length} dní.`);
}

if (require.main === module) main().catch((err) => { console.error(err); process.exit(1); });
module.exports = { parseDay, dateForTab };
