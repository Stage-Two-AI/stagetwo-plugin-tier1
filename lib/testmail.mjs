/**
 * Het testadres van een app: in de preview en lokaal gaat elke mail van de app naar dit ene
 * adres, wie er ook als ontvanger staat (uitgave 34). Met een kopie van echte gegevens in de
 * testdatabase zou de app anders echte klanten mailen. Zonder testadres verstuurt de app buiten
 * productie niets.
 *
 * Het adres hoort bij de app, niet bij de bouwer: de preview is van iedereen samen. Het staat
 * in `wrangler.jsonc` als `vars.TESTMAIL_ADRES` (geen geheim, gewoon in git); de template zet
 * het daarvandaan door naar de preview en naar `.dev.vars`. Productie gebruikt het niet.
 *
 * /stagetwo-tier1:nieuwe-app vraagt het bij het aanmaken, /stagetwo-tier1:updaten één keer bij
 * een app die het nog niet heeft.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const CONFIG = "wrangler.jsonc";
const SLEUTEL = /("TESTMAIL_ADRES"\s*:\s*")([^"]*)(")/;

/** Een gewoon mailadres: iets@iets.iets, zonder spaties of aanhalingstekens, hooguit 254 tekens. */
export function geldigTestadres(adres) {
  return typeof adres === "string" && adres.length <= 254 && /^[^\s@"\\]+@[^\s@"\\]+\.[^\s@"\\]+$/.test(adres);
}

/**
 * Het testadres van de app in `map`: een adres, "" als de sleutel er staat maar leeg is, of null
 * als de sleutel ontbreekt (een app van vóór template 34; die krijgt hem met de update).
 */
export function leesTestadres(map) {
  const pad = join(map, CONFIG);
  if (!existsSync(pad)) return null;
  const m = SLEUTEL.exec(readFileSync(pad, "utf8"));
  return m ? m[2].trim() : null;
}

const UITLEG = "// Waar mail buiten productie heen gaat (zie worker/lib/mail.ts).";

/**
 * Zet het testadres in `wrangler.jsonc`; commentaar en de rest blijven staan. `wrangler.jsonc`
 * is van het project, dus een app van vóór template 34 krijgt de sleutel niet met updaten:
 * dan komt hij hier bovenaan in `vars`, of in een nieuw blok `vars` direct onder `"name"`.
 */
export function zetTestadres(map, adres) {
  if (!geldigTestadres(adres)) throw new Error(`"${adres}" is geen geldig mailadres`);
  const pad = join(map, CONFIG);
  if (!existsSync(pad)) throw new Error(`${CONFIG} ontbreekt; staat de app op de template van tier 1?`);
  const tekst = readFileSync(pad, "utf8");
  let nieuw;
  if (SLEUTEL.test(tekst)) {
    nieuw = tekst.replace(SLEUTEL, (_, voor, _oud, na) => `${voor}${adres}${na}`);
  } else if (/^ {2}"vars"\s*:\s*\{[ \t]*\r?\n/m.test(tekst)) {
    nieuw = tekst.replace(
      /^( {2}"vars"\s*:\s*\{[ \t]*\r?\n)/m,
      `$1    ${UITLEG}\n    "TESTMAIL_ADRES": "${adres}",\n`,
    );
  } else if (/^ {2}"name"\s*:\s*"[^"]*",[ \t]*\r?\n/m.test(tekst)) {
    nieuw = tekst.replace(
      /^( {2}"name"\s*:\s*"[^"]*",[ \t]*\r?\n)/m,
      `$1  "vars": {\n    ${UITLEG}\n    "TESTMAIL_ADRES": "${adres}"\n  },\n`,
    );
  } else {
    throw new Error(`${CONFIG} heeft geen "name" op het bovenste niveau; zet TESTMAIL_ADRES met de hand onder "vars"`);
  }
  writeFileSync(pad, nieuw);
}
