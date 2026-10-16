---
name: verder-werken
description: De vaste route voor een wijziging aan deze app - branch maken, bouwen, testen, pull request openen met preview-link. Gebruik dit bij elk verzoek om iets toe te voegen, te wijzigen of te repareren aan deze applicatie, ook als het een kleinigheid lijkt, ook als er een tabel of kolom bij komt (databasewijziging in migrations/), ook bij servercode in worker/, ook als de gebruiker tijdens het bouwen wil meekijken, en ook als de gebruiker zegt dat het goed is of live mag (dan gaat de PR van concept naar klaar).
---

Deze route staat uitgeschreven in `docs/routes/verder-werken.md`. Lees dat bestand nu in
zijn geheel en loop de stappen in volgorde af.

Hier staat bewust geen kopie van de tekst. De route is voor elke agent dezelfde, en
`docs/routes/` is de enige plek waar hij staat, zodat er nooit twee versies zijn die
uit elkaar lopen. Deze skill is alleen de aansluiting voor Claude Code.

Het ritme van een wijziging (template-versie 24 en nieuwer; bij een oudere versie geldt wat
in de route van de app staat):

- **Een PR begint als concept** (`gh pr create --draft`). Dan draaien alleen de snelle
  checks en wordt de preview bijgewerkt. Push per afgerond stukje, niet per kleine wijziging.
- **Kijk zelf mee in de zijbalk.** Open de Cloudflare-preview in de browser in de zijbalk van
  de Claude-app (de tools `Claude_Browser`; zijn die er niet, dan Claude in Chrome) en loop de
  wijziging na voordat je de gebruiker vraagt te kijken. Zie je het inlogscherm van Cloudflare
  Access, vraag de gebruiker dan één keer in te loggen in dat paneel; daarna onthoudt de
  browser het voor alle apps. Geef de gebruiker één keer het vaste adres van de app
  (`actueel-...`, staat in de reactie van Preview uitrollen): dat kan hij open laten staan.
- **Zegt de gebruiker dat het goed is**, zet de PR dan op klaar (`gh pr ready`), wacht zelf op
  alle checks (`gh pr checks --watch`) en repareer wat rood is, net zo lang tot alles groen
  is. Vraag de gebruiker nooit wat hij met een rode check moet; leg alleen iets voor als een
  check om een besluit vraagt (zoals `guard:migrations`), met jouw advies.

Wat verder bij deze route hoort, en wat de route zelf ook noemt:

- **Raakt de wijziging de database** (een tabel, kolom of index), lees dan ook
  `docs/routes/databasewijziging.md` in zijn geheel en volg die stappen. Een migratie is
  een nieuw bestand in `migrations/`; de hook van de plugin herinnert je aan de route
  zodra je daar schrijft.
- **Servercode** staat in `worker/` en gaat met de rest van de app mee bij de uitrol na de
  merge. Er is geen aparte stap om hem live te zetten. Zelf `wrangler deploy` of iets met
  `--remote` draaien kan en mag niet: op deze computer is geen Cloudflare-toegang.
- **Meekijken tijdens het bouwen** gaat in de Claude-app via de preview: die start de app
  op deze computer volgens `.claude/launch.json`, met een lokale database en nooit tegen
  productie. Start geen dev-server in Bash. Opleveren blijft altijd de pull request met
  de Cloudflare-preview (de workflow Preview uitrollen zet de link in de PR).
