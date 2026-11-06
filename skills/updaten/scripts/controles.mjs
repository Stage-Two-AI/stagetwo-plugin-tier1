#!/usr/bin/env node
/**
 * Deel 3e van /stagetwo-tier1:updaten: kijkt met de gh-login van de bouwer wat de inrichting
 * van een bestaande app nog mist (de foutmeldingen van Sentry; zie lib/controles.mjs).
 *
 *   node controles.mjs --json [--repo <eigenaar>/<naam>]
 *
 * Mist er iets, dan zegt `inrichting` of de bouwer App inrichten zelf kan starten
 * (`kanStarten`, met `opdracht`), of wat Stage Two doet (`stageTwo`). Starten doet dit script
 * niet: de skill vraagt het eerst. Eén JSON-object met `status`: klaar | mislukt (`reden`).
 */
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { watMistDeInrichting } from "../../../lib/controles.mjs";
import { eersteRegel, ghAanwezig, ghIngelogd, originUrl, repoUitUrl, sh } from "../../../lib/repo.mjs";
import { lichteBeheerRepos } from "../../nieuwe-app/scripts/nieuwe-app.mjs";

export function leesArgumenten(argv) {
  const arg = { repo: null, json: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--repo") arg.repo = argv[++i] ?? null;
    else if (argv[i] === "--json") arg.json = true;
    else throw new Error(`onbekende optie ${argv[i]}`);
  }
  if (arg.repo !== null && !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(arg.repo)) throw new Error("geef --repo als eigenaar/naam");
  return arg;
}

const ghStandaard = (args) => sh("gh", args);

/** De beheer-repo waarin deze app in toegang.json staat (er kunnen er meer zijn, één per Cloudflare-account). */
export function beheerVoorApp(gh, kandidaten, app) {
  for (const repo of kandidaten) {
    try {
      const toegang = JSON.parse(gh(["api", `repos/${repo}/contents/toegang.json`, "-H", "Accept: application/vnd.github.raw"]));
      if (toegang?.apps?.[app]) return repo;
    } catch {}
  }
  return kandidaten.length === 1 ? kandidaten[0] : null;
}

/** `d`: { gh, cwd, kandidaten } (voor de tests). */
export function controles(arg, { gh = ghStandaard, cwd = process.cwd(), kandidaten = null } = {}) {
  const repo = arg.repo ?? repoUitUrl(originUrl(cwd) ?? "");
  if (!repo) return { status: "mislukt", reden: "deze map heeft geen origin op GitHub; geef --repo eigenaar/naam mee" };
  const [eigenaar, naam] = repo.split("/");
  const lijst = kandidaten ?? lichteBeheerRepos(eigenaar);
  const beheer = beheerVoorApp(gh, lijst, naam);
  const inrichting = watMistDeInrichting(repo, { gh, beheer });
  const metBeheer = beheer && lijst.length > 1 ? ` --beheer ${beheer.split("/")[1]}` : "";
  return {
    status: "klaar",
    repo,
    inrichting: {
      ...inrichting,
      opdracht: inrichting.kanStarten
        ? `node "\${CLAUDE_SKILL_DIR}/../nieuwe-app/scripts/nieuwe-app.mjs" --json --inrichten --eigenaar ${eigenaar} --naam ${naam}${metBeheer}`
        : null,
    },
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let uitkomst;
  try {
    const arg = leesArgumenten(process.argv.slice(2));
    if (!ghAanwezig()) uitkomst = { status: "mislukt", reden: "de GitHub-opdrachtregel (gh) ontbreekt; draai eerst /stagetwo-tier1:installatie" };
    else if (!ghIngelogd()) uitkomst = { status: "mislukt", reden: "log eerst in bij GitHub met `gh auth login`" };
    else uitkomst = controles(arg);
  } catch (fout) {
    uitkomst = { status: "mislukt", reden: eersteRegel(fout) };
  }
  process.stdout.write(`${JSON.stringify(uitkomst, null, 2)}\n`);
  process.exitCode = uitkomst.status === "mislukt" ? 1 : 0;
}
