import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { schrijfBestanden, tijdelijkeMap } from "../../../lib/test-hulp.mjs";
import {
  STAGE_TWO_LOGIN,
  controleerArgumenten,
  geldigeNaam,
  kiesReviewer,
  leesArgumenten,
  leesInrichting,
  nogTeDoen,
  nogTeDoenNaInrichting,
  controleerToegang,
  foutTekst,
  hervatBesluit,
  installeer,
  kiesBeheerRepo,
  lichteBeheerRepos,
  regelOmgevingen,
  voegAppToe,
  controleerPaden,
  padenZin,
  zorgVoorAppInstallatie,
  appZietRepoNiet,
  vulIn,
  zetCloudflareNamen,
  geldigeOrganisatie,
  licentieTekst,
  organisatieNaam,
  zetLicentie,
  zetPluginBron,
} from "./nieuwe-app.mjs";
import { STAGE_TWO } from "../../../lib/levering.mjs";
import { pluginBron } from "../../../lib/plugin-bron.mjs";

const HIER = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_LIGHT = join(HIER, "..", "..", "..", "..", "app-template-tier1");

function verseTemplate() {
  const map = tijdelijkeMap("nieuwe-app-");
  schrijfBestanden(map, {
    "README.md": "# <projectnaam>\n\n<!-- Vervang <projectnaam> en schrijf hieronder in één zin wat deze app doet,\nvanuit de gebruiker. -->\n\n<!-- Wat deze app doet, in één zin, vanuit de gebruiker geschreven. -->\n\nVerder.\n",
    "AGENTS.md": "# <projectnaam>\n\n<!-- Vervang <projectnaam> en de regel hieronder bij het opzetten van een project. -->\n<!-- Wat deze app doet, in één zin, vanuit de gebruiker geschreven. -->\n\n<!-- stack:begin -->\nkern\n<!-- stack:end -->\n",
    ".github/CODEOWNERS": `/migrations/ @${STAGE_TWO_LOGIN}\n/.github/ @${STAGE_TWO_LOGIN}\n`,
    "migrations/0001_items.sql": "create table items (id integer primary key);\n",
  });
  return map;
}

test("argumenten: alle vlaggen, en een vlag zonder waarde is een fout", () => {
  const a = leesArgumenten(["--json", "--droogloop", "--naam", "voorraad", "--eigenaar", "Org", "--omschrijving", "Voorraad bijhouden", "--map", "/x"]);
  assert.equal(a.json, true);
  assert.equal(a.droogloop, true);
  assert.equal(a.naam, "voorraad");
  assert.equal(a.eigenaar, "Org");
  assert.equal("database" in a, false, "in light is er geen databasestand");
  assert.equal(a.omschrijving, "Voorraad bijhouden");
  assert.equal(a.map, "/x");
  assert.throws(() => leesArgumenten(["--naam"]), /vraagt een waarde/);
  assert.throws(() => leesArgumenten(["--naam", "--json"]), /vraagt een waarde/);
  assert.throws(() => leesArgumenten(["--foo"]), /onbekende optie/);
});

test("naam: kleine letters, cijfers en streepjes; geen hoofdletters, spaties of randstreepjes", () => {
  for (const goed of ["voorraad", "voorraad-app", "app2", "a1"]) assert.equal(geldigeNaam(goed), true, goed);
  for (const fout of ["Voorraad", "voorraad app", "-voorraad", "voorraad-", "", "a", "ä"]) assert.equal(geldigeNaam(fout), false, fout);
});

test("argumenten: geen databasekeuze in light; --database en --gedeeld-* geven een duidelijke fout", () => {
  for (const vlag of [["--database", "eigen"], ["--database", "geen"], ["--database", "gedeeld"], ["--gedeeld-eigenaar", "Org/erp"], ["--gedeeld-ref", "abc"]]) {
    assert.throws(
      () => leesArgumenten(["--droogloop", "--naam", "x1", "--eigenaar", "Org", ...vlag]),
      /bestaat niet in tier 1.*D1-database en R2-bestanden/,
      vlag.join(" "),
    );
  }
});

test("controle: precies één modus, geldige naam en eigenaar", () => {
  const basis = { droogloop: true, doeHet: false, naam: "voorraad", eigenaar: "Org" };
  assert.equal(controleerArgumenten(basis), null);
  assert.match(controleerArgumenten({ ...basis, doeHet: true }), /precies één/);
  assert.match(controleerArgumenten({ ...basis, droogloop: false }), /precies één/);
  assert.equal(controleerArgumenten({ ...basis, droogloop: false, inrichten: true }), null);
  assert.match(controleerArgumenten({ ...basis, naam: "Voorraad" }), /kleine letters/);
  assert.match(controleerArgumenten({ ...basis, eigenaar: null }), /--eigenaar/);
  assert.match(controleerArgumenten({ ...basis, naam: "a".repeat(42) }), /41 tekens/);
  assert.match(controleerArgumenten({ ...basis, groepen: ["Kantoor"] }), /--groepen/);
  assert.equal(controleerArgumenten({ ...basis, groepen: ["kantoor", "it"] }), null);
  assert.deepEqual(leesArgumenten(["--inrichten", "--naam", "x1", "--eigenaar", "Org", "--groepen", "kantoor, it"]).groepen, ["kantoor", "it"]);
});

test("reviewer: altijd de bouwer zelf, ook als Stage Two lid is", () => {
  assert.equal(kiesReviewer({ login: "bart" }), "bart");
});

test("invullen: projectnaam, omschrijving en reviewer erin, aanwijzingen eruit", () => {
  const map = verseTemplate();
  vulIn(map, { naam: "voorraad", omschrijving: "Zien wat er op voorraad is.", reviewer: "bart" });
  const readme = readFileSync(join(map, "README.md"), "utf8");
  const agents = readFileSync(join(map, "AGENTS.md"), "utf8");
  assert.match(readme, /^# voorraad\n/);
  assert.doesNotMatch(readme, /Vervang/);
  assert.match(readme, /Zien wat er op voorraad is\./);
  assert.match(agents, /^# voorraad\n/);
  assert.match(agents, /Zien wat er op voorraad is\./);
  assert.match(agents, /stack:begin/, "de markeringen blijven staan");
  assert.equal(readFileSync(join(map, ".github/CODEOWNERS"), "utf8"), "/migrations/ @bart\n/.github/ @bart\n");
});

test("invullen: zonder omschrijving blijft de plek staan, en een ontbrekend bestand is een fout", () => {
  const map = verseTemplate();
  vulIn(map, { naam: "voorraad", omschrijving: null, reviewer: STAGE_TWO_LOGIN });
  assert.match(readFileSync(join(map, "AGENTS.md"), "utf8"), /Wat deze app doet/);
  const leeg = tijdelijkeMap("nieuwe-app-leeg-");
  assert.throws(() => vulIn(leeg, { naam: "x", omschrijving: null, reviewer: "x" }), /README.md ontbreekt/);
});

test("nog te doen: Worker, deur, D1 en R2 via de beheer-repo, ruleset alleen als die faalde", () => {
  const goed = nogTeDoen({ ruleset: { gelukt: true } });
  assert.equal(goed.length, 2);
  assert.match(goed[0], /D1 en R2/);
  assert.match(goed[0], /beheer-repo/);
  assert.match(goed[1], /Sentry/);
  const open = nogTeDoen({ ruleset: { gelukt: false } });
  assert.equal(open.length, 3);
  assert.match(open[0], /niet beschermd/);
  for (const regel of [...goed, ...open]) {
    assert.doesNotMatch(regel, /Vercel|Supabase/);
    assert.doesNotMatch(regel, /\u2014/);
  }
});

test("inrichting lezen: de laatste INRICHTING-regel uit een logboek met voorvoegsels", () => {
  const log = [
    "inrichten\tCloudflare inrichten\t2026-09-22T10:00:00Z ::add-mask::geheim",
    'inrichten\tCloudflare inrichten\t2026-09-22T10:00:01Z INRICHTING {"status":"gelukt","worker":"voorraad"}',
    "inrichten\tSamenvatting\t2026-09-22T10:00:02Z klaar",
  ].join("\n");
  assert.deepEqual(leesInrichting(log), { status: "gelukt", worker: "voorraad" });
  assert.equal(leesInrichting("niets hier"), null);
  assert.equal(leesInrichting("INRICHTING {kapot"), null);
});

test("na inrichting: eerste uitrol, waarschuwingen doorgeven, altijd Sentry", () => {
  const kaal = nogTeDoenNaInrichting({ resultaat: { status: "gelukt", waarschuwingen: [] } });
  assert.equal(kaal.length, 2);
  assert.match(kaal[0], /eerste uitrol/);
  assert.match(kaal[0], /database-id's in wrangler\.jsonc/);
  const met = nogTeDoenNaInrichting({ resultaat: { status: "gelukt", waarschuwingen: ["geen session pooler"] } });
  assert.equal(met.length, 3);
  assert.match(met[1], /session pooler/);
});

test("toegang.json: staat de app erin, en toevoegen laat de rest precies staan", () => {
  const toegang = {
    $beschrijving: "wie bij welke app mag",
    groepen: { kantoor: { domeinen: ["richplant.nl"] }, it: { adressen: ["it@richplant.nl"] } },
    apps: { oud: ["it"] },
  };
  assert.deepEqual(controleerToegang(toegang, "oud"), { staatErin: true, groepen: ["kantoor", "it"] });
  assert.deepEqual(controleerToegang(toegang, "nieuw"), { staatErin: false, groepen: ["kantoor", "it"] });
  assert.equal(controleerToegang({ groepen: {}, apps: { leeg: [] } }, "leeg").staatErin, false, "een app zonder groep telt niet");
  assert.equal(controleerToegang({}, "x").staatErin, false);
  const na = voegAppToe(toegang, "nieuw", ["kantoor"]);
  assert.deepEqual(na.apps, { oud: ["it"], nieuw: ["kantoor"] });
  assert.equal(na.$beschrijving, toegang.$beschrijving);
  assert.deepEqual(na.groepen, toegang.groepen);
  assert.deepEqual(toegang.apps, { oud: ["it"] }, "het origineel blijft onaangeroerd");
});

test("toegang.json: ook de lange vorm met publieke paden telt als 'staat erin'", () => {
  // Echt geval (anjevangelder, 16-10-2026): na de merge gaf --inrichten ten onrechte kies-groepen.
  const toegang = {
    groepen: { christijn: { adressen: ["c@voorbeeld.nl"] } },
    apps: {
      site: { groepen: ["christijn"], publiek: ["/*"], dicht: ["/beheer", "/api/beheer/*"] },
      zonder: { publiek: ["/*"] },
    },
  };
  assert.equal(controleerToegang(toegang, "site").staatErin, true);
  assert.equal(controleerToegang(toegang, "zonder").staatErin, false, "zonder groepen telt niet");
});

test("toegang.json: met --publiek de lange vorm, zonder de korte", () => {
  const toegang = { groepen: { kantoor: {} }, apps: {} };
  assert.deepEqual(voegAppToe(toegang, "a", ["kantoor"]).apps.a, ["kantoor"]);
  assert.deepEqual(voegAppToe(toegang, "a", ["kantoor"], { publiek: ["/*"], dicht: ["/beheer", "/beheer/*"] }).apps.a, {
    groepen: ["kantoor"],
    publiek: ["/*"],
    dicht: ["/beheer", "/beheer/*"],
  });
  assert.deepEqual(voegAppToe(toegang, "a", ["kantoor"], { publiek: ["/galerij/*"] }).apps.a, {
    groepen: ["kantoor"],
    publiek: ["/galerij/*"],
  });
  assert.match(padenZin({ publiek: ["/*"], dicht: ["/beheer"] }), /hele app is publiek, behalve `\/beheer`/);
  assert.equal(padenZin({}), "");
});

test("argumenten: --publiek en --dicht volgen de regels van de beheer-repo", () => {
  const a = leesArgumenten(["--inrichten", "--naam", "site", "--eigenaar", "Org", "--groepen", "k", "--publiek", "/*", "--dicht", "/beheer, /beheer/*,/api/beheer/*"]);
  assert.deepEqual(a.publiek, ["/*"]);
  assert.deepEqual(a.dicht, ["/beheer", "/beheer/*", "/api/beheer/*"]);
  assert.equal(controleerArgumenten(a), null);
  assert.equal(controleerPaden(["/galerij", "/api/feed/*"], []), null);
  assert.match(controleerPaden(["/"], []), /met \/ beginnen/);
  assert.match(controleerPaden(["/a*b"], []), /met \/ beginnen/);
  assert.match(controleerPaden(["/*", "/x"], []), /hele site/);
  assert.match(controleerPaden([], ["/beheer"]), /alleen bij --publiek/);
  assert.match(controleerPaden(["/galerij"], ["/beheer"]), /alleen bij --publiek/);
});

test("GitHub App: zet de app-repo erbij als de App alleen gekozen repo's ziet", () => {
  const nep = (repos, { magNiet = false } = {}) => {
    const aanroepen = [];
    const gh = (args) => {
      aanroepen.push(args.join(" "));
      if (args[1].startsWith("orgs/")) {
        if (magNiet) throw new Error("HTTP 403");
        return [
          { id: 1, app_slug: "claude", repository_selection: "all" },
          { id: 2, app_slug: "beheer-app", repository_selection: "selected" },
        ];
      }
      if (args[1].startsWith("user/installations/2/repositories?")) return repos.map((name) => ({ name }));
      if (args[1] === "repos/Org/site") return { id: 99 };
      if (args.includes("PUT")) return null;
      throw new Error(`onverwacht: ${args.join(" ")}`);
    };
    return { gh, aanroepen };
  };
  const a = nep(["beheer-tier1", "oud"]);
  assert.deepEqual(zorgVoorAppInstallatie("Org", "Org/beheer-tier1", "Org/site", a.gh), { status: "toegevoegd", app: "beheer-app" });
  assert.ok(a.aanroepen.some((x) => x.includes("-X PUT user/installations/2/repositories/99")));

  const b = nep(["beheer-tier1", "site"]);
  assert.equal(zorgVoorAppInstallatie("Org", "Org/beheer-tier1", "Org/site", b.gh).status, "goed");
  assert.ok(!b.aanroepen.some((x) => x.includes("PUT")), "staat er al: niets doen");

  assert.equal(zorgVoorAppInstallatie("Org", "Org/beheer-tier1", "Org/site", nep([], { magNiet: true }).gh).status, "onbekend", "geen owner: gewoon door");
  assert.equal(zorgVoorAppInstallatie("Org", "Org/beheer-tier1", "Org/site", nep(["iets-anders"]).gh).status, "goed", "niet de App van deze beheer-repo");
});

test("GitHub App: herkent in het logboek dat de App de repo niet ziet", () => {
  assert.equal(appZietRepoNiet("##[error]Not Found - https://docs.github.com/rest/apps/apps#get-a-repository-installation-for-the-authenticated-app"), true);
  assert.equal(appZietRepoNiet("INRICHTING {}"), false);
});

// Een verkleinde wrangler.jsonc in de vorm van de light-template: commentaar, de proefnamen,
// nullen als database-id en een env.preview met eigen opslag.
const WRANGLER = `// Hoe deze app op Cloudflare draait (stack-light).
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "light-proef",
  "main": "worker/index.ts",
  // Tijdelijke stand: nog geen eigen domein.
  "workers_dev": true,
  "preview_urls": true,
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "light-proef",
      "database_id": "00000000-0000-0000-0000-000000000000",
      "migrations_dir": "migrations"
    }
  ],
  "r2_buckets": [{ "binding": "BESTANDEN", "bucket_name": "light-proef", "jurisdiction": "eu" }],
  "env": {
    // De previews van pull requests: een eigen database en eigen bestanden.
    "preview": {
      "vars": { "OMGEVING": "test" },
      "d1_databases": [
        {
          "binding": "DB",
          "database_name": "light-proef-test",
          "database_id": "00000000-0000-0000-0000-000000000001",
          "migrations_dir": "migrations"
        }
      ],
      "r2_buckets": [
        { "binding": "BESTANDEN", "bucket_name": "light-proef-test", "jurisdiction": "eu" }
      ]
    }
  }
}
`;

/** wrangler.jsonc zonder commentaar en losse komma's, om de uitkomst als JSON te lezen. */
function leesJsonc(tekst) {
  return JSON.parse(tekst.replace(/^\s*\/\/.*$/gm, "").replace(/,(\s*[}\]])/g, "$1"));
}

test("Cloudflare-namen: Worker, database en bestanden voor productie <naam>, voor de previews <naam>-test", () => {
  const map = tijdelijkeMap("cf-namen-");
  schrijfBestanden(map, { "wrangler.jsonc": WRANGLER });
  zetCloudflareNamen(map, "richplant-start");
  const na = readFileSync(join(map, "wrangler.jsonc"), "utf8");
  const config = leesJsonc(na);
  assert.equal(config.name, "richplant-start");
  assert.equal(config.d1_databases[0].database_name, "richplant-start");
  assert.equal(config.r2_buckets[0].bucket_name, "richplant-start");
  assert.equal(config.env.preview.d1_databases[0].database_name, "richplant-start-test");
  assert.equal(config.env.preview.r2_buckets[0].bucket_name, "richplant-start-test");
  assert.doesNotMatch(na, /light-proef/, "geen proefnaam meer over");
});

test("Cloudflare-namen: de database-id's blijven de nullen en het commentaar blijft staan", () => {
  const map = tijdelijkeMap("cf-namen-");
  schrijfBestanden(map, { "wrangler.jsonc": WRANGLER });
  zetCloudflareNamen(map, "voorraad");
  const na = readFileSync(join(map, "wrangler.jsonc"), "utf8");
  const config = leesJsonc(na);
  assert.equal(config.d1_databases[0].database_id, "00000000-0000-0000-0000-000000000000");
  assert.equal(config.env.preview.d1_databases[0].database_id, "00000000-0000-0000-0000-000000000001");
  assert.match(na, /\/\/ Tijdelijke stand: nog geen eigen domein\./);
  assert.match(na, /\/\/ De previews van pull requests/);
  // Alleen de namen zijn anders: zet ze terug en het bestand is weer precies de template.
  const terug = na.replaceAll("voorraad-test", "light-proef-test").replaceAll('"voorraad"', '"light-proef"');
  assert.equal(terug, WRANGLER);
  // Twee keer draaien (hervatten) geeft hetzelfde.
  zetCloudflareNamen(map, "voorraad");
  assert.equal(readFileSync(join(map, "wrangler.jsonc"), "utf8"), na);
});

test("Cloudflare-namen: ontbrekend bestand, geen name, geen env.preview of een dubbele database is een fout", () => {
  const leeg = tijdelijkeMap("cf-namen-");
  assert.throws(() => zetCloudflareNamen(leeg, "x1"), /wrangler.jsonc ontbreekt/);
  schrijfBestanden(leeg, { "wrangler.jsonc": "{}\n" });
  assert.throws(() => zetCloudflareNamen(leeg, "x1"), /"name"/);
  schrijfBestanden(leeg, { "wrangler.jsonc": WRANGLER.replace(/"env"[\s\S]*\n {2}\}\n/, '"env": {}\n') });
  assert.throws(() => zetCloudflareNamen(leeg, "x1"), /env\.preview/);
  schrijfBestanden(leeg, { "wrangler.jsonc": WRANGLER.replace('"r2_buckets": [{ "binding": "BESTANDEN", "bucket_name": "light-proef", "jurisdiction": "eu" }],', "") });
  assert.throws(() => zetCloudflareNamen(leeg, "x1"), /0 keer "bucket_name" voor productie/);
});

test(
  "Cloudflare-namen: werkt op de echte wrangler.jsonc van de light-template",
  { skip: !existsSync(join(TEMPLATE_LIGHT, "wrangler.jsonc")) && "app-template-tier1 staat niet naast deze repo" },
  () => {
    const map = tijdelijkeMap("cf-namen-echt-");
    schrijfBestanden(map, { "wrangler.jsonc": readFileSync(join(TEMPLATE_LIGHT, "wrangler.jsonc"), "utf8") });
    zetCloudflareNamen(map, "fotografie");
    const config = leesJsonc(readFileSync(join(map, "wrangler.jsonc"), "utf8"));
    assert.equal(config.name, "fotografie");
    assert.deepEqual(config.d1_databases.map((d) => d.database_name), ["fotografie"]);
    assert.deepEqual(config.r2_buckets.map((b) => b.bucket_name), ["fotografie"]);
    assert.deepEqual(config.env.preview.d1_databases.map((d) => d.database_name), ["fotografie-test"]);
    assert.deepEqual(config.env.preview.r2_buckets.map((b) => b.bucket_name), ["fotografie-test"]);
    for (const d of [...config.d1_databases, ...config.env.preview.d1_databases]) {
      assert.match(d.database_id, /^0{8}-0{4}-0{4}-0{4}-0{11}\d$/, "de id's vult App inrichten");
    }
  },
);

test("foutTekst: de hele melding, niet alleen de eerste regel, en hooguit de staart", () => {
  const fout = Object.assign(new Error("Command failed: pnpm install"), {
    stderr: "ERR_PNPM_X  Could not resolve the installed @pnpm/exe at C:\\Users\\bob\\AppData\\Local\\pnpm\n\nDetails: EPERM\n",
  });
  const tekst = foutTekst(fout);
  assert.match(tekst, /C:\\Users\\bob/);
  assert.match(tekst, /Details: EPERM/);
  const lang = { stderr: Array.from({ length: 60 }, (_, i) => `regel ${i + 1}`).join("\n") };
  const staart = foutTekst(lang, 40).split("\n");
  assert.equal(staart[0], "…");
  assert.equal(staart.at(-1), "regel 60");
  assert.equal(staart.length, 41);
  assert.equal(foutTekst(new Error("alleen een bericht")), "alleen een bericht");
});

test("installeer: eerst pnpm --version, en bij een fout de install nog één keer", () => {
  const aanroepen = [];
  let fouten = 1;
  const run = (...args) => {
    aanroepen.push(args.join(" "));
    if (args[0] === "install" && fouten-- > 0) throw new Error("versiewissel mislukt");
    return "";
  };
  assert.deepEqual(installeer("/x", { run }), { pogingen: 2 });
  assert.deepEqual(aanroepen, ["--version", "install --silent", "install --silent"]);

  const goed = [];
  assert.deepEqual(installeer("/x", { run: (...a) => goed.push(a.join(" ")) }), { pogingen: 1 });
  assert.deepEqual(goed, ["--version", "install --silent"]);

  assert.throws(() => installeer("/x", { run: (a) => { if (a === "install") throw new Error("kapot"); } }), /kapot/);
});

test("hervatBesluit: nieuw, hervatten, of weigeren als het niet van ons is", () => {
  assert.equal(hervatBesluit({ repo: false, map: false }).besluit, "nieuw");
  assert.equal(hervatBesluit({ repo: true, uitTemplate: true, map: false }).besluit, "hervat");
  assert.equal(hervatBesluit({ repo: true, uitTemplate: true, map: true, mapIsKloon: true }).besluit, "hervat");
  assert.equal(hervatBesluit({ repo: true, uitTemplate: false, map: false }).besluit, "weiger");
  assert.equal(hervatBesluit({ repo: true, uitTemplate: true, map: true, mapIsKloon: false }).besluit, "weiger");
  assert.equal(hervatBesluit({ repo: false, map: true }).besluit, "weiger");
});

function nepGitHub(beginstand) {
  const omgevingen = structuredClone(beginstand);
  let volgendId = 100;
  const log = [];
  const api = (methode, pad, velden = {}) => {
    log.push(`${methode} ${pad}`);
    const m = /environments(?:\/([^/?]+))?(?:\/(deployment-branch-policies|secrets)(?:\/(\d+))?)?/.exec(pad);
    const [, naam, sub, id] = m;
    if (!naam) return { environments: Object.keys(omgevingen).map((n) => ({ name: n })) };
    if (methode === "PUT" && !sub) {
      omgevingen[naam] ??= { regels: [], geheimen: 0 };
      omgevingen[naam].beperkt = velden["deployment_branch_policy[custom_branch_policies]"] === true;
      return {};
    }
    if (methode === "DELETE" && !sub) {
      delete omgevingen[naam];
      return null;
    }
    if (sub === "secrets") return { total_count: omgevingen[naam].geheimen };
    if (methode === "GET") return { branch_policies: omgevingen[naam].regels };
    if (methode === "POST") {
      omgevingen[naam].regels.push({ id: volgendId++, name: velden.name, type: velden.type });
      return {};
    }
    if (methode === "DELETE") {
      omgevingen[naam].regels = omgevingen[naam].regels.filter((r) => r.id !== Number(id));
      return null;
    }
    throw new Error(`onverwacht: ${methode} ${pad}`);
  };
  return { api, omgevingen, log };
}

test("regelOmgevingen: production en preview alleen main, ook als ze al bestonden met een ruimere regel", () => {
  const gh = nepGitHub({
    production: { regels: [], geheimen: 0 },
    preview: { regels: [{ id: 1, name: "*", type: "branch" }], geheimen: 0 },
  });
  const gedaan = regelOmgevingen("Org/app", { api: gh.api });
  for (const naam of ["production", "preview"]) {
    assert.equal(gh.omgevingen[naam].beperkt, true);
    assert.deepEqual(gh.omgevingen[naam].regels.map((r) => r.name), ["main"]);
  }
  assert.deepEqual(gedaan, ["production: alleen main", "preview: alleen main"]);

  // Nog een keer draaien verandert niets en voegt main niet dubbel toe.
  regelOmgevingen("Org/app", { api: gh.api });
  assert.deepEqual(gh.omgevingen.production.regels.map((r) => r.name), ["main"]);
});

test("regelOmgevingen: maakt ontbrekende omgevingen aan en laat andere omgevingen met rust", () => {
  const gh = nepGitHub({ "eigen-omgeving": { regels: [], geheimen: 2 } });
  regelOmgevingen("Org/app", { api: gh.api });
  assert.deepEqual(gh.omgevingen.production.regels.map((r) => r.name), ["main"]);
  assert.deepEqual(gh.omgevingen.preview.regels.map((r) => r.name), ["main"]);
  assert.ok(gh.omgevingen["eigen-omgeving"], "geen opruimwerk meer: light heeft geen proef-omgeving");
  assert.ok(!gh.log.some((r) => r.startsWith("DELETE repos/Org/app/environments/eigen-omgeving")));
});

test("lichteBeheerRepos: zoekt op inhoud, niet op naam; alleen light-beheer-repo's tellen", () => {
  const namen = () => ["app", "stagetwo-beheer", "stagetwo-beheer-light", "christijn-beheer-light", "beheer-notities"];
  const light = (...repos) => (r) => repos.includes(r);
  assert.deepEqual(
    lichteBeheerRepos("org", namen, light("org/stagetwo-beheer-light", "org/christijn-beheer-light")),
    ["org/christijn-beheer-light", "org/stagetwo-beheer-light"],
  );
  // Alleen een beheer-repo van het Cloudflare+Supabase-spoor: niets.
  assert.deepEqual(lichteBeheerRepos("org", namen, light()), []);
  // Een klant met de oude naam.
  assert.deepEqual(lichteBeheerRepos("klant", () => ["stack-beheer"], () => true), ["klant/stack-beheer"]);
});

test("kiesBeheerRepo: één is vanzelf, meer is kiezen, een verkeerde keuze is een fout", () => {
  assert.deepEqual(kiesBeheerRepo("klant", ["klant/stagetwo-beheer"]), { repo: "klant/stagetwo-beheer" });
  assert.deepEqual(kiesBeheerRepo("klant", []), { repo: null });
  const twee = ["org/christijn-beheer-light", "org/stagetwo-beheer-light"];
  assert.deepEqual(kiesBeheerRepo("org", twee), { kies: twee });
  assert.deepEqual(kiesBeheerRepo("org", twee, "stagetwo-beheer-light"), { repo: "org/stagetwo-beheer-light" });
  assert.match(kiesBeheerRepo("org", twee, "stagetwo-beheer").fout, /geen beheer-repo van het lichte spoor/);
});

test("--beheer: alleen een repo-naam zonder eigenaar", () => {
  const basis = ["--inrichten", "--naam", "app", "--eigenaar", "org"];
  assert.equal(controleerArgumenten(leesArgumenten([...basis, "--beheer", "stagetwo-beheer-light"])), null);
  assert.match(controleerArgumenten(leesArgumenten([...basis, "--beheer", "org/stagetwo-beheer"])), /zonder eigenaar/);
});

// ---------------------------------------------------------------- levering: bron en licentie

const SETTINGS_TEMPLATE = `{
  "extraKnownMarketplaces": {
    "stagetwo-tier1": {
      "source": {
        "source": "github",
        "repo": "Stage-Two-AI/stagetwo-plugin-tier1"
      },
      "autoUpdate": true
    }
  },
  "enabledPlugins": {
    "stagetwo-tier1@stagetwo-tier1": true
  }
}
`;

test("zetPluginBron: bij een abonnee wijst de app naar zijn eigen kopie van de plugin", () => {
  const map = verseTemplate();
  schrijfBestanden(map, { ".claude/settings.json": SETTINGS_TEMPLATE });
  assert.equal(zetPluginBron(map, "Richplant-BV/stagetwo-plugin-tier1"), "Richplant-BV/stagetwo-plugin-tier1");
  const na = readFileSync(join(map, ".claude/settings.json"), "utf8");
  assert.equal(na, SETTINGS_TEMPLATE.replace("Stage-Two-AI/stagetwo-plugin-tier1", "Richplant-BV/stagetwo-plugin-tier1"));
  assert.equal(zetPluginBron(map, "Richplant-BV/stagetwo-plugin-tier1"), "Richplant-BV/stagetwo-plugin-tier1", "tweede keer: niets te doen");
});

test("zetPluginBron: zonder levering.json (eigen apps van Stage Two) blijft de bronrepo", () => {
  const map = verseTemplate();
  schrijfBestanden(map, { ".claude/settings.json": SETTINGS_TEMPLATE });
  assert.equal(zetPluginBron(map, STAGE_TWO.plugin), STAGE_TWO.plugin);
  assert.equal(readFileSync(join(map, ".claude/settings.json"), "utf8"), SETTINGS_TEMPLATE);
  assert.equal(zetPluginBron(verseTemplate(), "Klant/x"), null, "geen settings: niets te doen");
});

test("licentieTekst: eigen code van de organisatie, onderdelen van Stage Two in LICENSE-STAGE-TWO", () => {
  const tekst = licentieTekst("Richplant B.V.", 2026);
  assert.match(tekst, /Copyright \(c\) 2026 Richplant B\.V\./);
  assert.match(tekst, /is van Richplant B\.V\. Alle rechten voorbehouden/);
  assert.match(tekst, /LICENSE-STAGE-TWO/);
  assert.doesNotMatch(tekst, /<organisatie>|MIT|\u2014/);
});

test("zetLicentie: vervangt de LICENSE van de template, laat LICENSE-STAGE-TWO en een eigen LICENSE staan", () => {
  const map = verseTemplate();
  schrijfBestanden(map, { LICENSE: "Licentie van deze app\n\nis van <organisatie>.\n", "LICENSE-STAGE-TWO": "Gebruiksrecht Stage Two\n" });
  assert.deepEqual(zetLicentie(map, " Richplant B.V. "), { gezet: true, organisatie: "Richplant B.V." });
  assert.match(readFileSync(join(map, "LICENSE"), "utf8"), /is van Richplant B\.V\./);
  assert.equal(readFileSync(join(map, "LICENSE-STAGE-TWO"), "utf8"), "Gebruiksrecht Stage Two\n");
  // Hervatten of een eigen LICENSE: niet nog eens overschrijven.
  writeFileSync(join(map, "LICENSE"), "MIT License\nCopyright (c) 2026 Richplant\n");
  assert.equal(zetLicentie(map, "Ander").gezet, false);
  assert.match(readFileSync(join(map, "LICENSE"), "utf8"), /Copyright \(c\) 2026 Richplant/);
});

test("zetLicentie: een oudere template zonder LICENSE-STAGE-TWO blijft zoals hij is", () => {
  const map = verseTemplate();
  schrijfBestanden(map, { LICENSE: "MIT License\n\nCopyright (c) 2026 Stage Two\n" });
  const r = zetLicentie(map, "Richplant B.V.");
  assert.equal(r.gezet, false);
  assert.match(r.reden, /LICENSE-STAGE-TWO/);
  assert.equal(readFileSync(join(map, "LICENSE"), "utf8"), "MIT License\n\nCopyright (c) 2026 Stage Two\n");
});

test("organisatie: --organisatie wint, dan de naam op GitHub, dan de inlognaam", () => {
  assert.equal(organisatieNaam("Richplant-BV", "Richplant B.V.", () => "Iets anders"), "Richplant B.V.");
  assert.equal(organisatieNaam("Richplant-BV", null, () => "Richplant"), "Richplant");
  assert.equal(organisatieNaam("Richplant-BV", null, () => null), "Richplant-BV");
  assert.equal(organisatieNaam("Richplant-BV", null, () => "regel\nbreuk"), "Richplant-BV");
  assert.equal(geldigeOrganisatie("Winco Holland B.V."), true);
  for (const fout of ["", "x", "a\nb", "<organisatie>", "x".repeat(101)]) assert.equal(geldigeOrganisatie(fout), false, fout);
});

test("argumenten: --organisatie wordt gelezen en gecontroleerd", () => {
  const a = leesArgumenten(["--droogloop", "--naam", "voorraad", "--eigenaar", "Org", "--organisatie", "Org B.V."]);
  assert.equal(a.organisatie, "Org B.V.");
  assert.equal(controleerArgumenten(a), null);
  assert.match(controleerArgumenten({ ...a, organisatie: "a\nb" }), /--organisatie/);
});
