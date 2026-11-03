(async () => {
  console.log('ROBOTS', (await (await fetch('https://www.kinokinokino.cz/robots.txt')).text()).slice(0, 400));
  const d = await (await fetch('https://www.kinokinokino.cz/data/praha/data.json')).json();
  console.log('TOP', Array.isArray(d) ? 'array ' + d.length : Object.keys(d).map((k) => k + ':' + (Array.isArray(d[k]) ? 'arr' + d[k].length : typeof d[k])).join(','));
  const s = JSON.stringify(d);
  console.log('SIZE', s.length);
  console.log('HEAD', s.slice(0, 1200));
  const i = s.indexOf('Modřansk');
  console.log('MOD', s.slice(Math.max(0, i - 700), i + 500));
})();
