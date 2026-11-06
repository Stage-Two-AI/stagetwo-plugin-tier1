/**
 * Bestaande apps goedzetten bij /stagetwo-tier1:updaten, buiten de bestanden van de app om
 * (besluit Christijn 06-11-2026: een klant hoeft na een uitgave zelf niets te doen).
 *
 * Wat de inrichting van de app nog mist en App inrichten in de beheer-repo zet: de
 * foutmeldingen (Sentry, sinds versie 39 per app vanzelf). Alleen namen, nooit een waarde.
 * Tier 1 heeft geen droogloop van migraties, dus ook geen extra verplichte controle op main.
 *
 * `gh(args)` geeft de uitvoer als tekst en gooit bij een fout (zoals `sh("gh", args)` in
 * lib/repo.mjs); zo kunnen de tests zonder GitHub.
 */
export const VERSIE_SENTRY = 39;

function bestaat(gh, pad) {
  try {
    gh(["api", pad, "--silent"]);
    return true;
  } catch (fout) {
    return /\b404\b|Not Found/i.test(String(fout?.stderr ?? fout?.message ?? "")) ? false : null;
  }
}

function namen(gh, pad, veld) {
  try {
    return JSON.parse(gh(["api", pad]))?.[veld]?.map((x) => x.name) ?? [];
  } catch {
    return null;
  }
}

function raw(gh, pad) {
  try {
    return gh(["api", pad, "-H", "Accept: application/vnd.github.raw"]);
  } catch {
    return null;
  }
}

/**
 * Wat App inrichten voor deze app nog moet zetten. `beheer`: de beheer-repo (of null).
 * Geeft `{ redenen, stageTwo, kanStarten, beheer, beheerVersie, ingericht }`.
 */
export function watMistDeInrichting(repo, { gh, beheer }) {
  const redenen = [];
  const stageTwo = [];
  const ingericht = bestaat(gh, `repos/${repo}/environments/production`);
  if (ingericht === false) return { redenen, stageTwo, kanStarten: false, beheer, beheerVersie: null, ingericht: false };

  const productie = bestaat(gh, `repos/${repo}/environments/production/variables/VITE_SENTRY_DSN`);
  const preview = bestaat(gh, `repos/${repo}/environments/preview/variables/VITE_SENTRY_DSN`);
  if (productie === false || preview === false) redenen.push("de foutmeldingen (Sentry) zijn nog niet gekoppeld");
  if (redenen.length === 0) return { redenen, stageTwo, kanStarten: false, beheer, beheerVersie: null, ingericht: true };

  if (!beheer) {
    stageTwo.push(`${redenen[0]}: Stage Two richt dat in (er is geen beheer-repo die jij kunt starten)`);
    return { redenen, stageTwo, kanStarten: false, beheer, beheerVersie: null, ingericht: true };
  }
  const versie = Number.parseInt(String(raw(gh, `repos/${beheer}/contents/VERSIE`) ?? "").trim(), 10);
  const beheerVersie = Number.isInteger(versie) ? versie : null;
  if (beheerVersie !== null && beheerVersie < VERSIE_SENTRY) {
    stageTwo.push(`${redenen[0]}: dat kan pas als de beheer-repo op versie ${VERSIE_SENTRY} staat (nu ${beheerVersie}); Stage Two brengt hem bij en start dan App inrichten`);
    return { redenen, stageTwo, kanStarten: false, beheer, beheerVersie, ingericht: true };
  }
  const secrets = namen(gh, `repos/${beheer}/environments/beheer/secrets`, "secrets");
  if (secrets !== null && !secrets.includes("SENTRY_AUTH_TOKEN")) {
    stageTwo.push("de foutmeldingen (Sentry): Stage Two koppelt Sentry één keer in de beheer-repo; daarna start dat App inrichten voor elke app");
    return { redenen, stageTwo, kanStarten: false, beheer, beheerVersie, ingericht: true };
  }
  return { redenen, stageTwo, kanStarten: true, beheer, beheerVersie, ingericht: true };
}
