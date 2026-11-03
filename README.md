# Program Modřanského biografu

Každé pondělí ráno GitHub Action stáhne veřejná data z [kinokinokino.cz](https://www.kinokinokino.cz/), vybere Modřanský biograf a uloží program do `program.json`. Když žádné promítání nenajde, běh selže a poslední uložený program zůstane beze změny.

Oficiální program je na [webu kina](https://www.modranskybiograf.cz/). Ruční spuštění: Actions → Program kina → Run workflow.

Akce Kulturního centra 12 se ukládají do `kc12.json` z veřejné stránky [TicketLIVE](https://www.ticketlive.cz/cs/event/kulturni-centrum-12). Web kc12.cz automatické čtení v robots.txt zakazuje, proto se nečte.
