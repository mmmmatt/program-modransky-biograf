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
