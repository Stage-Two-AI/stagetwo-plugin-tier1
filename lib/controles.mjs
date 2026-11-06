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

/** Wat er niet werkt zolang Sentry niet gekoppeld is, in gewone taal. */
export const GEVOLG_SENTRY = "fouten uit productie komen niet in Sentry, dus niemand ziet ze vanzelf";

/** De opdracht waarmee iemand met rechten op de beheer-repo App inrichten start. */
export function inrichtOpdracht(beheer, app) {
  return `gh workflow run app-inrichten.yml --repo ${beheer} -f app=${app} -f droogloop=false`;
}

/**
 * Wat App inrichten voor deze app nog moet zetten. `beheer`: de beheer-repo (of null).
 * Geeft `{ redenen, gevolgen, owner, kanStarten, beheer, beheerVersie, ingericht, ownerOpdracht }`;
 * `owner` zegt wat de owner van de eigen beheer-repo nog doet. Niets hiervan blokkeert.
 */
export function watMistDeInrichting(repo, { gh, beheer }) {
  const app = repo.split("/")[1];
  const redenen = [];
  const gevolgen = [];
  const owner = [];
  const uit = (extra) => ({ redenen, gevolgen, owner, beheer, beheerVersie: null, ingericht: true, ownerOpdracht: beheer ? inrichtOpdracht(beheer, app) : null, ...extra });
  const ingericht = bestaat(gh, `repos/${repo}/environments/production`);
  if (ingericht === false) return uit({ kanStarten: false, ingericht: false });

  const productie = bestaat(gh, `repos/${repo}/environments/production/variables/VITE_SENTRY_DSN`);
  const preview = bestaat(gh, `repos/${repo}/environments/preview/variables/VITE_SENTRY_DSN`);
  if (productie === false || preview === false) {
    redenen.push("de foutmeldingen (Sentry) zijn nog niet gekoppeld");
    gevolgen.push(GEVOLG_SENTRY);
  }
  if (redenen.length === 0) return uit({ kanStarten: false });

  if (!beheer) {
    owner.push("er is geen beheer-repo gevonden waar jij bij kunt; de owner van de organisatie start App inrichten voor deze app in de beheer-repo (Actions, App inrichten, Run workflow)");
    return uit({ kanStarten: false });
  }
  const versie = Number.parseInt(String(raw(gh, `repos/${beheer}/contents/VERSIE`) ?? "").trim(), 10);
  const beheerVersie = Number.isInteger(versie) ? versie : null;
  if (beheerVersie !== null && beheerVersie < VERSIE_SENTRY) {
    owner.push(
      `de beheer-repo ${beheer} staat op versie ${beheerVersie}; App inrichten koppelt Sentry pas vanaf versie ${VERSIE_SENTRY}. Met een abonnement levert Stage Two die versie (de owner geeft daarvoor tijdelijk toegang); daarna start de owner App inrichten: ${inrichtOpdracht(beheer, app)}`,
    );
    return uit({ kanStarten: false, beheerVersie });
  }
  const secrets = namen(gh, `repos/${beheer}/environments/beheer/secrets`, "secrets");
  if (secrets !== null && !secrets.includes("SENTRY_AUTH_TOKEN")) {
    owner.push(
      `Sentry is nog niet gekoppeld in ${beheer}. De owner doet dat één keer met zijn eigen Sentry-account, in een eigen terminal: node <plugin>/skills/installatie/scripts/sentry-koppelen.mjs --beheer ${beheer} --sentry-org <slug>; dat start daarna App inrichten voor elke app`,
    );
    return uit({ kanStarten: false, beheerVersie });
  }
  return uit({ kanStarten: true, beheerVersie });
}
