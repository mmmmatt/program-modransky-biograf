const assert = require('assert');
const { buildProgram } = require('./fetch-program');
const base = { movie_name: 'Film', categories: '', price: '', link: 'x' };
const result = buildProgram([
  { ...base, program_day: '04-11-2026', show_time: '20:00', location: 'Modřanský biograf' },
  { ...base, program_day: '04-11-2026', show_time: '17:30', location: 'Modřanský biograf', movieDetails: { url: 'c' } },
  { ...base, program_day: '03-11-2026', show_time: '18:00', location: 'Modřanský biograf' },
  { ...base, program_day: '03-11-2026', show_time: '18:00', location: 'Lucerna' },
], 'T');
assert.deepStrictEqual(result.days.map((d) => d.date), ['2026-11-03', '2026-11-04']);
assert.deepStrictEqual(result.days[1].screenings.map((s) => s.time), ['17:30', '20:00']);
assert.strictEqual(result.days[1].screenings[0].csfd, 'c');
assert.strictEqual(result.days[0].screenings.length, 1);
console.log('Testy prošly.');
const { parseEvents } = require('./fetch-kc12');
assert.deepStrictEqual(parseEvents('MENU\n24.11.2026\nSylvie 19:00\nVSTUPENKY\n10.11.2026\nRecitál Kláry 19:00\nVyprodáno\n01.01.2027\nBez času'), [
  { date: '2026-11-24', time: '19:00', title: 'Sylvie', status: 'VSTUPENKY' },
  { date: '2026-11-10', time: '19:00', title: 'Recitál Kláry', status: 'Vyprodáno' },
]);
console.log('Test KC12 prošel.');
const { eventLinks, listUrl } = require('./fetch-hilsky');
assert.deepStrictEqual(eventLinks('<a href="/cz/akce/shakespearovi-klauni-sasci/3842">x</a><a href="/cz/akce/shakespearovi-klauni-sasci/3842">y</a><a href="/cz/akce/vsechny-akce?page=1">z</a>'), ['https://www.mlp.cz/cz/akce/shakespearovi-klauni-sasci/3842']);
assert.ok(listUrl('2026-11-09', '2026-12-19', 2).includes('page=2'));
console.log('Test MKP prošel.');
