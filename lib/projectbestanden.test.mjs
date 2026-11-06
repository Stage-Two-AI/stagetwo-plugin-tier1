import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import {
  ONDERDELEN_PAD,
  naamUitPad,
  onderdelenBestand,
  onderdelenVoorstel,
  projectbestanden,
  routesVanTemplate,
  ONDERDELEN_SCRIPT,
  zetKoppen,
} from "./projectbestanden.mjs";
import { alleBestanden, appBestanden, nepGit, nepPnpm, opruimen, schrijfBestanden, templateBestanden, tijdelijkeMap } from "./test-hulp.mjs";
import { pasToe } from "./toepassen.mjs";

const ROUTER = `import { Route, Routes } from "react-router-dom";
export function App() {
  return (
    <Routes>
      <Route path="/" element={<Start />} />
      <Route path="/klanten" element={<Klanten />} />
      <Route path="/klanten/:id" element={<Klant />} />
      <Route path="/nieuwe-order" element={<Order />} />
      <Route path="/login" element={<Login />} />
      <Route path="*" element={<NietGevonden />} />
    </Routes>
  );
}
`;


/**
 * Een nep van scripts/lib/onderdelen.mjs uit de template: de zoekregel zelf staat daar (en wordt
 * daar getest); hier telt alleen dat de plugin zijn uitkomst gebruikt.
 */
const NEP_ONDERDELEN = `process.stdout.write(JSON.stringify(["/", "/klanten", "/login", "/nieuwe-order"]) + "\\n");\n`;

const echteNode = {
  draai(map, script) {
    return execFileSync(process.execPath, [script], { cwd: map, encoding: "utf8" });
  },
};

test("routesVanTemplate: de hoofdpaden uit scripts/lib/onderdelen.mjs van de template, of null", () => {
  const map = tijdelijkeMap("pb-routes-");
  try {
    assert.equal(routesVanTemplate(map, echteNode), null, "zonder script");
    schrijfBestanden(map, { [ONDERDELEN_SCRIPT]: NEP_ONDERDELEN });
    assert.deepEqual(routesVanTemplate(map, echteNode), ["/", "/klanten", "/login", "/nieuwe-order"]);
    assert.equal(routesVanTemplate(map, null), null, "zonder node");
    schrijfBestanden(map, { [ONDERDELEN_SCRIPT]: 'console.log(JSON.stringify({ paden: ["/"] }));\n' });
    assert.equal(routesVanTemplate(map, echteNode), null, "geen lijst");
    schrijfBestanden(map, { [ONDERDELEN_SCRIPT]: "process.exit(1);\n" });
    assert.equal(routesVanTemplate(map, echteNode), null, "script faalt");
  } finally {
    opruimen(map);
  }
});

test("zonder zoekregel van de template: alleen / en een regel voor de bouwer, geen wachten", () => {
  const map = tijdelijkeMap("pb-zonder-");
  try {
    const r = projectbestanden({ map, van: 38, naar: 40, node: echteNode });
    assert.equal(r.reden, null);
    assert.deepEqual(r.onderdelen.onderdelen, [{ pad: "/", naam: "Start" }]);
    assert.equal(r.voorDeBouwer.length, 1);
    assert.match(r.voorDeBouwer[0], /verder-werken/);
    assert.doesNotMatch(r.voorDeBouwer[0], /Stage Two/);
  } finally {
    opruimen(map);
  }
});

test("de API is nooit een onderdeel", () => {
  assert.deepEqual(onderdelenVoorstel(["/", "/api", "/plugin"]).geen, ["/api"]);
});

test("het voorstel: inloggen is geen onderdeel, zonder routes alleen /", () => {
  assert.equal(naamUitPad("/"), "Start");
  assert.equal(naamUitPad("/nieuwe-order"), "Nieuwe order");
  assert.deepEqual(onderdelenVoorstel(["/", "/klanten", "/login"]), {
    onderdelen: [
      { pad: "/", naam: "Start" },
      { pad: "/klanten", naam: "Klanten" },
    ],
    geen: ["/login"],
  });
  assert.deepEqual(onderdelenVoorstel([]), { onderdelen: [{ pad: "/", naam: "Start" }], geen: [] });
  assert.deepEqual(onderdelenVoorstel(["/login"]).onderdelen, [{ pad: "/", naam: "Start" }]);
});

test("onderdelenBestand heeft de vorm die de template verwacht, met een kop alleen als die anders is", () => {
  const inhoud = onderdelenBestand(
    { onderdelen: [{ pad: "/", naam: "Start" }, { pad: "/klanten", naam: "Klanten" }], geen: ["/login"] },
    { "/": "Mijn lijst", "/klanten": "Klanten" },
  );
  assert.match(inhoud, /export type Onderdeel = \{ pad: string; naam: string; kop\?: string \};/);
  assert.match(inhoud, /\{ pad: "\/", naam: "Start", kop: "Mijn lijst" \},/);
  assert.match(inhoud, /\{ pad: "\/klanten", naam: "Klanten" \},/);
  assert.match(inhoud, /export const GEEN_ONDERDEEL: string\[\] = \["\/login"\];/);
  assert.ok(!inhoud.includes("—"), "geen em-dash");
});

test("versie 39: onderdelen.ts uit de routes, alleen als hij ontbreekt", () => {
  const map = tijdelijkeMap("pb-39-");
  try {
    schrijfBestanden(map, { "src/App.tsx": ROUTER, [ONDERDELEN_SCRIPT]: NEP_ONDERDELEN });
    const r = projectbestanden({ map, van: 38, naar: 39, node: echteNode });
    assert.equal(r.reden, null);
    assert.deepEqual(r.paden, [ONDERDELEN_PAD]);
    assert.deepEqual(
      r.onderdelen.onderdelen.map((o) => o.pad),
      ["/", "/klanten", "/nieuwe-order"],
    );
    assert.deepEqual(r.onderdelen.geen, ["/login"]);
    assert.match(readFileSync(join(map, ONDERDELEN_PAD), "utf8"), /pad: "\/nieuwe-order", naam: "Nieuwe order"/);
    assert.deepEqual(r.voorDeBouwer, [], "niets voor de bouwer om te doen");

    const eigen = 'export const ONDERDELEN = [{ pad: "/", naam: "Eigen" }];\n';
    schrijfBestanden(map, { [ONDERDELEN_PAD]: eigen });
    const nogEens = projectbestanden({ map, van: 37, naar: 40, node: echteNode });
    assert.deepEqual(nogEens.paden, []);
    assert.equal(readFileSync(join(map, ONDERDELEN_PAD), "utf8"), eigen);
  } finally {
    opruimen(map);
  }
});

test("alleen bij de overgang naar 39: daarvoor en daarna niets", () => {
  const map = tijdelijkeMap("pb-niet-");
  try {
    schrijfBestanden(map, { "src/App.tsx": ROUTER, [ONDERDELEN_SCRIPT]: NEP_ONDERDELEN });
    const voor = alleBestanden(map);
    for (const [van, naar] of [[37, 38], [39, 40]]) {
      const r = projectbestanden({ map, van, naar, node: echteNode });
      assert.deepEqual(r, { bijgewerkt: [], paden: [], voorDeBouwer: [], onderdelen: null, reden: null }, `${van} naar ${naar}`);
    }
    assert.deepEqual(alleBestanden(map), voor);
  } finally {
    opruimen(map);
  }
});

test("zetKoppen: alleen voor een lijst die deze ronde is neergezet, en alleen bekende paden", () => {
  const map = tijdelijkeMap("pb-kop-");
  try {
    const voorstel = { onderdelen: [{ pad: "/", naam: "Start" }, { pad: "/klanten", naam: "Klanten" }], geen: [] };
    schrijfBestanden(map, { [ONDERDELEN_PAD]: onderdelenBestand(voorstel) });
    assert.equal(zetKoppen(map, voorstel, {}), null, "zonder koppen niets te doen");
    assert.match(zetKoppen(map, null, { "/": "Hoi" }), /niet neergezet/);
    assert.match(zetKoppen(map, voorstel, { "/raar": "Hoi" }), /--kop \/raar/);
    assert.match(zetKoppen(map, voorstel, { "/": " " }), /geef de kop/);
    assert.equal(zetKoppen(map, voorstel, { "/": "Mijn lijst" }), null);
    assert.match(readFileSync(join(map, ONDERDELEN_PAD), "utf8"), /\{ pad: "\/", naam: "Start", kop: "Mijn lijst" \}/);
  } finally {
    opruimen(map);
  }
});

test("pasToe van 38 naar 39: de projectbestanden mogen wijzigen en staan in het resultaat", () => {
  const wortel = tijdelijkeMap("pb-kern-");
  try {
    const app = join(wortel, "app");
    const tmpl38 = join(wortel, "t38");
    const tmpl39 = join(wortel, "t39");
    schrijfBestanden(tmpl38, { ...templateBestanden(8), ".claude/stack-version": "38\n" });
    schrijfBestanden(tmpl39, { ...templateBestanden(9), ".claude/stack-version": "39\n" });
    schrijfBestanden(app, { ...appBestanden(), ".claude/stack-version": "38\n", "src/App.tsx": ROUTER, [ONDERDELEN_SCRIPT]: NEP_ONDERDELEN });
    const r = pasToe({ map: app, tmplMap: tmpl39, git: nepGit({ map: app, opTag: { "stack-v38": tmpl38 } }), pnpm: nepPnpm.aanwezig, node: echteNode });
    assert.equal(r.status, "bijgewerkt", r.reden);
    assert.deepEqual(r.projectbestanden, [ONDERDELEN_PAD]);
    assert.ok(r.gewijzigd.includes(ONDERDELEN_PAD));
    assert.ok(r.bijgewerkt.some((b) => b.pad === ONDERDELEN_PAD && /eenmalig/.test(b.hoe)));
    assert.ok(existsSync(join(app, ONDERDELEN_PAD)));
    assert.deepEqual(r.voorDeBouwer, []);
  } finally {
    opruimen(wortel);
  }
});
