---
name: nieuwe-app
description: Een nieuwe app starten op tier 1 van Stage Two (één Cloudflare Worker met eigen servercode, een D1-database en R2-bestanden) - eerst meedenken over wat de app moet doen, dan de app aanmaken uit de nieuwste template voor tier 1 van Stage Two onder de organisatie van de gebruiker, en Worker, deur, database en bestanden laten inrichten door de beheer-repo. Gebruik dit als de gebruiker /stagetwo-tier1:nieuwe-app typt of een nieuwe app wil beginnen. Gaat eerst na of het idee als nieuw onderdeel in een bestaande superapp van het bedrijf past; alleen bij een andere gebruikersgroep, een los geheel of een verzamelplek voor gegevens van buiten wordt het een nieuwe superapp.
---

Je helpt iemand die niet technisch is om een nieuwe app goed te beginnen. Het gesprek
is het belangrijkste deel: de keuzes hieronder zijn achteraf duur om te veranderen. Praat
in gewone taal, stel één vraag tegelijk, en geef bij elke keuze een advies met de reden.
De gebruiker beslist. Voer niets uit wat hier niet staat.

## Stap 1: hoort het bij een superapp die er al is?

Vraag wat de gebruiker wil maken, in één of twee zinnen. Ga daarna eerst na bij welke
bestaande app van het bedrijf het past. De apps van een bedrijf zijn **superapps**: één app
per gebruikersgroep, met één repo en één database, waarin elk onderdeel een eigen pad
(bijvoorbeeld `/planning`) en een tegel op de startpagina krijgt. Een nieuw idee is daarom
meestal een nieuw onderdeel, geen nieuwe app. Welke apps er zijn, vraag je de gebruiker of
lees je uit de organisatie:
`gh repo list <organisatie> --no-archived --json name,description -q '.[] | "\(.name): \(.description)"'`.
Heeft het bedrijf nog geen app, dan wordt dit de eerste superapp; ga door naar stap 2.

Toets het idee aan drie vragen: **wie gebruikt het** (eigen mensen of mensen van buiten),
**welke gegevens gebruikt het** (gegevens die al in een app zitten of daar naast horen), en
**is het een los geheel** (een ander bedrijf in de groep, of iets wat later apart verkocht
kan worden).

| Wat je hoort | Advies |
|---|---|
| Eigen mensen, ook als het een andere groep is dan nu (bijvoorbeeld de werkvloer naast kantoor) | nieuw onderdeel van de interne superapp |
| Gegevens die al in een app zitten, of die je daar later naast wilt zien | nieuw onderdeel van die app |
| Een scherm, een overzicht of een werktuig erbij | nieuw onderdeel |
| "Kan dit er ook nog bij?" | bijna altijd een nieuw onderdeel |
| Mensen van buiten: klanten, leveranciers, een webshop, links die naar klanten gaan | nieuwe superapp |
| Een los geheel: een ander bedrijf in de groep, of iets wat later apart verkocht kan worden | nieuwe superapp |
| Een verzamelplek voor gegevens van buiten, die andere apps alleen lezen | nieuwe superapp |

De regel erachter is simpel en de gebruiker mag hem horen: **één database per superapp,
en alleen die app verandert hem.** Gegevens die op twee plekken staan gaan uit elkaar lopen,
en twee apps die dezelfde tabellen veranderen zitten elkaar in de weg.

Elke database kost ook geld en onderhoud: bij Cloudflare is het bedrag per database klein,
maar elke app heeft er twee (echt en test), met elk een eigen opslag voor bestanden, en dat
telt op met elk idee dat een eigen app wordt. Een onderdeel erbij kost niets extra.

Andere gebruikers zijn op zichzelf geen reden voor een nieuwe app: wie welk onderdeel mag
gebruiken, regel je binnen de app.

Past het bij een bestaande app? Zeg bij welke, en dat het een nieuw onderdeel wordt met een
eigen pad en een tegel. Verwijs naar `/stagetwo-tier1:verder-werken` in de map van die app.
Stop dan hier.

Is een nieuwe superapp nodig? Zeg welke van de drie redenen het is (een andere
gebruikersgroep, een los geheel of een verzamelplek voor gegevens van buiten), en dat de app
een eigen database krijgt. Ga dan door.

Moet die nieuwe app gegevens van een bestaande app gebruiken, bijvoorbeeld een portaal waarin
klanten hun eigen orders zien? Dat kan: de nieuwe app leest dan mee en verandert niets aan de
opbouw van de database, want dat doet alleen de app die hem bezit. Maar het is een keuze met
een eigen beveiligingsopzet, en die maakt Stage Two samen met de gebruiker. Verwijs naar Stage
Two en stop hier.

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

- **Naam.** Stel er een voor: kort, kleine letters, streepjes. Het is een superapp, dus
  een naam voor het geheel en de gebruikersgroep (bijvoorbeeld `intern` of `klantportaal`),
  niet voor het eerste onderdeel. Laat de gebruiker kiezen.
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
- **Testadres.** Vraag naar welk adres de testmails van deze app mogen. In de preview en lokaal gaat
  elke mail van de app naar dat ene adres, wie er ook als ontvanger staat, want daar staat een
  kopie van echte gegevens. Stel het adres van de gebruiker voor (`git config user.email`).
  Het hoort bij de app, niet bij één persoon, dus een gedeeld adres mag ook.
- **Map.** De app komt als nieuwe submap met de naam van de app onder de map die nu open
  staat. Zeg dat.

## Stap 5: droogloop, dan aanmaken

Draai eerst de droogloop, met Bash, precies zo:

```sh
node "${CLAUDE_SKILL_DIR}/scripts/nieuwe-app.mjs" --json --droogloop --naam "<naam>" --eigenaar "<eigenaar>" --omschrijving "<omschrijving>" --organisatie "<bedrijfsnaam>" --testmail "<testadres>"
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
  leeg, geef dan `reden` door: de owner maakt de groepen aan (tijdens het project Stage Two).
- `wacht-op-toegang`: er staat nu een pull request op de beheer-repo (`pr`) die de app
  aan de toegangslijst toevoegt. Die wijzigt alleen `toegang.json`, dus de controle
  Toegang of review wordt vanzelf groen. Zeg dat de gebruiker hem zelf merget als hij in het
  team `toegangsbeheer` zit (anders de owner van de organisatie); zo beslist een mens wie
  bij een app mag. Zeg ook dat je daarna hetzelfde commando nog een keer draait, zonder
  `--groepen`, `--publiek` en `--dicht`. Je kunt intussen al bouwen.
- `geen-beheer`: deze organisatie heeft (nog) geen beheer-repo. Zeg dat Stage Two de
  hosting, de database en de bestanden inricht, en loop de `nogTeDoen` van stap 5 langs.
- `mislukt` met in `reden` "zet de repo erbij": de GitHub App van de beheer-repo ziet alleen
  gekozen repo's, en de gewone GitHub-inlog op deze computer mag die lijst niet aanpassen. Dat
  is geen storing: bij zo'n organisatie gebeurt het bij elke nieuwe app één keer met de hand.
  Geef de owner een tabel met de schermen (organisatie, Settings, GitHub Apps, de App uit
  `reden`, Configure, Repository access, Select repositories, de app kiezen, Save) en draai
  daarna hetzelfde commando opnieuw. Zet de App niet op "All repositories": dan mag de
  beheer-repo ook bij alle andere repo's van de organisatie.
- `mislukt` om een andere reden: geef `reden` door, met de `url` van de run als die er is.
  De app zelf is gewoon klaar; alleen de inrichting ontbreekt. Verwijs naar Stage Two.
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
3. Laat Stage Two weten dat deze app bestaat (de naam en waarvoor hij is), zodat Stage Two
   bij vragen weet over welke app het gaat. Een link naar de repo helpt alleen tijdens het
   project; na de overdracht kan Stage Two een privé-repo standaard niet openen. Toegang tot de app
   heeft Stage Two niet nodig: nieuwe versies van de werkwijze haalt de gebruiker zelf in de app
   binnen met `/stagetwo-tier1:updaten`.
