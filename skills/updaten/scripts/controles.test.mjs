import assert from "node:assert/strict";
import { test } from "node:test";
import { controles, leesArgumenten } from "./controles.mjs";

const fout = (t) => Object.assign(new Error(t), { stderr: t });
function nepGh(antwoorden) {
  const log = [];
  const gh = (args) => {
    log.push(args);
    const a = antwoorden[args[1]];
    if (a === undefined) throw fout("gh: Not Found (HTTP 404)");
    return typeof a === "string" ? a : JSON.stringify(a);
  };
  return { gh, log };
}

test("argumenten: --repo als eigenaar/naam", () => {
  assert.equal(leesArgumenten(["--repo", "k/app"]).repo, "k/app");
  assert.throws(() => leesArgumenten(["--repo", "app"]), /eigenaar\/naam/);
});

test("controles: de juiste beheer-repo uit meer, en App inrichten aangeboden als Sentry ontbreekt", () => {
  const { gh, log } = nepGh({
    "repos/k/beheer-a/contents/toegang.json": JSON.stringify({ apps: { ander: ["g"] } }),
    "repos/k/beheer-b/contents/toegang.json": JSON.stringify({ apps: { app: ["g"] } }),
    "repos/k/app/environments/production": {},
    "repos/k/app/environments/production/variables/VITE_SENTRY_DSN": {},
    "repos/k/beheer-b/contents/VERSIE": "39",
  });
  const r = controles({ repo: "k/app" }, { gh, kandidaten: ["k/beheer-a", "k/beheer-b"] });
  assert.equal(r.inrichting.beheer, "k/beheer-b");
  assert.equal(r.inrichting.kanStarten, true);
  assert.match(r.inrichting.opdracht, /--inrichten --eigenaar k --naam app --beheer beheer-b$/);
  assert.ok(!log.some((a) => a.includes("workflow")), "starten doet de skill pas na een ja");
});
