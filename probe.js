(async () => {
  const html = await (await fetch('https://www.mlp.cz/cz/akce/vsechny-akce')).text();
  const forms = html.match(/<form[\s\S]*?<\/form>/gi) || [];
  for (const f of forms) {
    if (!/akce|knihovna|typ/i.test(f)) continue;
    console.log('FORM', (f.match(/<form[^>]*>/i) || [''])[0]);
    for (const m of f.matchAll(/<(input|select)[^>]*name="([^"]+)"[^>]*>/gi)) console.log('FIELD', m[2], m[0].slice(0, 160));
    for (const m of f.matchAll(/<option[^>]*value="([^"]*)"[^>]*>([^<]{0,60})/gi)) console.log('OPT', m[1], '|', m[2].trim());
  }
  console.log('ROBOTS', (await (await fetch('https://www.mlp.cz/robots.txt')).text()).slice(0, 600));
  const links = [...html.matchAll(/href="([^"]*akce[^"]*\?[^"]*)"/gi)].map((m) => m[1]).slice(0, 15);
  console.log('LINKS', links.join('\n'));
})();
