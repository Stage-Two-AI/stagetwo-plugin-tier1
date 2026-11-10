/**
 * Projectbestanden die een nieuwe versie van de template eenmalig nodig heeft. De kern
 * (lib/toepassen.mjs) raakt alleen bestanden van de template. Een paar overgangen vragen
 * daarnaast iets in een bestand van het project, anders is de update-PR zelf rood. Dat staat
 * hier, per versie, en nergens anders. Wat dit niet veilig zelf kan, wordt uitleg voor de
 * bouwer (`voorDeBouwer`), in de uitkomst en in de pull request.
 *
 * Versie 39:
 * - `src/onderdelen.ts`: de test `tests/unit/onderdelen.test.ts` en de browsertest
 *   `e2e/onderdelen.spec.ts` (allebei van de template) lezen dat bestand. Ontbreekt het, dan
 *   zet dit het neer, gevuld uit de routes in src/ (de zoekregel van de template, scripts/lib/onderdelen.mjs, die ook die test gebruikt, en `/`
 *   bestaat altijd), en anders met alleen `/`. De kop per onderdeel kan dit niet weten; die
 *   geeft de skill mee met `--kop <pad> <kop>` (zie zetKoppen).
 *
 * Puur over de map van de app.
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export const ONDERDELEN_PAD = "src/onderdelen.ts";
export const VERSIE_ONDERDELEN = 39;

/** Paden die bewust geen onderdeel zijn: inloggen, de terugkeer van de inlog en de API (zelden in tier 1, Access logt in). */
const GEEN_ONDERDEEL = /^\/(login|inloggen|logout|uitloggen|auth|callback|api)$/i;

/**
 * De zoekregel voor de hoofdpaden staat op één plek: `scripts/lib/onderdelen.mjs` van de
 * template (sinds versie 40). De test `tests/unit/onderdelen.test.ts` gebruikt hem, en updaten
 * draait hem in de werkkopie, waar hij na de templatebestanden al staat. Zo tellen plugin en
 * test nooit verschillend (bij stagetwo-site vond een eigen kopie hier alleen `/`).
 */
export const ONDERDELEN_SCRIPT = "scripts/lib/onderdelen.mjs";

/**
 * De hoofdpaden van de app volgens de template, gesorteerd. Null als het script er niet is, niet
 * draait of iets anders dan een lijst met paden geeft.
 */
export function routesVanTemplate(map, node) {
  if (!node || !existsSync(join(map, ONDERDELEN_SCRIPT))) return null;
  try {
    const lijst = JSON.parse(String(node.draai(map, ONDERDELEN_SCRIPT) ?? ""));
    if (!Array.isArray(lijst) || !lijst.every((p) => typeof p === "string" && p.startsWith("/"))) return null;
    return [...new Set(lijst)].sort();
  } catch {
    return null;
  }
}

/** Een naam uit het pad: `/` wordt "Start", `/nieuwe-order` wordt "Nieuwe order". */
export function naamUitPad(pad) {
  if (pad === "/") return "Start";
  const woorden = pad.slice(1).replace(/[-_]+/g, " ").trim();
  return woorden.charAt(0).toUpperCase() + woorden.slice(1);
}

/** Het voorstel: `{ onderdelen: [{pad, naam}], geen: [pad] }`. Zonder routes alleen `/`. */
export function onderdelenVoorstel(routes) {
  const geen = routes.filter((p) => GEEN_ONDERDEEL.test(p));
  const onderdelen = routes.filter((p) => !GEEN_ONDERDEEL.test(p)).map((pad) => ({ pad, naam: naamUitPad(pad) }));
  if (onderdelen.length === 0) onderdelen.push({ pad: "/", naam: naamUitPad("/") });
  return { onderdelen, geen };
}

const tekst = (s) => JSON.stringify(s);

/** De inhoud van src/onderdelen.ts. `koppen`: { pad: kop } voor de kop van het hoofdscherm. */
export function onderdelenBestand({ onderdelen, geen }, koppen = {}) {
  const regels = onderdelen.map(({ pad, naam }) => {
    const kop = koppen[pad];
    return kop && kop !== naam
      ? `  { pad: ${tekst(pad)}, naam: ${tekst(naam)}, kop: ${tekst(kop)} },`
      : `  { pad: ${tekst(pad)}, naam: ${tekst(naam)} },`;
  });
  return [
    "/**",
    " * De onderdelen van deze app: elk hoofdscherm met zijn eigen pad. De startpagina (tegels of",
    " * een menu) kan deze lijst lezen, en de browsertest `e2e/onderdelen.spec.ts` opent elk",
    " * onderdeel en kijkt of het zonder fout opent en zijn kop toont.",
    " *",
    " * Een nieuw onderdeel krijgt hier een regel; de browsertest opent het dan vanzelf. Vergeet je",
    " * dat, dan wordt `tests/unit/onderdelen.test.ts` rood: die vergelijkt deze lijst met de routes",
    " * in src/.",
    " *",
    " * - `pad`: waar het onderdeel woont, bijvoorbeeld \"/klanten\".",
    " * - `naam`: hoe het onderdeel heet, zoals op de startpagina.",
    " * - `kop`: de kop (h1) van het hoofdscherm, als die anders is dan de naam.",
    " *",
    ` * Neergezet door updaten, uit de routes van deze app. Dit bestand is`,
    " * van het project: pas de namen gerust aan.",
    " */",
    "export type Onderdeel = { pad: string; naam: string; kop?: string };",
    "",
    "export const ONDERDELEN: Onderdeel[] = [",
    ...regels,
    "];",
    "",
    "/**",
    " * Paden in de router die bewust geen onderdeel zijn, bijvoorbeeld een scherm dat je alleen",
    " * via een ander onderdeel bereikt.",
    " */",
    `export const GEEN_ONDERDEEL: string[] = [${geen.map(tekst).join(", ")}];`,
    "",
  ].join("\n");
}

const kruist = (van, naar, versie) => van < versie && naar >= versie;

/**
 * Alles voor de overgang van `van` naar `naar`. Geeft
 * `{ bijgewerkt: [{pad, hoe}], paden: [pad], voorDeBouwer: [tekst], onderdelen, reden }`:
 * `reden` is gezet als het mislukte (dan is de werkkopie niet te vertrouwen).
 * `node`: { draai(map, script) -> uitvoer } (gooit bij een fout), voor de zoekregel van de template.
 */
export function projectbestanden({ map, van, naar, node = null }) {
  const uit = { bijgewerkt: [], paden: [], voorDeBouwer: [], onderdelen: null, reden: null };
  if (!kruist(van, naar, VERSIE_ONDERDELEN)) return uit;

  // src/onderdelen.ts, alleen als hij er nog niet is.
  if (!existsSync(join(map, ONDERDELEN_PAD))) {
    const gevonden = routesVanTemplate(map, node);
    const routes = gevonden ?? [];
    const voorstel = onderdelenVoorstel(routes);
    if (gevonden === null) {
      uit.voorDeBouwer.push(
        `\`${ONDERDELEN_PAD}\` heeft alleen \`/\`: de zoekregel van de template (\`${ONDERDELEN_SCRIPT}\`) draaide niet. Heeft de app meer schermen, dan zegt de test \`tests/unit/onderdelen.test.ts\` welke er missen; Claude vult ze aan in /stagetwo-tier1:verder-werken.`,
      );
    }
    mkdirSync(dirname(join(map, ONDERDELEN_PAD)), { recursive: true });
    writeFileSync(join(map, ONDERDELEN_PAD), onderdelenBestand(voorstel));
    uit.onderdelen = voorstel;
    uit.paden.push(ONDERDELEN_PAD);
    uit.bijgewerkt.push({
      pad: ONDERDELEN_PAD,
      hoe: routes.length > 1 ? "nieuw, eenmalig; gevuld uit de routes van de app" : "nieuw, eenmalig; alleen `/`, er zijn geen andere routes gevonden",
    });
  }

  return uit;
}

/**
 * De koppen die de skill meegeeft (`--kop <pad> <kop>`) in src/onderdelen.ts zetten. Alleen
 * voor een bestand dat deze ronde zelf heeft neergezet (`onderdelen` uit projectbestanden).
 * Geeft een fout als tekst, of null.
 */
export function zetKoppen(map, onderdelen, koppen) {
  const paden = Object.keys(koppen);
  if (paden.length === 0) return null;
  if (!onderdelen) return `--kop: ${ONDERDELEN_PAD} is deze ronde niet neergezet; pas het aan met /stagetwo-tier1:verder-werken`;
  const onbekend = paden.filter((p) => !onderdelen.onderdelen.some((o) => o.pad === p));
  if (onbekend.length > 0) return `--kop ${onbekend[0]}: dit pad staat niet in de lijst met onderdelen van de droogloop`;
  const leeg = paden.find((p) => !String(koppen[p] ?? "").trim());
  if (leeg) return `--kop ${leeg}: geef de kop van het hoofdscherm mee`;
  writeFileSync(join(map, ONDERDELEN_PAD), onderdelenBestand(onderdelen, koppen));
  return null;
}
