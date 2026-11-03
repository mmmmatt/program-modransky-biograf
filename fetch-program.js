// Vybere program Modřanského biografu z veřejných dat kinokinokino.cz a uloží ho do program.json.
const fs = require('fs');

const SOURCE = 'https://www.kinokinokino.cz/data/praha/data.json';

function buildProgram(records, generatedAt) {
  const byDate = new Map();
  for (const record of records) {
    if (!/Modřansk/i.test(record.location || '')) continue;
    const [day, month, year] = record.program_day.split('-');
    const date = `${year}-${month}-${day}`;
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date).push({
      time: record.show_time,
      title: record.movie_name,
      categories: record.categories || '',
      price: record.price || '',
      link: record.link || '',
      csfd: record.movieDetails?.url || '',
    });
  }
  const days = [...byDate.keys()].sort().map((date) => ({
    date,
    screenings: byDate.get(date).sort((a, b) => a.time.localeCompare(b.time)),
  }));
  return { source: SOURCE, generated_at: generatedAt, days };
}

async function main() {
  const response = await fetch(SOURCE, { headers: { 'User-Agent': 'program-modransky-biograf (weekly)' } });
  if (!response.ok) throw new Error(`Zdroj vrátil HTTP ${response.status}`);
  const program = buildProgram(await response.json(), new Date().toISOString());
  const count = program.days.reduce((sum, day) => sum + day.screenings.length, 0);
  if (count === 0) throw new Error('V datech není žádné promítání Modřanského biografu.');
  fs.writeFileSync('program.json', JSON.stringify(program, null, 2) + '\n');
  console.log(`Uloženo ${count} promítání za ${program.days.length} dní.`);
  for (const day of program.days) console.log(day.date, day.screenings.map((s) => `${s.time} ${s.title} [${s.categories}]`).join(' | '));
}

if (require.main === module) main().catch((err) => { console.error(err); process.exit(1); });
module.exports = { buildProgram };
