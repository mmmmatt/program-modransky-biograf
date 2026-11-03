# Program Modřanského biografu

Každé pondělí ráno GitHub Action otevře [web kina](https://www.modranskybiograf.cz/) v prohlížeči a uloží program na dostupné dny do `program.json`. Když se nepodaří najít žádné promítání, běh selže a poslední uložený program zůstane beze změny.

Ruční spuštění: záložka Actions → Program kina → Run workflow.

**Stav:** pravidelné spouštění je vypnuté. Web kina chrání Vercel Security Checkpoint, který prohlížeč spuštěný z GitHub Actions odmítá (HTTP 429), a tato ochrana se záměrně neobchází.
