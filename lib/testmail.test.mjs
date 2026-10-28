import assert from "node:assert/strict";
import { readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { schrijfBestanden, tijdelijkeMap } from "./test-hulp.mjs";
import { geldigTestadres, leesTestadres, zetTestadres } from "./testmail.mjs";

const WRANGLER = `{
  // De Worker van deze app.
  "name": "voorbeeld",
  "vars": {
    // Waar mail in de preview en lokaal heen gaat (zie worker/lib/mail.ts).
    "TESTMAIL_ADRES": ""
  }
}
`;

function app(tekst) {
  const map = tijdelijkeMap("testmail-");
  schrijfBestanden(map, { "wrangler.jsonc": tekst });
  return map;
}

test("geldigTestadres: een gewoon adres wel, iets anders niet", () => {
  assert.equal(geldigTestadres("test@richplant.nl"), true);
  for (const fout of ["", "geen-adres", "a@b", "met spatie@x.nl", 'a"b@x.nl', null]) {
    assert.equal(geldigTestadres(fout), false, String(fout));
  }
});

test("leesTestadres: null zonder sleutel, leeg zonder waarde, anders het adres", () => {
  const zonder = app('{ "name": "voorbeeld" }\n');
  const leeg = app(WRANGLER);
  const met = app(WRANGLER.replace('""', '"test@richplant.nl"'));
  try {
    assert.equal(leesTestadres(zonder), null);
    assert.equal(leesTestadres(leeg), "");
    assert.equal(leesTestadres(met), "test@richplant.nl");
  } finally {
    for (const m of [zonder, leeg, met]) rmSync(m, { recursive: true, force: true });
  }
});

test("zetTestadres: alleen de waarde verandert, commentaar blijft; een ongeldig adres wordt geweigerd", () => {
  const map = app(WRANGLER);
  try {
    zetTestadres(map, "test@richplant.nl");
    assert.equal(readFileSync(join(map, "wrangler.jsonc"), "utf8"), WRANGLER.replace('""', '"test@richplant.nl"'));
    assert.throws(() => zetTestadres(map, "geen adres"), /geen geldig mailadres/);
  } finally {
    rmSync(map, { recursive: true, force: true });
  }
});

test("zetTestadres: een app van vóór 34 krijgt de sleutel, in vars of in een nieuw blok onder name", () => {
  const metVars = app('{\n  "name": "voorbeeld",\n  "vars": {\n    "IETS": "x"\n  }\n}\n');
  const zonderVars = app('{\n  "name": "voorbeeld",\n  "main": "worker/index.ts"\n}\n');
  const zonderNaam = app("{}\n");
  try {
    zetTestadres(metVars, "test@richplant.nl");
    zetTestadres(zonderVars, "test@richplant.nl");
    for (const m of [metVars, zonderVars]) assert.equal(leesTestadres(m), "test@richplant.nl");
    assert.match(readFileSync(join(metVars, "wrangler.jsonc"), "utf8"), /"TESTMAIL_ADRES": "test@richplant.nl",\n    "IETS": "x"/);
    assert.match(readFileSync(join(zonderVars, "wrangler.jsonc"), "utf8"), /"name": "voorbeeld",\n  "vars": \{\n/);
    assert.throws(() => zetTestadres(zonderNaam, "test@richplant.nl"), /met de hand/);
  } finally {
    for (const m of [metVars, zonderVars, zonderNaam]) rmSync(m, { recursive: true, force: true });
  }
});

test("zetTestadres: een vars-blok op één regel wordt aangevuld, nooit een tweede blok", () => {
  // Het geval uit de melding van 28-10-2026: vars op één regel, verderop in het bestand.
  const melding = app(
    '{\n  "name": "stagetwo-site",\n  "main": "worker/index.ts",\n  "vars": { "LEAD_NOTIFY_TO": "info@stagetwo.nl" },\n  "assets": { "directory": "dist" }\n}\n',
  );
  const leegBlok = app('{\n  "name": "voorbeeld",\n  "vars": {},\n  "main": "worker/index.ts"\n}\n');
  try {
    zetTestadres(melding, "test@richplant.nl");
    zetTestadres(leegBlok, "test@richplant.nl");
    const tekst = readFileSync(join(melding, "wrangler.jsonc"), "utf8");
    assert.equal(tekst.match(/"vars"/g).length, 1);
    assert.match(tekst, /^ {2}"vars": \{ "TESTMAIL_ADRES": "test@richplant.nl", "LEAD_NOTIFY_TO": "info@stagetwo.nl" \},$/m);
    assert.match(readFileSync(join(leegBlok, "wrangler.jsonc"), "utf8"), /^ {2}"vars": \{ "TESTMAIL_ADRES": "test@richplant.nl" \},$/m);
    for (const m of [melding, leegBlok]) assert.equal(leesTestadres(m), "test@richplant.nl");
  } finally {
    for (const m of [melding, leegBlok]) rmSync(m, { recursive: true, force: true });
  }
});

test("zetTestadres: een vars-blok dat het niet kan aanvullen geeft een fout en laat het bestand staan", () => {
  const vormen = [
    '{\n  "name": "voorbeeld",\n  "vars": { // vaste waarden\n    "X": "y"\n  }\n}\n',
    '{\n  "name": "voorbeeld",\n  "vars": /* vast */ { "X": "y" }\n}\n',
  ];
  for (const tekst of vormen) {
    const map = app(tekst);
    try {
      assert.throws(() => zetTestadres(map, "test@richplant.nl"), /heeft al "vars".*met de hand/);
      assert.equal(readFileSync(join(map, "wrangler.jsonc"), "utf8"), tekst);
    } finally {
      rmSync(map, { recursive: true, force: true });
    }
  }
});
