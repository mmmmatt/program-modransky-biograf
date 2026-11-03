// Sestaví týdenní přehled kulturních akcí v Praze 12 a pošle ho e-mailem. Běží bez AI, jen z pevně daných zdrojů.
// Texty z webů se berou jen jako data: všechno se escapuje a příjemce je daný výhradně proměnnou prostředí.
const fs = require('fs');

const URLS = {
  ddmList: 'https://www.ddmm.cz/akce',
  cikorka: 'https://www.ddmm.cz/ostatni/388-divadlo-na-cikorce',
  kudy: 'https://www.kudyznudy.cz/kam-pojedete/hlavni-mesto-praha/praha-12',
  kudyKids: 'https://www.kudyznudy.cz/kalendar-akci/akce-pro-deti?mesto=547107',
  komurka: 'https://rckomurka.cz/akce/',
  kino: 'https://www.modranskybiograf.cz/',
  kc12: 'https://kc12.cz/kalendar-udalosti',
  praha12: 'https://www.praha12.cz/ap',
};
const KIDS_FILMS = ['Pat a Mat', 'Ovečka Shaun', 'Kocour v klobouku'];
const SPECIAL_SCREENING = /PŘEDPREMIÉRA|koncert|Live in|přenos/i;
const DDM_PLACES = {
  'DDM Herrmannova': 'DDM Modřany, Herrmannova 2016/24',
  'DDM Urbánkova': 'DDM Modřany, Urbánkova 3348/4',
};
const DDM_MINOR = /^(Herní odpoledne|Sportovní den v Klubu|Klub třetího věku)/;
const CIKORKA_PLACE = 'Divadlo Na Cikorce, DDM Modřany, Herrmannova 2016/24';
const WEEKDAYS = ['neděle', 'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota'];
const MONTHS = ['ledna', 'února', 'března', 'dubna', 'května', 'června', 'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'];
const HEADING_MONTHS = ['Leden', 'Únor', 'Březen', 'Duben', 'Květen', 'Červen', 'Červenec', 'Srpen', 'Září', 'Říjen', 'Listopad', 'Prosinec'];
const WEEKDAY_FORMS = { 'neděli': 0, 'pondělí': 1, 'úterý': 2, 'středu': 3, 'čtvrtek': 4, 'pátek': 5, 'sobotu': 6, 'sobota': 6, 'neděle': 0, 'středa': 3 };

// --- datumy (řetězce YYYY-MM-DD) ---
const pad = (n) => String(n).padStart(2, '0');
const iso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;
const utc = (date) => new Date(`${date}T00:00:00Z`);
const addDays = (date, n) => new Date(utc(date).getTime() + n * 86400000).toISOString().slice(0, 10);
const todayInPrague = (now = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Prague' }).format(now);
const short = (date) => `${utc(date).getUTCDate()}. ${utc(date).getUTCMonth() + 1}.`;
const dayLabel = (date) => { const w = WEEKDAYS[utc(date).getUTCDay()]; return `${w[0].toUpperCase()}${w.slice(1)} ${short(date)}`; };
const fromCzech = (s) => { const [d, m, y] = s.split('.').map((p) => p.trim()); return iso(y, Number(m), Number(d)); };

// --- text ---
const decode = (s) => s.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0*39;|&apos;/g, "'")
  .replace(/&ndash;/g, '–').replace(/&mdash;/g, '—').replace(/&hellip;/g, '…')
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&amp;/g, '&');
const escapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const stripLinks = (s) => s.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');

// Převede HTML na řádky: odkazy jako [text](url), nadpisy h1-h3 jako "# ", ostatní bloky na samostatné řádky.
function htmlToText(html, base) {
  let s = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style|head|noscript|svg)\b[\s\S]*?<\/\1>/gi, ' ');
  s = s.replace(/<a\b[^>]*?href\s*=\s*["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi, (_, href, inner) => {
    const label = inner.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!label) return ' ';
    let url = decode(href);
    try { url = new URL(url, base).href; } catch { return label; }
    return `[${label.replace(/[[\]]/g, '')}](${url})`;
  });
  s = s.replace(/<h[1-3]\b[^>]*>/gi, '\n# ').replace(/<\/h[1-3]>/gi, '\n');
  s = s.replace(/<(br|hr)\b[^>]*>/gi, '\n').replace(/<\/?(p|div|li|ul|ol|tr|table|section|article|h[4-6]|dt|dd|dl|header|footer|nav|main|aside)\b[^>]*>/gi, '\n');
  s = decode(s.replace(/<[^>]+>/g, ''));
  return s.split('\n').map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n');
}

function firstSentence(text, max = 220) {
  const clean = stripLinks(text).replace(/\s+/g, ' ').trim();
  const re = /[.!?…](?=\s+[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ])/g;
  let m;
  while ((m = re.exec(clean))) if (m.index >= 40) return clean.slice(0, m.index + 1);
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max).replace(/\s+\S*$/, '')}…`;
}

// --- parsery zdrojů (vstup: výstup htmlToText) ---
function parseDdmList(text) {
  const lines = text.split('\n');
  const events = new Map();
  let current = null;
  for (const line of lines) {
    const link = line.match(/\[([^\]]+)\]\((https?:\/\/[^)]*\/akce\/(\d+)-[^)]*)\)/);
    if (link) {
      if (!events.has(link[3])) events.set(link[3], { id: link[3], link: link[2], titles: [], lines: [] });
      current = events.get(link[3]);
      current.titles.push(link[1].replace(/\s*\d{1,2}\.\d{1,2}\.$/, '').trim());
      continue;
    }
    if (current) current.lines.push(line);
  }
  const result = [];
  for (const e of events.values()) {
    const body = e.lines.join('\n');
    const range = body.match(/(\d{2}\.\d{2}\.\d{4})\s*-\s*(\d{2}\.\d{2}\.\d{4})/);
    if (!range) continue;
    const age = body.match(/Věk\s*(\d+)\s*-\s*(\d+)/);
    const venue = body.match(/DDM Herrmannova|DDM Urbánkova|Hamr - Bráník|Mimo stálé objekty/);
    const after = body.slice(body.indexOf(range[0]) + range[0].length).split('\n').filter(Boolean);
    const priceLine = after.find((l, i) => i === 0 && /^-?\s*\d[\d ]*\s*Kč$/.test(l));
    const desc = after.find((l) => l.length > 40) || '';
    result.push({
      id: e.id,
      link: e.link,
      title: e.titles.sort((a, b) => b.length - a.length)[0],
      date: fromCzech(range[1]),
      endDate: fromCzech(range[2]),
      venue: venue ? venue[0] : '',
      ageFrom: age ? Number(age[1]) : null,
      ageTo: age ? Number(age[2]) : null,
      price: priceLine ? priceLine.replace(/^-?\s*/, '') : '',
      desc,
    });
  }
  return result;
}

// Veřejná akce v Praze 12 s konkrétním dnem: bez Bráníku, bez akcí mimo stálé objekty a bez akcí jen pro určitou skupinu.
function isPublicDdm(e) {
  if (e.date !== e.endDate || !DDM_PLACES[e.venue]) return false;
  if (/(^|[^\p{L}])(MŠ|ZŠ|ŠD|PBIS)($|[^\p{L}])/u.test(e.title) || /PBIS/.test(e.desc)) return false;
  return !/pouze pro/i.test(`${e.title} ${e.desc}`);
}

function parseDdmDetail(text) {
  const term = text.match(/Termín konání\s*(\d{2}\.\d{2}\.\d{4})\s+(\d{1,2}:\d{2})(?:\s*-\s*(\d{1,2}:\d{2}))?/);
  const price = text.match(/Účast na akci\s*(\d[\d ]*\s*Kč)/);
  return { time: term ? term[2] : '', timeEnd: term && term[3] ? term[3] : '', price: price ? price[1] : '' };
}

function parseCikorka(text, today) {
  const lines = text.split('\n');
  const entries = [];
  const prices = [];
  let year = null;
  let current = null;
  for (const line of lines) {
    const heading = line.match(/^(\S+)\s+(\d{4})$/);
    if (heading && HEADING_MONTHS.includes(heading[1])) { year = Number(heading[2]); current = null; continue; }
    const price = line.match(/^(Děti|Dospělí)\s*-\s*(\d+)/);
    if (price) { prices.push(`${price[1].toLowerCase()} ${price[2]} Kč`); continue; }
    const entry = line.match(/^(\d{1,2})\.(\d{1,2})\.\s+(\S.*)$/);
    if (entry) {
      const y = year || Number(today.slice(0, 4));
      current = { date: iso(y, Number(entry[2]), Number(entry[1])), title: entry[3].trim(), desc: '' };
      entries.push(current);
      continue;
    }
    if (/^Těšíme se/.test(line)) current = null;
    if (current && !current.desc && line.length > 40 && !line.startsWith('[')) current.desc = line;
  }
  return { entries, price: prices.join(', ') };
}

const THEATRE = /komedi|inscenac|činohr|divadeln|\bRežie\b|Scénář a režie|Dramaturgie/i;

function parseKc12Event(e) {
  const detail = e.detail || '';
  const parts = detail.split(' | ').map((p) => p.trim());
  const place = (detail.match(/Místo:\s*([^|]+?)\s*\|/) || [])[1] || '';
  const placeIdx = parts.findIndex((p) => p.startsWith('Místo:'));
  const descPart = parts.slice(placeIdx + 1).find((p) => p.length > 30 && !/^(Účinkuj|Kytara|Open door|Dostupné)/.test(p)) || '';
  const prices = [];
  for (const m of detail.matchAll(/(\d+)(?:\.\d+)?\s*CZK\s*(Dos|Sen)?/g)) {
    prices.push(`${m[2] === 'Sen' ? 'senioři' : m[2] === 'Dos' ? 'dospělí' : 'vstupné'} ${m[1]} Kč`);
  }
  const soldOut = /vyprodáno/i.test(e.status || '');
  return {
    date: e.date,
    time: e.time,
    title: e.title,
    place: place.replace(/\s+Praha$/, '') || 'Kulturní centrum 12 (přesné místo v datech není)',
    price: [...new Set(prices)].join(', '),
    desc: descPart,
    link: e.link || '',
    soldOut,
    theatre: THEATRE.test(detail),
  };
}

function parseKudyList(text) {
  const links = new Map();
  for (const m of text.matchAll(/\[([^\]]+)\]\((https:\/\/www\.kudyznudy\.cz\/akce\/[^)\s]+)/g)) links.set(m[2], m[1]);
  return [...links].map(([link, title]) => ({ link, title }));
}

function parseKudyDetail(text) {
  const lines = text.split('\n').map(stripLinks);
  const dateRe = /^(\d{1,2})\. ?(\d{1,2})\. ?(\d{4})(?:\s+(\d{1,2}:\d{2}))?(?:.*?[–-]\s*(\d{1,2})\. ?(\d{1,2})\. ?(\d{4}))?/;
  const dateLine = lines.map((l) => l.match(dateRe)).find(Boolean);
  if (!dateLine) return null;
  const mapIdx = lines.findIndex((l) => /^Místo a mapa/.test(l));
  const placeLines = mapIdx >= 0 ? lines.slice(mapIdx + 1, mapIdx + 4) : [];
  const place = placeLines.find((l) => /\d{3} ?\d{2}/.test(l)) || '';
  const price = lines.map((l) => l.match(/^Cena\s+(.+)$/)).find(Boolean);
  const titleIdx = lines.findIndex((l) => l.startsWith('# '));
  const desc = lines.slice(titleIdx + 1).find((l) => l.length > 60 && !l.startsWith('!') && !l.startsWith('|') && !l.startsWith('#')) || '';
  return {
    date: iso(dateLine[3], Number(dateLine[2]), Number(dateLine[1])),
    time: dateLine[4] || '',
    endDate: dateLine[7] ? iso(dateLine[7], Number(dateLine[6]), Number(dateLine[5])) : '',
    place,
    price: price ? price[1] : '',
    desc,
    inPraha12: /Praha 12/.test(place),
  };
}

// Stránka Komůrky nemá u akcí rok a drží i staré ročníky. Bereme jen akce v Komořanech, kde uvedený den v týdnu sedí na letošní datum.
function parseKomurka(text, today) {
  const sections = text.split(/^# /m).slice(1);
  const out = [];
  const seen = new Set();
  const year = Number(today.slice(0, 4));
  for (const section of sections) {
    const [title, ...rest] = section.split('\n');
    const body = stripLinks(rest.join(' '));
    if (!/Komořan/.test(`${title} ${body}`)) continue;
    const m = body.match(/\b(pondělí|úterý|středu|čtvrtek|pátek|sobotu|sobota|neděli)\s+(\d{1,2})\.\s*(ledna|února|března|dubna|května|června|července|srpna|září|října|listopadu|prosince)(?:\s+od\s+(\d{1,2})(?::(\d{2}))?\s*(?:hod|h\b)?)?/);
    if (!m) continue;
    const month = MONTHS.indexOf(m[3]) + 1;
    const candidates = [year, year + 1].map((y) => iso(y, month, Number(m[2])));
    const date = candidates.find((d) => d >= today);
    if (utc(date).getUTCDay() !== WEEKDAY_FORMS[m[1]] || seen.has(`${title}${date}`)) continue;
    seen.add(`${title}${date}`);
    const start = body.match(/Začátek\s+[^.]*\./);
    out.push({
      date,
      time: m[4] ? `${m[4]}:${m[5] || '00'}` : '',
      title: title.trim(),
      place: start ? start[0].replace(/^Začátek\s+/, 'Začátek ').replace(/\.$/, '') : 'Komořany',
      price: '',
      desc: firstSentence(body),
      link: URLS.komurka,
      kids: /průvod|Mikuláš|děti|dět/i.test(`${title} ${body}`),
      note: 'Stránka neuvádí rok, datum odpovídá uvedenému dni v týdnu.',
    });
  }
  return out;
}

// --- skládání přehledu ---
function assemble({ today, program, kc12, ddm, ddmDetails, cikorka, kudy, komurka, failed }) {
  const week = addDays(today, 6);
  const month = addDays(today, 30);
  const inWeek = (e) => e.date >= today && e.date <= week;
  const later = (e) => e.date > week && e.date <= month;

  const warnings = [];
  const stale = (label, data) => {
    if (!data) return;
    const age = (new Date(`${today}T12:00:00Z`) - new Date(data.generated_at)) / 86400000;
    if (!(age <= 3)) warnings.push(`Data ${label} jsou starší než 3 dny (${String(data.generated_at).slice(0, 10)}), údaje nemusí být aktuální.`);
  };
  stale('kina (program.json)', program);
  stale('KC12 (kc12.json)', kc12);

  const days = [];
  for (let i = 0; i < 7; i += 1) {
    const date = addDays(today, i);
    const day = (program?.days || []).find((d) => d.date === date);
    days.push({
      date,
      screenings: (day?.screenings || []).map((s) => ({ ...s, kids: KIDS_FILMS.some((f) => s.title.includes(f)) })),
    });
  }

  const usedDdm = new Set();
  const theatre = [];
  for (const entry of cikorka.entries) {
    if (entry.date < today || entry.date > month || /^Nehrajeme/i.test(entry.title)) continue;
    const sameDay = (ddm || []).filter((e) => e.date === entry.date && e.venue === 'DDM Herrmannova' && isPublicDdm(e));
    const match = sameDay.find((e) => /nedělní/i.test(e.title)) || sameDay[0];
    if (match) usedDdm.add(match.id);
    const detail = match ? ddmDetails[match.id] : null;
    theatre.push({
      date: entry.date,
      time: detail?.time || '15:00',
      title: entry.title,
      place: CIKORKA_PLACE,
      price: cikorka.price,
      desc: entry.desc,
      link: match ? match.link : URLS.cikorka,
      kids: true,
    });
  }

  const kcEvents = (kc12?.events || []).map(parseKc12Event).filter((e) => e.date >= today);
  theatre.push(...kcEvents.filter((e) => e.theatre && e.date <= month));
  theatre.sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
  const nextTheatre = theatre.length ? null : kcEvents.filter((e) => e.theatre)[0] || null;

  const ddmEvents = (ddm || []).filter((e) => isPublicDdm(e) && !usedDdm.has(e.id)).map((e) => {
    const detail = ddmDetails[e.id] || {};
    return {
      date: e.date,
      time: detail.time ? `${detail.time}${detail.timeEnd ? `–${detail.timeEnd}` : ''}` : '',
      title: e.title,
      place: DDM_PLACES[e.venue],
      price: detail.price || e.price,
      desc: e.desc,
      link: e.link,
      kids: e.ageTo !== null && e.ageTo <= 18,
      minor: DDM_MINOR.test(e.title),
    };
  });
  const kcOther = kcEvents.filter((e) => !e.theatre);
  const kudyEvents = (kudy || []).filter((k) => !kcEvents.some((e) => e.date === k.date && e.title.split(' ')[0] === k.title.split(' ')[0]));
  const others = [...kcOther, ...ddmEvents, ...kudyEvents, ...(komurka || [])]
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));

  const specialScreenings = (program?.days || []).filter((d) => d.date > week && d.date <= month).flatMap((d) => d.screenings
    .filter((s) => SPECIAL_SCREENING.test(s.title))
    .map((s) => ({ date: d.date, time: s.time, title: s.title, place: 'Modřanský biograf, U Kina 44/1', price: s.price, desc: '', link: s.link })));
  const plan = [...others.filter((e) => later(e) && !e.minor), ...specialScreenings]
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));

  return { today, week, month, warnings, days, theatre, nextTheatre, weekOthers: others.filter(inWeek), plan, failed };
}

function eventParts(e) {
  const when = `${dayLabel(e.date)}${e.time ? `, ${e.time}` : ''}`;
  const tags = [e.kids ? 'pro děti' : '', e.soldOut ? 'VYPRODÁNO' : ''].filter(Boolean).join(', ');
  const details = [
    e.place,
    e.endDate && e.endDate !== e.date ? `Do ${short(e.endDate)} ${e.endDate.slice(0, 4)}` : '',
    e.price || 'Cena neuvedena',
    e.desc ? firstSentence(e.desc) : '',
    e.note || '',
  ].filter(Boolean).map((p) => (p[0].toUpperCase() + p.slice(1)).replace(/\.$/, '')).join('. ');
  return { head: `${when} – ${e.title}`, tags, details: `${details}.`, link: e.link };
}

const safeUrl = (url) => (/^https?:\/\//.test(url || '') ? url : '');

function eventHtml(e) {
  const p = eventParts(e);
  const link = safeUrl(p.link) ? ` <a href="${escapeHtml(p.link)}">Odkaz</a>` : '';
  return `<li><strong>${escapeHtml(p.head)}</strong>${p.tags ? ` – ${escapeHtml(p.tags)}` : ''}<br>${escapeHtml(p.details)}${link}</li>`;
}

function eventText(e) {
  const p = eventParts(e);
  return `${p.head}${p.tags ? ` – ${p.tags}` : ''}\n${p.details}${safeUrl(p.link) ? `\n${p.link}` : ''}`;
}

function render(r) {
  const subject = `Kulturní akce Praha 12: týden od ${Number(r.today.slice(8))}. ${Number(r.today.slice(5, 7))}. ${r.today.slice(0, 4)}`;
  const intro = `Přehled na ${short(r.today)} – ${short(r.week)} ${r.week.slice(0, 4)}, divadlo a plánování do ${short(r.month)} ${r.month.slice(0, 4)}. Vzniká automaticky bez AI z pevně daných zdrojů, proto v něm nemusí být akce odjinud.`;
  const kinoNote = 'Jde o přehled z kinokinokino.cz a před návštěvou je dobré čas ověřit na webu kina.';
  const kc12Note = 'Sobotní pohádky a další akce KC12 mimo TicketLIVE nemusí být v přehledu zahrnuté.';
  const noTheatre = r.theatre.length ? '' : `V následujících 30 dnech jsem žádné divadlo nenašel.${r.nextTheatre ? ' Nejbližší představení z dat KC12:' : ''}`;
  const noOthers = r.weekOthers.length ? '' : 'V těchto dnech jsem v použitých zdrojích žádnou další akci nenašel.';
  const failedNote = r.failed.length ? `Nepodařilo se načíst: ${r.failed.join(', ')}.` : 'Všechny použité zdroje se podařilo načíst.';
  const manualNote = 'Automaticky se nečtou praha12.cz, Papírna Modřany, Central Garden, kostely a spolky ani GoOut, takže přehled nemusí být úplný.';

  const groupByDay = (events, fn) => {
    const dates = [...new Set(events.map((e) => e.date))];
    return dates.map((date) => fn(date, events.filter((e) => e.date === date)));
  };

  const html = [
    `<h1>${escapeHtml(subject)}</h1>`,
    `<p>${escapeHtml(intro)}</p>`,
    ...r.warnings.map((w) => `<p><strong>Pozor: ${escapeHtml(w)}</strong></p>`),
    '<h2>Modřanský biograf</h2><p>U Kina 44/1</p>',
    ...r.days.flatMap((d) => [
      `<h3>${escapeHtml(dayLabel(d.date))}</h3>`,
      d.screenings.length
        ? `<ul>${d.screenings.map((s) => `<li>${escapeHtml(s.time)} ${safeUrl(s.link) ? `<a href="${escapeHtml(s.link)}">${escapeHtml(s.title)}</a>` : escapeHtml(s.title)}${s.kids ? ' – pro děti' : ''}</li>`).join('')}</ul>`
        : '<p>V datech žádné promítání není.</p>',
    ]),
    `<p><a href="${URLS.kino}">Oficiální program kina</a>. ${escapeHtml(kinoNote)}</p>`,
    '<h2>Divadlo</h2>',
    noTheatre ? `<p>${escapeHtml(noTheatre)}</p>` : '',
    `<ul>${[...r.theatre, ...(r.nextTheatre ? [r.nextTheatre] : [])].map(eventHtml).join('')}</ul>`,
    `<p>${escapeHtml(kc12Note)} <a href="${URLS.kc12}">Kalendář KC12</a></p>`,
    '<h2>Ostatní akce</h2>',
    noOthers ? `<p>${escapeHtml(noOthers)} Ručně: <a href="${URLS.praha12}">kalendář Prahy 12</a>, <a href="${URLS.kudy}">Kudy z nudy</a>.</p>` : '',
    ...groupByDay(r.weekOthers, (date, events) => `<h3>${escapeHtml(dayLabel(date))}</h3><ul>${events.map(eventHtml).join('')}</ul>`),
    ...(r.plan.length ? ['<h2>Stojí za to si naplánovat</h2>', `<ul>${r.plan.map(eventHtml).join('')}</ul>`] : []),
    '<h2>Zdroje</h2>',
    `<p>${escapeHtml(failedNote)} ${escapeHtml(manualNote)} <a href="${URLS.praha12}">Kalendář Prahy 12</a></p>`,
  ].filter(Boolean).join('\n');

  const text = [
    subject.toUpperCase(), intro, ...r.warnings.map((w) => `POZOR: ${w}`),
    'MODŘANSKÝ BIOGRAF\nU Kina 44/1',
    ...r.days.map((d) => `${dayLabel(d.date)}\n${d.screenings.length ? d.screenings.map((s) => `- ${s.time} ${s.title}${s.kids ? ' – pro děti' : ''}`).join('\n') : 'V datech žádné promítání není.'}`),
    `Oficiální program kina: ${URLS.kino}\n${kinoNote}`,
    'DIVADLO',
    noTheatre,
    ...[...r.theatre, ...(r.nextTheatre ? [r.nextTheatre] : [])].map(eventText),
    `${kc12Note} ${URLS.kc12}`,
    'OSTATNÍ AKCE',
    noOthers ? `${noOthers} Ručně: ${URLS.praha12}, ${URLS.kudy}` : '',
    ...groupByDay(r.weekOthers, (date, events) => `${dayLabel(date)}\n${events.map(eventText).join('\n\n')}`),
    ...(r.plan.length ? ['STOJÍ ZA TO SI NAPLÁNOVAT', ...r.plan.map(eventText)] : []),
    'ZDROJE',
    `${failedNote} ${manualNote} ${URLS.praha12}`,
  ].filter(Boolean).join('\n\n');

  return { subject, html, text };
}

// --- síť ---
const sleep = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

async function getText(url) {
  const response = await fetch(url, { headers: { 'User-Agent': 'program-modransky-biograf (weekly)' }, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const charset = (response.headers.get('content-type') || '').match(/charset=([\w-]+)/i)?.[1] || 'utf-8';
  await sleep(1000);
  return htmlToText(new TextDecoder(charset).decode(await response.arrayBuffer()), url);
}

function readJson(file, failed, label) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (err) { failed.push(label); console.error(file, err.message); return null; }
}

async function collect(today) {
  const failed = [];
  const attempt = async (label, fn, fallback) => {
    try { return await fn(); } catch (err) { failed.push(label); console.error(label, err.message); return fallback; }
  };
  const program = readJson('program.json', failed, 'program kina');
  const kc12 = readJson('kc12.json', failed, 'akce KC12');
  const month = addDays(today, 30);

  const ddm = await attempt('akce DDM Modřany', async () => {
    const list = parseDdmList(await getText(URLS.ddmList));
    if (!list.length) throw new Error('nerozpoznána žádná akce');
    return list;
  }, null);
  const ddmDetails = {};
  for (const e of (ddm || []).filter((x) => isPublicDdm(x) && x.date >= today && x.date <= month)) {
    try { ddmDetails[e.id] = parseDdmDetail(await getText(e.link)); } catch (err) { console.error(e.link, err.message); }
  }
  const cikorka = await attempt('program Divadla Na Cikorce', async () => {
    const parsed = parseCikorka(await getText(URLS.cikorka), today);
    if (!parsed.entries.length) throw new Error('nerozpoznáno žádné představení');
    return parsed;
  }, { entries: [], price: '' });

  const kudy = await attempt('Kudy z nudy', async () => {
    const list = parseKudyList(await getText(URLS.kudy));
    if (!list.length) throw new Error('nerozpoznána žádná akce');
    const kidsLinks = new Set(parseKudyList(await getText(URLS.kudyKids)).map((k) => k.link));
    const events = [];
    for (const item of list.slice(0, 15)) {
      const detail = parseKudyDetail(await getText(item.link));
      if (!detail || !detail.inPraha12 || detail.date < today || detail.date > month) continue;
      events.push({ ...detail, title: item.title, link: item.link, kids: kidsLinks.has(item.link) });
    }
    return events;
  }, null);
  const komurka = await attempt('RC Komůrka', async () => parseKomurka(await getText(URLS.komurka), today), null);

  return { today, program, kc12, ddm, ddmDetails, cikorka, kudy, komurka, failed };
}

async function send({ subject, html, text }) {
  const { GMAIL_USER, GMAIL_APP_PASSWORD, MAIL_TO } = process.env;
  if (!GMAIL_USER || !GMAIL_APP_PASSWORD) throw new Error('Chybí GMAIL_USER nebo GMAIL_APP_PASSWORD.');
  const nodemailer = require('nodemailer');
  const transport = nodemailer.createTransport({ service: 'gmail', auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD } });
  await transport.sendMail({ from: GMAIL_USER, to: MAIL_TO || GMAIL_USER, subject, text, html });
}

async function main() {
  const today = todayInPrague();
  const output = render(assemble(await collect(today)));
  if (process.env.DRY_RUN) {
    fs.writeFileSync('prehled.html', output.html);
    fs.writeFileSync('prehled.txt', output.text);
    if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${output.html}\n`);
    console.log(output.text);
    return;
  }
  await send(output);
  console.log(`Odesláno: ${output.subject}`);
}

if (require.main === module) main().catch((err) => { console.error(err); process.exit(1); });
module.exports = { htmlToText, parseDdmList, isPublicDdm, parseDdmDetail, parseCikorka, parseKc12Event, parseKudyList, parseKudyDetail, parseKomurka, firstSentence, assemble, render, addDays, dayLabel };
