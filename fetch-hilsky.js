// Najde přednášky Martina Hilského v akcích Městské knihovny v Praze na příštích 40 dní a uloží je do hilsky.json.
const fs = require('fs');

const BASE = 'https://www.mlp.cz/cz/akce/vsechny-akce';
const TYPES = ['14', '17', '19']; // Přednáška, Literatura, Setkání
const DAYS = 40;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function listUrl(from, to, page) {
  const p = new URLSearchParams();
  TYPES.forEach((t) => p.append('field_event_type_target_id[]', t));
  p.set('field_event_instance_time_range_value', from);
  p.set('field_event_instance_time_range_value_1', to);
  if (page) p.set('page', String(page));
  return `${BASE}?${p}`;
}

function eventLinks(html) {
  const links = [...html.matchAll(/href="(\/cz\/akce\/[a-z0-9-]+\/\d+)"/gi)].map((m) => `https://www.mlp.cz${m[1]}`);
  return [...new Set(links)];
}

function text(html) {
  return html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#039;/g, "'").replace(/&quot;/g, '"')
    .split('\n').map((s) => s.trim()).filter(Boolean).join(' | ');
}

async function get(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'program-modransky-biograf (weekly)' } });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.text();
}

async function main() {
  const day = (d) => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10);
  const from = day(0), to = day(DAYS);
  const links = new Set();
  for (let page = 0; page < 30; page++) {
    const html = await get(listUrl(from, to, page));
    const found = eventLinks(html);
    if (page === 0) console.log('Odkazů na první straně:', found.length);
    const before = links.size;
    found.forEach((l) => links.add(l));
    if (links.size === before) break;
    await sleep(1000);
  }
  console.log('Akcí ve výpisu:', links.size);
  if (links.size === 0) throw new Error('Výpis akcí MKP je prázdný, web se možná změnil.');
  const events = [];
  for (const url of links) {
    await sleep(700);
    const body = text(await get(url));
    if (!/Hilsk/i.test(body)) continue;
    const start = Math.max(0, body.search(/Přidat do kalendáře|Datum|\d{1,2}\. \d{1,2}\. 20\d\d/));
    events.push({ url, excerpt: body.slice(Math.max(0, start - 300), start + 1200) });
  }
  fs.writeFileSync('hilsky.json', JSON.stringify({ source: 'Městská knihovna v Praze', from, to, generated_at: new Date().toISOString(), checked: links.size, events }, null, 2) + '\n');
  console.log(`Prohledáno ${links.size} akcí, s Hilským ${events.length}.`);
  events.forEach((e) => console.log(e.url, '\n', e.excerpt.slice(0, 700)));
}

if (require.main === module) main().catch((err) => { console.error(err); process.exit(1); });
module.exports = { eventLinks, listUrl };
