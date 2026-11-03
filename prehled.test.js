const assert = require('assert');
const p = require('./prehled');

const base = 'https://www.ddmm.cz/akce';
const ddmHtml = `<html><head><title>x</title></head><body><script>var a='<a href="/akce/1-x">n</a>';</script>
<a href="/akce/11733-duhove"><img src="a.jpg"><span>Duhové bubliny - nedělní představení 08.11.</span></a>
<h3><a href="/akce/11733-duhove">Duhové bubliny - nedělní představení</a></h3>
<ul><li>Věk 3-99</li><li>DDM Herrmannova</li><li>08.11.2026 - 08.11.2026</li></ul>
<p>Legendární představení Václava&nbsp;Strassera, které není založeno na slově. Druhá věta textu je tady.</p>
<a href="/akce/11875-jogove">Jógové dobrodružství 07.11.</a>
<ul><li>Věk 6-12</li><li>DDM Herrmannova</li><li>07.11.2026 - 07.11.2026</li><li>100 Kč</li></ul>
<p>Jedno malé světýlko se ztratilo a bez něj začínají mizet hvězdy.</p>
<a href="/akce/11731-ms">Divadelní svět pro MŠ Jahůdka 09.11.</a>
<ul><li>Věk 3-6</li><li>DDM Herrmannova</li><li>09.11.2026 - 09.11.2026</li></ul><p>Pohádka pro školku, která je jen pro jednu školku v okolí.</p>
<a href="/akce/11862-turnaj">Turnaj 07.11.</a><ul><li>Věk 8-13</li><li>Hamr - Bráník</li><li>07.11.2026 - 07.11.2026</li></ul>
<a href="/akce/11768-klub">Klub akcí a her 01.09.</a><ul><li>Věk 6-18</li><li>DDM Urbánkova</li><li>01.09.2026 - 31.08.2027</li></ul>
<a href="/akce/11885-ceramic">Ceramic workshop 07.11.</a><ul><li>Věk 20-99</li><li>DDM Herrmannova</li><li>07.11.2026 - 07.11.2026</li><li>250 Kč</li></ul><p>A 2-hour English-language workshop tailored for PBIS staff, for them only.</p>
</body></html>`;
const ddm = p.parseDdmList(p.htmlToText(ddmHtml, base));
assert.strictEqual(ddm.length, 6);
assert.deepStrictEqual(ddm.filter(p.isPublicDdm).map((e) => e.id), ['11733', '11875']);
assert.strictEqual(ddm[1].price, '100 Kč');
assert.strictEqual(ddm[0].link, 'https://www.ddmm.cz/akce/11733-duhove');
assert.strictEqual(ddm[0].title, 'Duhové bubliny - nedělní představení');

assert.deepStrictEqual(p.parseDdmDetail('Termín konání\n07.11.2026 10:00 - 12:00\nMísto konání\nDDM Herrmannova\nÚčast na akci\n100 Kč'), { time: '10:00', timeEnd: '12:00', price: '100 Kč' });

const cikorka = p.parseCikorka('Vstupné:\nDěti - 80,-Kč\nDospělí - 100,-Kč\nListopad 2026\n8.11. Duhové bubliny\nLegendární představení vynikajícího mima a klauna, které baví.\n15.11. Nehrajeme\nLeden 2027\n10.1. Pošťácká - Petr Liška\nByli jste někdy na staré poště v noci a víte, co se stane?\nTěšíme se na Vás.', '2026-11-03');
assert.strictEqual(cikorka.price, 'děti 80 Kč, dospělí 100 Kč');
assert.deepStrictEqual(cikorka.entries.map((e) => e.date), ['2026-11-08', '2026-11-15', '2027-01-10']);
assert.ok(cikorka.entries[0].desc.startsWith('Legendární'));

const sylvie = p.parseKc12Event({ date: '2026-11-24', time: '19:00', title: 'Sylvie', status: 'VSTUPENKY', link: 'https://t/s',
  detail: 'Sylvie / KC | Začátek: 24.11.2026 19:00 | Místo: Kulturní centrum 12 (Jordana Jovkova) Praha | Netradiční romantická komedie o tom, že láska je jen jedna. | Režie: Martin Vokoun | 1 do košíku: 490.0 CZK Dos' });
assert.strictEqual(sylvie.theatre, true);
assert.strictEqual(sylvie.place, 'Kulturní centrum 12 (Jordana Jovkova)');
assert.strictEqual(sylvie.price, 'dospělí 490 Kč');
const nerez = p.parseKc12Event({ date: '2026-11-20', time: '19:00', title: 'Neřež Trio', status: 'VSTUPENKY',
  detail: 'Neřež | Místo: Kulturní centrum 12 (Pertoldova) Praha | Legendární hudební dvojice vystoupí v sestavě Neřež Trio. | 1 do košíku: 350.0 CZK Dospělý: [Regular] | 1 do košíku: 300.0 CZK Senior: [Regular]' });
assert.strictEqual(nerez.theatre, false);
assert.strictEqual(nerez.price, 'dospělí 350 Kč, senioři 300 Kč');
assert.strictEqual(p.parseKc12Event({ date: '2026-11-10', title: 'Recitál', status: 'Vyprodáno' }).soldOut, true);

const kudy = p.parseKudyDetail('# Kluziště\nZpříjemněte si zimní čas a přijďte si zabruslit na veřejné kluziště. Bruslit se zde bude od 21. 11. 2026 do 28. 2. 2027.\n21. 11. 2026 – 28. 2. 2027\nMísto a mapa\nPraha 12\nSofijské náměstí, 143 00 [Praha 12](https://x)\nCena 80 Kč');
assert.deepStrictEqual([kudy.date, kudy.endDate, kudy.price, kudy.inPraha12], ['2026-11-21', '2027-02-28', '80 Kč', true]);
assert.strictEqual(p.parseKudyDetail('# X\nBez data'), null);

const komurkaText = `# Lampionový průvod Komořany
Průvod Komořany se bude konat v sobotu 14. listopadu od 17 hodin. Začátek na rohu ulice Na Komořsku 17 a 18 (Modřanský Háj) a dál po trase. Průvod zakončíme fotkou.
# Lampionový průvod Komořany
Průvod Komořany se bude konat v sobotu 8. listopadu od 17 hodin. Starý ročník.
# Mikuláš v Komůrce
Besídka se bude konat 5. 12. od 17:00 na zahradě.`;
const komurka = p.parseKomurka(komurkaText, '2026-11-03');
assert.strictEqual(komurka.length, 1);
assert.deepStrictEqual([komurka[0].date, komurka[0].time, komurka[0].kids], ['2026-11-14', '17:00', true]);

// Celý přehled: okna 7 a 30 dní, escapování, prázdný den, varování a chybějící zdroj.
const report = p.assemble({
  today: '2026-11-03',
  program: { generated_at: '2026-10-20T04:00:00Z', days: [
    { date: '2026-11-07', screenings: [{ time: '13:00', title: 'Pat a Mat: Zpátky na venkově', link: 'https://k/1' }, { time: '20:00', title: 'Film <b>', link: 'javascript:x' }] },
    { date: '2026-11-16', screenings: [{ time: '18:00', title: 'PŘEDPREMIÉRA Něčeho', link: 'https://k/2' }] },
    { date: '2026-12-16', screenings: [{ time: '18:00', title: 'PŘEDPREMIÉRA Pozdní', link: 'https://k/3' }] },
  ] },
  kc12: { generated_at: '2026-11-03T04:00:00Z', events: [
    { date: '2026-10-27', time: '19:00', title: 'Proběhlé komedie', status: 'Již proběhlo', detail: 'komedie' },
    { date: '2026-11-24', time: '19:00', title: 'Sylvie', status: 'VSTUPENKY', link: 'https://t/s', detail: 'Sylvie | Místo: KC12 Praha | Netradiční romantická komedie o tom, že láska je jen jedna. | Režie: X' },
    { date: '2026-11-20', time: '19:00', title: 'Neřež Trio', status: 'VSTUPENKY', link: 'https://t/n', detail: 'N | Místo: KC12 Praha | Legendární hudební dvojice vystoupí v sestavě Neřež Trio.' },
    { date: '2027-01-12', time: '19:00', title: 'Urna', status: 'VSTUPENKY', detail: 'U | Místo: KC12 Praha | Režie: Y a další text je tady.' },
  ] },
  ddm,
  ddmDetails: { 11733: { time: '15:00', timeEnd: '16:00', price: '' }, 11875: { time: '10:00', timeEnd: '12:00', price: '100 Kč' } },
  cikorka: { entries: cikorka.entries, price: cikorka.price },
  kudy: [{ date: '2026-11-20', title: 'Neřež Trio v Kudy', place: 'x', link: 'https://kz/n', price: '', desc: '', kids: false }],
  komurka,
  failed: ['Kudy z nudy'],
});
assert.strictEqual(report.days.length, 7);
assert.deepStrictEqual(report.theatre.map((e) => e.title), ['Duhové bubliny', 'Sylvie']);
assert.deepStrictEqual(report.weekOthers.map((e) => e.title), ['Jógové dobrodružství']);
assert.deepStrictEqual(report.plan.map((e) => e.title), ['Lampionový průvod Komořany', 'PŘEDPREMIÉRA Něčeho', 'Neřež Trio']);
assert.strictEqual(report.warnings.length, 1);
const out = p.render(report);
assert.strictEqual(out.subject, 'Kulturní akce Praha 12: týden od 3. 11. 2026');
assert.ok(out.html.includes('Film &lt;b&gt;') && !out.html.includes('javascript:'));
assert.ok(out.text.includes('Sobota 7. 11.\n- 13:00 Pat a Mat: Zpátky na venkově – pro děti'));
assert.ok(out.text.includes('Pondělí 9. 11.\nV datech žádné promítání není.'));
assert.ok(out.text.includes('Nepodařilo se načíst: Kudy z nudy.'));

const empty = p.render(p.assemble({ today: '2026-11-03', program: null, kc12: { generated_at: '2026-11-03T04:00:00Z', events: [{ date: '2027-01-12', time: '19:00', title: 'Urna', status: 'VSTUPENKY', detail: 'U | Místo: KC12 Praha | Komedie, která se hraje na jevišti.' }] }, ddm: null, ddmDetails: {}, cikorka: { entries: [], price: '' }, kudy: null, komurka: null, failed: [] }));
assert.ok(empty.text.includes('žádné divadlo nenašel. Nejbližší představení z dat KC12:'));
assert.ok(empty.text.includes('Úterý 12. 1.') && empty.text.includes('žádnou další akci nenašel'));
console.log('Testy přehledu prošly.');
