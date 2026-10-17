---
name: nieuwe-app
description: Een nieuwe app starten op tier 1 van Stage Two (één Cloudflare Worker met eigen servercode, een D1-database en R2-bestanden) - eerst meedenken over wat de app moet doen, dan de app aanmaken uit de nieuwste template voor tier 1 van Stage Two onder de organisatie van de gebruiker, en Worker, deur, database en bestanden laten inrichten door de beheer-repo. Gebruik dit als de gebruiker /stagetwo-tier1:nieuwe-app typt of een nieuwe, losstaande app wil beginnen (niet een uitbreiding van een bestaande app).
---

Je helpt iemand die niet technisch is om een nieuwe app goed te beginnen. Het gesprek
is het belangrijkste deel: de keuzes hieronder zijn achteraf duur om te veranderen. Praat
in gewone taal, stel één vraag tegelijk, en geef bij elke keuze een advies met de reden.
De gebruiker beslist. Voer niets uit wat hier niet staat.

## Stap 1: is het wel een nieuwe app?

Vraag wat de gebruiker wil maken, in één of twee zinnen. Toets het aan dit lijstje:

| Wat je hoort | Waarschijnlijk |
|---|---|
| Gaat over gegevens die al in een app van het bedrijf zitten (dezelfde planten, orders, voorraad, klanten) | uitbreiding van die app |
| Een scherm, een overzicht of een werktuig erbij voor dezelfde mensen | uitbreiding van die app |
| Andere gebruikers, of gegevens die niets met elkaar te maken hebben | nieuwe app |
| "Kan dit er ook nog bij?" | vaak een uitbreiding |

De regel erachter is simpel en de gebruiker mag hem horen: **één app per verzameling
gegevens.** Gegevens die op twee plekken staan gaan uit elkaar lopen, en een app die de
gegevens van een andere app gebruikt is voor iedereen moeilijker te overzien. Is het een
uitbreiding? Zeg dat, en verwijs naar `/stagetwo-tier1:verder-werken` in de map van die app. Stop
dan hier.

Wil de gebruiker toch een aparte app op de gegevens van een bestaande app, bijvoorbeeld
een portaal voor mensen van buiten? Dat kan, maar dat is een keuze met een eigen
beveiligingsopzet, en die maakt Stage Two samen met de gebruiker. Verwijs naar Stage Two
en stop hier.

Is het een **openbare website** (vindbaar in Google, zonder inlog)? Dat kan prima: de hele
app wordt dan publiek en alleen een beheerdeel (bijvoorbeeld `/beheer`) blijft achter de
deur, zoals bij stagetwo.nl en de fotografiesite. Onthoud het voor stap 4. Alleen bij een
**webshop met betalingen** of een site waar bezoekers een eigen account krijgen, verwijs je
naar Stage Two: dat vraagt een eigen opzet voor betalingen of inloggen. Stop dan hier.

## Stap 2: het idee scherp

Vraag door tot je op elk punt een concreet antwoord hebt. "Dat zien we later wel" is
het duurste antwoord.

1. **Wat kan iemand straks dat nu niet kan?** Eén zin, vanuit de gebruiker geschreven.
   Dit wordt de omschrijving van de app.
2. **Wie gaat het gebruiken?** Hoeveel mensen, en alleen eigen personeel of ook mensen
   van buiten.
3. **Welke gegevens gaan erin?** En of daar persoonsgegevens bij zitten.
4. **Wat is de eerste versie waar iemand echt iets aan heeft?** Het kleinste ding dat
   maandag al gebruikt zou worden.

## Stap 3: wat de app meekrijgt

Hier is niets te kiezen; zeg het in twee zinnen. Elke app staat achter een deur: alleen
de mensen uit de toegangslijst van het bedrijf komen erin, en ze loggen in met hun
werkaccount (of met een code per mail); losse pagina's, of bij een openbare site alles
behalve het beheerdeel, kunnen publiek zijn. En
elke app krijgt bij Cloudflare een eigen database (D1) en een eigen plek voor bestanden
(R2), twee keer: één voor het echte werk en één voor de previews, zodat een test nooit
echte gegevens raakt. Dat kost per app vrijwel niets.

## Stap 4: naam en plek

- **Naam.** Stel er een voor uit de omschrijving: kort, kleine letters, streepjes,
  bijvoorbeeld `voorraad-app`. Laat de gebruiker kiezen.
- **Eigenaar.** Toon de organisaties van de gebruiker met `gh api user/orgs -q '.[].login'`.
  Kies de organisatie van het bedrijf: daar staat de beheer-repo die hosting, database
  en bestanden inricht, en dan is de app van het bedrijf en niet van één persoon. Is er geen
  organisatie, zeg dan dat Stage Two die eerst moet aanmaken, en stop hier.
- **Wie erbij mag.** Lees de groepen uit de toegangslijst:
  `gh api repos/<beheer-repo>/contents/toegang.json -H "Accept: application/vnd.github.raw"`.
  De beheer-repo is de repo van de organisatie met "beheer" in de naam en het bestand
  `beheer/inrichten-light.mjs` (meestal `stagetwo-beheer-tier1`; `gh repo list <eigenaar> --json name -q '.[].name'`).
  Zijn er meer, één per Cloudflare-account, vraag dan welke: de README van elke beheer-repo
  zegt voor welk account en welke domeinen hij is. Onthoud de keuze voor stap 5b.
  Staat de naam van de app al onder `apps`, dan is dit al geregeld; zeg dat. Zo niet, toon
  dan de groepen (met wie erin zit, in gewone woorden) en laat de gebruiker kiezen. Zijn
  er geen groepen, dan maakt de owner van de organisatie die aan (tijdens het project
  Stage Two); ga gewoon door, stap 5b meldt het.
- **Openbaar of achter de deur.** Standaard staat alles achter de deur. Is het een openbare
  site (stap 1), stel dan voor: alles publiek, en `/beheer`, `/beheer/*` en `/api/beheer/*`
  dicht. Zijn het maar een paar publieke pagina's, noem die (bijvoorbeeld `/galerij/*`).
  Onthoud het voor stap 5b. Een pad begint met `/`, met hooguit een `*` aan het eind.
- **Map.** De app komt als nieuwe submap met de naam van de app onder de map die nu open
  staat. Zeg dat.

## Stap 5: droogloop, dan aanmaken

Draai eerst de droogloop, met Bash, precies zo:

```sh
node "${CLAUDE_SKILL_DIR}/scripts/nieuwe-app.mjs" --json --droogloop --naam "<naam>" --eigenaar "<eigenaar>" --omschrijving "<omschrijving>" --organisatie "<bedrijfsnaam>"
```

`<bedrijfsnaam>` is de naam van het bedrijf waarvoor de app is, zoals je die uit het gesprek of
de map kent (bijvoorbeeld "Richplant B.V."); die komt in de `LICENSE` van de app. Weet je hem
niet, laat `--organisatie` dan weg: het script neemt de naam van de organisatie op GitHub.

Het antwoord is één JSON-object met een `status`.

- `mislukt`: `reden` is één zin met wat de gebruiker moet doen. Geef die door en stop.
  Probeer het niet te omzeilen.
- `klaar`: vat `plan` samen in hooguit vier regels: welke repo, waar op deze computer,
  en wie de reviewer is. Staat `githubPlan` op `free` en is de
  eigenaar een organisatie, zeg dan dat main straks niet beschermd kan worden op het
  gratis plan en dat Stage Two dat bij de start van het project regelt; doorgaan mag.

Zeg dan: "Ik maak hem nu aan; dat duurt een paar minuten." Draai hetzelfde commando met
`--doe-het` in plaats van `--droogloop`. Vraag geen toestemming meer; het typen van
`/stagetwo-tier1:nieuwe-app` en de bevestiging van het plan waren de opdracht.

Het script zet zelf de namen in `wrangler.jsonc`: de Worker heet zoals de app, de database
en de bestanden heten `<naam>` en voor de previews `<naam>-test`. De id's van de databases
blijven nullen; die vult App inrichten straks met een pull request. Pas `wrangler.jsonc`
hier niet zelf aan. Het zet ook de `LICENSE` op naam van het bedrijf (het gebruiksrecht van
Stage Two blijft in `LICENSE-STAGE-TWO`) en laat `.claude/settings.json` naar de kopie van de
plugin in de eigen organisatie wijzen. Pas die bestanden niet zelf aan.

- `mislukt`: geef `reden` door (dat is de volledige foutmelding). Staat er een `repo` in
  het antwoord, dan is de repo al aangemaakt: **draai precies hetzelfde `--doe-het`-commando
  nog een keer**. Het script ziet dat de repo uit de template komt en maakt af wat er nog
  ontbreekt (invullen, installeren, committen, pushen, main beschermen, de omgevingen).
  Lukt het de tweede keer ook niet, stop dan en geef de melding door aan de gebruiker voor
  Stage Two.

  **Zet nooit zelf repo-instellingen met de hand**: geen `gh api .../rulesets`, geen
  omgevingen, geen secrets, geen `git push` naar main. Dat doet alleen het script. Claude
  Code houdt zo'n handmatige aanroep terecht tegen, en een half met de hand ingerichte
  repo laat later App inrichten vastlopen. Verwijder ook zelf niets.
- `gemaakt`: zeg waar de app staat (`url` en `map`). Ga dan door naar stap 5b; de
  `nogTeDoen` uit dit antwoord gebruik je alleen als stap 5b `geen-beheer` geeft.

## Stap 5b: Worker, deur, database en bestanden laten inrichten

De Worker, de deur (Access), de databases (D1) en de bestanden (R2), voor productie en voor
de previews, worden ingericht door de workflow **App inrichten** in de beheer-repo van de
organisatie (het script zoekt hem zelf en neemt alleen een beheer-repo voor tier 1), op
GitHub. Daar staan alle sleutels; op deze computer komt bewust geen Cloudflare-toegang.
Probeer dat nooit zelf te doen, ook niet als `wrangler` op deze computer staat.

Draai:

```sh
node "${CLAUDE_SKILL_DIR}/scripts/nieuwe-app.mjs" --json --inrichten --naam "<naam>" --eigenaar "<eigenaar>" [--groepen "<groep1>,<groep2>"] [--publiek "<pad>,<pad>"] [--dicht "<pad>,<pad>"] [--beheer "<beheer-repo>"]
```

`--groepen` alleen als de app nog niet in de toegangslijst stond (stap 4), en dan ook de
paden uit stap 4: voor een openbare site `--publiek "/*" --dicht "/beheer,/beheer/*,/api/beheer/*"`,
voor een paar publieke pagina's alleen `--publiek` met die paden. Het script zet de app-repo
zelf bij de GitHub App van de beheer-repo als dat nodig is. Zeg vooraf dat dit een paar
minuten kan duren. Het antwoord:

- `kies-beheer`: de organisatie heeft meer beheer-repo's (`beheerRepos`). Gebruik de keuze uit
  stap 4, of vraag het nu, en draai opnieuw met `--beheer <naam zonder eigenaar>`.
- `kies-groepen`: de app staat nog niet in de toegangslijst en er zijn geen groepen
  meegegeven. Toon `groepen`, laat kiezen, en draai opnieuw met `--groepen`. Is de lijst
  leeg, geef dan `reden` door: Stage Two maakt de groepen aan.
- `wacht-op-toegang`: er staat nu een pull request op de beheer-repo (`pr`) die de app
  aan de toegangslijst toevoegt. Zeg dat de eigenaar van de beheer-repo die moet
  goedkeuren en mergen (zo beslist een mens wie bij een app mag), en dat je daarna
  hetzelfde commando nog een keer draait, zonder `--groepen`, `--publiek` en `--dicht`. Je
  kunt intussen al bouwen.
- `geen-beheer`: deze organisatie heeft (nog) geen beheer-repo. Zeg dat Stage Two de
  hosting, de database en de bestanden inricht, en loop de `nogTeDoen` van stap 5 langs.
- `mislukt`: geef `reden` door, met de `url` van de run als die er is. De app zelf is
  gewoon klaar; alleen de inrichting ontbreekt. Verwijs naar Stage Two.
- `ingericht`: Worker, deur, database en bestanden staan. Het adres van de app staat in
  `adres`; tot de eerste uitrol toont het "Deze app wordt ingericht.", al achter de deur.
  App inrichten opent ook een pull request op de app die de echte database-id's in
  `wrangler.jsonc` zet; zeg dat de gebruiker die mergt (dat is de eerste uitrol). Loop
  `nogTeDoen` langs, elk punt in één zin.

## Stap 6: en nu verder

Zeg tot slot, in deze volgorde:

1. Open de nieuwe map in Claude Code (Bestand, map openen). De afspraken en de bewaker
   van de werkwijze werken alleen in de map van de app zelf.
2. Typ daar `/stagetwo-tier1:verder-werken` en beschrijf de eerste versie uit stap 2.
   Komen er gegevens in, dan begint dat werk met de eerste tabellen: een migratie in
   `migrations/` (de route `docs/routes/databasewijziging.md`) en de servercode in
   `worker/` die ze leest en schrijft. De eerste merge zet de app echt neer.
3. Laat Stage Two weten dat deze app bestaat (naam en link), zodat Stage Two bij vragen
   weet over welke app het gaat. Stage Two krijgt daarmee geen toegang tot de app en heeft
   die ook niet nodig: nieuwe versies van de werkwijze haalt de gebruiker zelf in de app
   binnen met `/stagetwo-tier1:updaten`.
