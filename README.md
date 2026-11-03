# Program Modřanského biografu

Každé pondělí ráno GitHub Action stáhne veřejná data z [kinokinokino.cz](https://www.kinokinokino.cz/), vybere Modřanský biograf a uloží program do `program.json`. Když žádné promítání nenajde, běh selže a poslední uložený program zůstane beze změny.

Oficiální program je na [webu kina](https://www.modranskybiograf.cz/). Ruční spuštění: Actions → Program kina → Run workflow.

Akce Kulturního centra 12 se ukládají do `kc12.json` z veřejné stránky [TicketLIVE](https://www.ticketlive.cz/cs/event/kulturni-centrum-12). Web kc12.cz automatické čtení v robots.txt zakazuje, proto se nečte.

## Týdenní přehled akcí e-mailem

Po plánované pondělní obnově dat workflow **Přehled akcí** spustí `prehled.js`, který bez AI sestaví přehled pro Prahu 12 a pošle ho přes Gmail. Čte `program.json`, `kc12.json`, DDM Modřany, Divadlo Na Cikorce, Kudy z nudy a RC Komůrku. Když některý zdroj selže nebo se v něm nic nerozpozná, přehled to uvede.

Nastavení v Settings → Secrets and variables → Actions:

- `GMAIL_USER`: gmailová adresa odesílatele
- `GMAIL_APP_PASSWORD`: [heslo aplikace](https://myaccount.google.com/apppasswords) (vyžaduje dvoufázové ověření)
- `MAIL_TO`: příjemce (nepovinné, jinak `GMAIL_USER`)

Zkouška bez odeslání: Actions → Přehled akcí → Run workflow se zaškrtnutým „Jen zkouška“; výsledek je v souhrnu běhu. Seznam dětských filmů je v `KIDS_FILMS` na začátku `prehled.js`.
