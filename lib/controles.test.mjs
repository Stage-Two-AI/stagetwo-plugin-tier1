import assert from "node:assert/strict";
import { test } from "node:test";
import { watMistDeInrichting } from "./controles.mjs";

const fout = (t) => Object.assign(new Error(t), { stderr: t });
function nepGh(antwoorden) {
  return (args) => {
    const a = antwoorden[args[1]];
    if (a === undefined) throw fout("gh: Not Found (HTTP 404)");
    return typeof a === "string" ? a : JSON.stringify(a);
  };
}
const ALLES = {
  "repos/k/app/environments/production": {},
  "repos/k/app/environments/production/variables/VITE_SENTRY_DSN": {},
  "repos/k/app/environments/preview/variables/VITE_SENTRY_DSN": {},
  "repos/k/stagetwo-beheer-tier1/contents/VERSIE": "39\n",
  "repos/k/stagetwo-beheer-tier1/environments/beheer/secrets": { secrets: [{ name: "SENTRY_AUTH_TOKEN" }] },
};
const zonder = (sleutel) => Object.fromEntries(Object.entries(ALLES).filter(([k]) => k !== sleutel));
const B = "k/stagetwo-beheer-tier1";

test("alles gekoppeld: niets te doen", () => {
  const r = watMistDeInrichting("k/app", { gh: nepGh(ALLES), beheer: B });
  assert.deepEqual(r.redenen, []);
  assert.equal(r.kanStarten, false);
});

test("Sentry mist op de preview: de bouwer kan App inrichten starten", () => {
  const r = watMistDeInrichting("k/app", { gh: nepGh(zonder("repos/k/app/environments/preview/variables/VITE_SENTRY_DSN")), beheer: B });
  assert.deepEqual(r.redenen, ["de foutmeldingen (Sentry) zijn nog niet gekoppeld"]);
  assert.equal(r.kanStarten, true);
});

test("wat de bouwer niet kan: wat er niet werkt en wat de owner doet (geen beheer-repo, oude beheer-repo, geen Sentry-token)", () => {
  const basis = zonder("repos/k/app/environments/production/variables/VITE_SENTRY_DSN");
  const geen = watMistDeInrichting("k/app", { gh: nepGh(basis), beheer: null });
  assert.match(geen.owner[0], /de owner van de organisatie start App inrichten/);
  assert.match(geen.gevolgen[0], /niet in Sentry/);
  const oud = watMistDeInrichting("k/app", { gh: nepGh({ ...basis, [`repos/${B}/contents/VERSIE`]: "38" }), beheer: B });
  assert.equal(oud.kanStarten, false);
  assert.match(oud.owner[0], /staat op versie 38/);
  assert.match(oud.owner[0], /gh workflow run app-inrichten\.yml --repo k\/stagetwo-beheer-tier1 -f app=app/);
  const token = watMistDeInrichting("k/app", { gh: nepGh({ ...basis, [`repos/${B}/environments/beheer/secrets`]: { secrets: [] } }), beheer: B });
  assert.equal(token.kanStarten, false);
  assert.match(token.owner[0], /De owner doet dat één keer met zijn eigen Sentry-account/);
  assert.ok(!token.owner.join(" ").includes("Stage Two"));
});

test("nog niet ingericht: niets aanbieden", () => {
  const r = watMistDeInrichting("k/app", { gh: nepGh({}), beheer: B });
  assert.equal(r.ingericht, false);
  assert.deepEqual(r.redenen, []);
});
