const assert = require('assert');
const { parseDay, dateForTab } = require('../scrape');
const text = `
Pat a Mat: Zpátky na venkově

Sál

2D • Originální verze • Mládeži přístupné

Dětské
13:00
Rammstein – Live in Mexico City

Sál

Doporučené
Nevhodné pro nezletilé osoby do 12 let
20:00
Duna: Část třetí
Avengers: Doomsday
`;
assert.deepStrictEqual(parseDay(text), [
  { time: '13:00', title: 'Pat a Mat: Zpátky na venkově', details: '2D • Originální verze • Mládeži přístupné', tags: ['Dětské'] },
  { time: '20:00', title: 'Rammstein – Live in Mexico City', details: 'Nevhodné pro nezletilé osoby do 12 let', tags: ['Doporučené'] },
]);
assert.deepStrictEqual(parseDay('Duna\nAvengers'), []);
const today = new Date(Date.UTC(2026, 11, 30));
assert.strictEqual(dateForTab(today, 3, 'So 2. 1.'), '2027-01-02');
assert.throws(() => dateForTab(today, 3, 'So 3. 1.'));
console.log('Testy prošly.');
