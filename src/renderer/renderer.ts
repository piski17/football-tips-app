export {}; // aby súbor bol modulom (kvôli izolovanému scope)

// ---- Preklad názvov reprezentácií do slovenčiny (kluby zostávajú v pôvodnom tvare) ----
const COUNTRY_NAME_SK: Record<string, string> = {
  Albania: "Albánsko",
  Andorra: "Andorra",
  Armenia: "Arménsko",
  Austria: "Rakúsko",
  Azerbaijan: "Azerbajdžan",
  Belarus: "Bielorusko",
  Belgium: "Belgicko",
  "Bosnia and Herzegovina": "Bosna a Hercegovina",
  Bulgaria: "Bulharsko",
  Croatia: "Chorvátsko",
  Cyprus: "Cyprus",
  "Czech Republic": "Česko",
  Denmark: "Dánsko",
  England: "Anglicko",
  Estonia: "Estónsko",
  "Faroe Islands": "Faerské ostrovy",
  Finland: "Fínsko",
  France: "Francúzsko",
  Georgia: "Gruzínsko",
  Germany: "Nemecko",
  Gibraltar: "Gibraltár",
  Greece: "Grécko",
  Hungary: "Maďarsko",
  Iceland: "Island",
  Israel: "Izrael",
  Italy: "Taliansko",
  Kazakhstan: "Kazachstan",
  Kosovo: "Kosovo",
  Latvia: "Lotyšsko",
  Liechtenstein: "Lichtenštajnsko",
  Lithuania: "Litva",
  Luxembourg: "Luxembursko",
  Malta: "Malta",
  Moldova: "Moldavsko",
  Montenegro: "Čierna Hora",
  Netherlands: "Holandsko",
  "North Macedonia": "Severné Macedónsko",
  "Northern Ireland": "Severné Írsko",
  Norway: "Nórsko",
  Poland: "Poľsko",
  Portugal: "Portugalsko",
  "Republic of Ireland": "Írsko",
  Romania: "Rumunsko",
  Russia: "Rusko",
  "San Marino": "San Maríno",
  Scotland: "Škótsko",
  Serbia: "Srbsko",
  Slovakia: "Slovensko",
  Slovenia: "Slovinsko",
  Spain: "Španielsko",
  Sweden: "Švédsko",
  Switzerland: "Švajčiarsko",
  Turkey: "Turecko",
  Ukraine: "Ukrajina",
  Wales: "Wales",
  // Alternatívne názvy z API a reprezentácie mimo Európy
  Czechia: "Česko",
  "FYR Macedonia": "Severné Macedónsko",
  Macedonia: "Severné Macedónsko",
  "Türkiye": "Turecko",
  Turkiye: "Turecko",
  "Bosnia & Herzegovina": "Bosna a Hercegovina",
  Ireland: "Írsko",
  Holland: "Holandsko",
  Kyrgyzstan: "Kirgizsko",
  Argentina: "Argentína",
  Brazil: "Brazília",
  Uruguay: "Uruguaj",
  Colombia: "Kolumbia",
  Chile: "Čile",
  Paraguay: "Paraguaj",
  Peru: "Peru",
  Ecuador: "Ekvádor",
  Bolivia: "Bolívia",
  Venezuela: "Venezuela",
  USA: "USA",
  "United States": "USA",
  Mexico: "Mexiko",
  Canada: "Kanada",
  "Costa Rica": "Kostarika",
  Panama: "Panama",
  Jamaica: "Jamajka",
  Honduras: "Honduras",
  Haiti: "Haiti",
  Curacao: "Curaçao",
  Morocco: "Maroko",
  Algeria: "Alžírsko",
  Tunisia: "Tunisko",
  Egypt: "Egypt",
  Senegal: "Senegal",
  Nigeria: "Nigéria",
  Ghana: "Ghana",
  Cameroon: "Kamerun",
  "Ivory Coast": "Pobrežie Slonoviny",
  "Cote D'Ivoire": "Pobrežie Slonoviny",
  "South Africa": "Južná Afrika",
  Mali: "Mali",
  "Cape Verde Islands": "Kapverdy",
  Japan: "Japonsko",
  "South Korea": "Južná Kórea",
  "Korea Republic": "Južná Kórea",
  Australia: "Austrália",
  Iran: "Irán",
  "Saudi Arabia": "Saudská Arábia",
  Qatar: "Katar",
  Iraq: "Irak",
  Jordan: "Jordánsko",
  "United Arab Emirates": "Spojené arabské emiráty",
  Uzbekistan: "Uzbekistan",
  China: "Čína",
  "China PR": "Čína",
  "New Zealand": "Nový Zéland",
};

function translateTeamName(name: string): string {
  return COUNTRY_NAME_SK[name] ?? name;
}

// ---- Preklad názvov súťaží (ligy s vlastným názvom ostávajú v pôvodnom tvare) ----
const LEAGUE_NAME_SK: Record<string, string> = {
  "UEFA Nations League": "Liga národov UEFA",
  "UEFA Champions League": "Liga majstrov UEFA",
  "UEFA Europa League": "Európska liga UEFA",
  "UEFA Europa Conference League": "Konferenčná liga UEFA",
  "UEFA Conference League": "Konferenčná liga UEFA",
  "World Cup": "Majstrovstvá sveta",
  "World Cup - Qualification Europe": "Kvalifikácia MS – Európa",
  "Euro Championship": "Majstrovstvá Európy",
  "Euro Championship - Qualification": "Kvalifikácia ME",
  "Friendlies": "Prípravné zápasy",
};

function translateLeagueName(name: string): string {
  return LEAGUE_NAME_SK[name] ?? name;
}

/** Forma tímu z API (W/D/L) -> slovenské písmená (V/R/P). */
function translateFormLetter(letter: string): string {
  return ({ W: "V", D: "R", L: "P" } as Record<string, string>)[letter] ?? letter;
}

/**
 * Preloží mená tímov, ktoré sú vložené priamo vo vete (napr. "Výsledok zápasu:
 * Liechtenstein alebo remíza", vysvetlenie s formou a pod.) - len na zobrazenie,
 * uložené dáta (SavedTip.homeTeam/awayTeam) zostávajú v pôvodnom tvare, aby
 * fungovalo vyhodnocovanie výsledkov (tipEvaluator porovnáva presne s nimi).
 */
function impliedOdds(probability: number): string {
  return probability > 0 ? (100 / probability).toFixed(2) : "-";
}

/** Zápas už začal (alebo je odložený/zrušený) - tip ani tiket z neho sa nedá pridať. */
function matchHasStarted(fixture: any): boolean {
  const status = fixture?.status ?? "NS";
  if (!["NS", "TBD"].includes(status)) return true;
  const t = new Date(fixture?.date).getTime();
  return !isNaN(t) && t <= Date.now();
}

const MATCH_STARTED_TEXT = "Zápas už začal – tip ani tiket z neho sa už nedá pridať.";

/** Označenie tipu pridaného ručne napriek kontrole kurzu. */
function isOverrideTip(t: any): boolean {
  return !!t.overrideFilter || (Array.isArray(t.legs) && t.legs.some((l: any) => l.overrideFilter));
}

function overrideBadge(t: any) {
  return isOverrideTip(t) ? ` <span class="override-badge" title="Vyradené kontrolou kurzu, pridané ručne">⚠️ mimo filtra</span>` : "";
}

/** Kurz v slovenskom zápise (1,72). */
function fmtOdds(n: number) {
  return n.toFixed(2).replace(".", ",");
}

/** Skutočný kurz tipu, ak je známy - inak odhad z pravdepodobnosti (~1,43). */
function tipOddsLabel(t: any) {
  return typeof t.odds === "number" && t.odds > 1 ? fmtOdds(t.odds) : "~" + impliedOdds(t.probability).replace(".", ",");
}

/** Riadok s kurzom a hodnotou pri tipe v detaile zápasu. */
function betOddsHtml(bet: any) {
  if (typeof bet.odds === "number" && bet.odds > 1) {
    const ev = Math.round(((bet.expectedValue ?? 0) - 1) * 100);
    return ` · kurz <strong>${fmtOdds(bet.odds)}</strong> <span class="muted small">(${bet.oddsBookmakers} stáv.)</span> · hodnota <strong style="color:var(--success)">${ev >= 0 ? "+" : ""}${ev} %</strong>`;
  }
  return ` · kurz ~${impliedOdds(bet.probability).replace(".", ",")} <span class="muted small">(odhad - stávkovky kurz neponúkajú)</span>`;
}

function skeletonHtml(rows: number = 3): string {
  return Array.from({ length: rows })
    .map(() => `<div class="skeleton skeleton-block"></div>`)
    .join("");
}

function showToast(message: string): void {
  const isError = /zlyhal|chyba|nepodarilo/i.test(message);
  const toast = document.createElement("div");
  toast.className = `toast ${isError ? "toast-error" : "toast-success"}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("toast-visible"));
  setTimeout(() => {
    toast.classList.remove("toast-visible");
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function translateNamesInText(text: string | undefined, homeOriginal: string, awayOriginal: string): string {
  if (!text) return "";
  let result = text;
  const homeSk = translateTeamName(homeOriginal);
  const awaySk = translateTeamName(awayOriginal);
  if (homeSk !== homeOriginal) result = result.split(homeOriginal).join(homeSk);
  if (awaySk !== awayOriginal) result = result.split(awayOriginal).join(awaySk);
  // "Over 2.5" / "Under 2.5" -> "Nad 2,5" / "Pod 2,5" (len na zobrazenie,
  // uložené dáta ostávajú bez zmeny kvôli vyhodnocovaniu).
  result = result.replace(/\bOver (\d+(?:\.\d+)?)/g, (_m, n) => "Nad " + n.replace(".", ","));
  result = result.replace(/\bUnder (\d+(?:\.\d+)?)/g, (_m, n) => "Pod " + n.replace(".", ","));
  return result;
}

// ---- Animácia percenta na úvodnej obrazovke ----
(function runSplashProgress() {
  const fillEl = document.getElementById("splashProgressFill");
  const pctEl = document.getElementById("splashProgressPct");
  if (!fillEl || !pctEl) return;
  const fill = fillEl;
  const pct = pctEl;

  const duration = 3400; // ms - stihne sa doplniť pred zmiznutím úvodnej obrazovky (3.8s)
  const start = performance.now();

  function tick(now: number) {
    const elapsed = now - start;
    const progress = Math.min(1, elapsed / duration);
    const percent = Math.round(progress * 100);
    fill.style.width = `${percent}%`;
    pct.textContent = `${percent}%`;
    if (progress < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
})();

interface FootballApi {
  hasApiKey(): Promise<boolean>;
  getApiKey(): Promise<string>;
  setApiKey(key: string): Promise<boolean>;
  getLeaguePresets(): Promise<Array<{ id: number; name: string; country: string }>>;
  getFixturesByLeague(leagueId: number, season: number, next: number, date?: string): Promise<any[]>;
  analyzeFixture(fixture: any, leagueId: number, season: number): Promise<any>;
  getSquad(teamId: number): Promise<any[]>;
  analyzePlayerGoal(payload: {
    playerId: number;
    playerName: string;
    leagueId: number;
    season: number;
    teamExpectedGoalsThisMatch: number;
    teamSeasonGoalsPerGame: number;
  }): Promise<any>;
  saveTip(tip: any): Promise<boolean>;
  sendTipToTelegram(id: string, target: string, asMatchOfWeek?: boolean): Promise<boolean>;
  listSubscribers(): Promise<any[]>;
  addSubscriber(subscriber: any): Promise<boolean>;
  updateSubscriber(id: string, updates: any): Promise<boolean>;
  deleteSubscriber(id: string): Promise<boolean>;
  sendNoTipToday(target: string): Promise<boolean>;
  sendWeeklyReport(target: string): Promise<boolean>;
  sendTipResult(id: string, target: string): Promise<boolean>;
  listTips(): Promise<any[]>;
  deleteTip(id: string): Promise<boolean>;
  checkTipResults(): Promise<any[]>;
  clearAllTips(): Promise<boolean>;
  getWebSyncSettings(): Promise<{ url: string; user: string; password: string }>;
  setWebSyncSettings(settings: { url: string; user: string; password: string }): Promise<boolean>;
}

declare global {
  interface Window {
    api: FootballApi;
  }
}

let selectedLeagueIds: Set<number> = new Set();
let currentFixtures: any[] = [];
let selectedFixtureId: number | null = null;
let currentAnalysis: any = null; // posledný výsledok analyzeFixture, používa sa pre strelcov gólov
let ticketItems: TicketItem[] = []; // aktuálne vybrané tipy na spojenie do "tiketu"

interface TicketItem {
  id: string;
  fixtureId: number;
  leagueId: number;
  season: number;
  homeTeam: string;
  awayTeam: string;
  matchDate: string;
  market: string;
  selection: string;
  probability: number;
  odds?: number | null;
  overrideFilter?: boolean;
}
let collapsedLeagues: Set<string> = new Set(); // ligy schované cez tlačidlo, zostáva aj po automatickom obnovení

const seasonInput = document.getElementById("seasonInput") as HTMLInputElement;
const matchDateInput = document.getElementById("matchDateInput") as HTMLInputElement;
const loadFixturesBtn = document.getElementById("loadFixturesBtn") as HTMLButtonElement;
const fixtureListEl = document.getElementById("fixtureList") as HTMLElement;
const fixtureCountEl = document.getElementById("fixtureCount") as HTMLElement;
const analysisColumnEl = document.getElementById("analysisColumn") as HTMLElement;

const settingsModal = document.getElementById("settingsModal") as HTMLElement;
const apiKeyInput = document.getElementById("apiKeyInput") as HTMLInputElement;
const openSettingsBtn = document.getElementById("openSettingsBtn") as HTMLButtonElement;
const cancelSettingsBtn = document.getElementById("cancelSettingsBtn") as HTMLButtonElement;
const saveSettingsBtn = document.getElementById("saveSettingsBtn") as HTMLButtonElement;

const openTicketBtn = document.getElementById("openTicketBtn") as HTMLButtonElement;
const ticketCountEl = document.getElementById("ticketCount") as HTMLElement;
const ticketModal = document.getElementById("ticketModal") as HTMLElement;
const ticketSummaryEl = document.getElementById("ticketSummary") as HTMLElement;
const ticketValueNoteEl = document.getElementById("ticketValueNote") as HTMLElement;
const ticketListEl = document.getElementById("ticketList") as HTMLElement;
const closeTicketBtn = document.getElementById("closeTicketBtn") as HTMLButtonElement;
const clearTicketBtn = document.getElementById("clearTicketBtn") as HTMLButtonElement;
const saveTicketBtn = document.getElementById("saveTicketBtn") as HTMLButtonElement;

const openTipsBtn = document.getElementById("openTipsBtn") as HTMLButtonElement;

const openWebSyncBtn = document.getElementById("openWebSyncBtn") as HTMLButtonElement;
const webSyncModal = document.getElementById("webSyncModal") as HTMLElement;
const webSyncUrlInput = document.getElementById("webSyncUrlInput") as HTMLInputElement;
const webSyncUserInput = document.getElementById("webSyncUserInput") as HTMLInputElement;
const webSyncPasswordInput = document.getElementById("webSyncPasswordInput") as HTMLInputElement;
const cancelWebSyncBtn = document.getElementById("cancelWebSyncBtn") as HTMLButtonElement;
const saveWebSyncBtn = document.getElementById("saveWebSyncBtn") as HTMLButtonElement;
const tipsModal = document.getElementById("tipsModal") as HTMLElement;
const tipsSummaryEl = document.getElementById("tipsSummary") as HTMLElement;
const marketBreakdownEl = document.getElementById("marketBreakdown") as HTMLElement;
const bankrollStartInput = document.getElementById("bankrollStartInput") as HTMLInputElement;
const bankrollResultEl = document.getElementById("bankrollResult") as HTMLElement;
const calibrationResultEl = document.getElementById("calibrationResult") as HTMLElement;
const tipsListEl = document.getElementById("tipsList") as HTMLElement;
const closeTipsBtn = document.getElementById("closeTipsBtn") as HTMLButtonElement;
const checkResultsBtn = document.getElementById("checkResultsBtn") as HTMLButtonElement;
const clearAllTipsBtn = document.getElementById("clearAllTipsBtn") as HTMLButtonElement;
const noTipTodayBtn = document.getElementById("noTipTodayBtn") as HTMLButtonElement;
const weeklyReportBtn = document.getElementById("weeklyReportBtn") as HTMLButtonElement;

const openSubscribersBtn = document.getElementById("openSubscribersBtn") as HTMLButtonElement;
const subscribersModal = document.getElementById("subscribersModal") as HTMLElement;
const subscribersSummaryEl = document.getElementById("subscribersSummary") as HTMLElement;
const subscribersListEl = document.getElementById("subscribersList") as HTMLElement;
const closeSubscribersBtn = document.getElementById("closeSubscribersBtn") as HTMLButtonElement;
const addSubscriberBtn = document.getElementById("addSubscriberBtn") as HTMLButtonElement;
const subNameInput = document.getElementById("subName") as HTMLInputElement;
const subContactInput = document.getElementById("subContact") as HTMLInputElement;
const subTelegramChatIdInput = document.getElementById("subTelegramChatId") as HTMLInputElement;
const subTierSelect = document.getElementById("subTier") as HTMLSelectElement;

/**
 * Odhadne sezónu (rok jej začiatku) podľa zvoleného dátumu. Väčšina top
 * európskych líg beží od júla/augusta do mája/júna, preto mesiace júl-december
 * patria do sezóny toho istého roka, a mesiace január-jún do sezóny predošlého roka.
 * Pri súťažiach s jednoročnou sezónou (napr. MS, EURO) si sezónu preplš ručne.
 */
function guessSeasonFromDate(dateStr: string): number {
  const d = new Date(dateStr);
  const month = d.getMonth() + 1; // 1-12
  return month >= 7 ? d.getFullYear() : d.getFullYear() - 1;
}


async function init() {
  matchDateInput.value = new Date().toISOString().slice(0, 10);
  seasonInput.value = String(guessSeasonFromDate(matchDateInput.value));

  matchDateInput.addEventListener("change", () => {
    seasonInput.value = String(guessSeasonFromDate(matchDateInput.value));
    loadFixtures();
  });

  const hasKey = await window.api.hasApiKey();
  if (!hasKey) {
    openSettings();
  }

  const leagues = await window.api.getLeaguePresets();
  leagues.forEach((league) => selectedLeagueIds.add(league.id)); // všetky ligy sú vždy zahrnuté

  // Ak už máme API kľúč, appka rovno pri otvorení sama načíta dnešné
  // zápasy - netreba na nič klikať.
  if (hasKey) {
    loadFixtures();
  }
}

async function loadFixtures(silent: boolean = false) {
  const season = parseInt(seasonInput.value, 10);
  const date = matchDateInput.value || new Date().toISOString().slice(0, 10);

  const leagueIds = new Set(selectedLeagueIds);

  if (leagueIds.size === 0) {
    if (!silent) {
      fixtureListEl.innerHTML = `<p class="empty-state">Zaškrtni aspoň jednu ligu.</p>`;
    }
    return;
  }

  const hasKey = await window.api.hasApiKey();
  if (!hasKey) {
    if (!silent) openSettings();
    return;
  }

  if (!silent) {
    fixtureListEl.innerHTML = skeletonHtml(5);
    loadFixturesBtn.disabled = true;
  }

  try {
    const results = await Promise.all(
      Array.from(leagueIds).map(async (leagueId) => {
        try {
          const fixtures = await window.api.getFixturesByLeague(leagueId, season, 20, date);
          return { leagueId, fixtures };
        } catch {
          return { leagueId, fixtures: [] as any[] };
        }
      })
    );

    currentFixtures = results.flatMap((r) => r.fixtures);
    renderGroupedFixtureList(results);
  } catch (err: any) {
    if (!silent) {
      fixtureListEl.innerHTML = `<p class="empty-state">Chyba pri načítaní: ${escapeHtml(
        err?.message ?? String(err)
      )}</p>`;
    }
  } finally {
    if (!silent) loadFixturesBtn.disabled = false;
  }
}

loadFixturesBtn.addEventListener("click", () => loadFixtures(false));

// Appka si sama každých pár minút znova natiahne zoznam zápasov (potichu, bez
// blikania), aby dohraté zápasy automaticky zmizli bez potreby čokoľvek klikať.
setInterval(() => {
  loadFixtures(true);
}, 3 * 60 * 1000); // 3 minúty

function renderGroupedFixtureList(results: Array<{ leagueId: number; fixtures: any[] }>) {
  const totalCount = results.reduce((sum, r) => sum + r.fixtures.length, 0);
  fixtureCountEl.textContent = totalCount ? `${totalCount} zápasov` : "";

  const groupsWithMatches = results.filter((r) => r.fixtures.length > 0);

  if (groupsWithMatches.length === 0) {
    fixtureListEl.innerHTML = `<p class="empty-state">Pre vybrané ligy sa v tento deň nekonajú žiadne zápasy.</p>`;
    return;
  }

  fixtureListEl.innerHTML = "";

  groupsWithMatches.forEach(({ fixtures }) => {
    const leagueName = fixtures[0]?.league?.name ?? "Liga";
    const leagueLogo = fixtures[0]?.league?.logo;
    const isCollapsed = collapsedLeagues.has(leagueName);

    const group = document.createElement("div");
    group.className = "league-group";

    const header = document.createElement("button");
    header.className = "league-group-header";
    header.innerHTML = `<span style="display:flex; align-items:center; gap:8px;">${
      leagueLogo ? `<img src="${escapeHtml(leagueLogo)}" class="league-logo" alt="" />` : ""
    }${escapeHtml(translateLeagueName(leagueName))}</span><span class="chevron">${isCollapsed ? "▸" : "▾"}</span>`;
    header.addEventListener("click", () => {
      if (collapsedLeagues.has(leagueName)) collapsedLeagues.delete(leagueName);
      else collapsedLeagues.add(leagueName);
      rowsContainer.hidden = collapsedLeagues.has(leagueName);
      header.querySelector(".chevron")!.textContent = collapsedLeagues.has(leagueName) ? "▸" : "▾";
    });
    group.appendChild(header);

    const rowsContainer = document.createElement("div");
    rowsContainer.className = "league-group-rows";
    rowsContainer.hidden = isCollapsed;

    fixtures.forEach((fixture: any) => {
      const row = document.createElement("div");
      row.className = "fixture-row";
      row.dataset.fixtureId = String(fixture.fixtureId);

      const date = new Date(fixture.date);
      const time = date.toLocaleString("sk-SK", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });

      const LIVE_STATUSES = ["1H", "HT", "2H", "ET", "BT", "P", "SUSP", "INT"];
      const isLive = LIVE_STATUSES.includes(fixture.status);
      const liveLabel = fixture.status === "HT" ? "Polčas" : fixture.status === "BT" ? "Prestávka" : `${fixture.elapsed ?? "?"}'`;

      const timeHtml = isLive
        ? `<div class="time live">
             <span class="live-dot"></span>${liveLabel}
             <div class="live-score">${fixture.goalsHome ?? 0}:${fixture.goalsAway ?? 0}</div>
           </div>`
        : `<div class="time">${escapeHtml(time)}</div>`;

      row.innerHTML = `
        ${timeHtml}
        <div class="teams">
          <div class="team-line">
            ${fixture.homeTeam.logo ? `<img class="team-logo" src="${escapeHtml(fixture.homeTeam.logo)}" alt="" />` : ""}
            <span class="team-name">${escapeHtml(translateTeamName(fixture.homeTeam.name))}</span>
          </div>
          <span class="vs">vs</span>
          <div class="team-line">
            ${fixture.awayTeam.logo ? `<img class="team-logo" src="${escapeHtml(fixture.awayTeam.logo)}" alt="" />` : ""}
            <span class="team-name">${escapeHtml(translateTeamName(fixture.awayTeam.name))}</span>
          </div>
        </div>
      `;

      row.addEventListener("click", () => {
        document.querySelectorAll(".fixture-row").forEach((n) => n.classList.remove("selected"));
        row.classList.add("selected");
        selectedFixtureId = fixture.fixtureId;
        analyzeFixture(fixture, fixture.league.id, fixture.league.season);
      });

      rowsContainer.appendChild(row);
    });

    group.appendChild(rowsContainer);
    fixtureListEl.appendChild(group);
  });
}

async function analyzeFixture(fixture: any, leagueId: number, season: number) {
  analysisColumnEl.innerHTML = skeletonHtml(4);

  try {
    const result = await window.api.analyzeFixture(fixture, leagueId, season);
    currentAnalysis = result;
    renderAnalysis(result);
  } catch (err: any) {
    analysisColumnEl.innerHTML = `<div class="empty-state">Analýzu sa nepodarilo vypočítať: ${escapeHtml(
      err?.message ?? String(err)
    )}</div>`;
  }
}

function renderAnalysis(r: any) {
  // Zobrazí všetky tipy zápasu v pásme 65–75 % (predictor.ts vracia max. 1 na trh).
  const topBets = r.bestBets || [];

  const gamesPlayedHtml = r.seasonGamesPlayed
    ? `<p class="muted small" style="margin: -6px 0 12px;">Odohratých zápasov v tejto sezóne: ${escapeHtml(
        translateTeamName(r.fixture.homeTeam.name)
      )} ${r.seasonGamesPlayed.home}, ${escapeHtml(translateTeamName(r.fixture.awayTeam.name))} ${r.seasonGamesPlayed.away}</p>`
    : "";

  const warningHtml = r.sampleSizeWarning
    ? `<div class="disclaimer" style="margin-top:0;margin-bottom:20px;border-top:none;padding-top:0;color:var(--gold);">⚠️ ${escapeHtml(
        translateNamesInText(r.sampleSizeWarning, r.fixture.homeTeam.name, r.fixture.awayTeam.name)
      )}</div>`
    : "";

  const topBetsHtml = topBets
    .map(
      (bet: any, idx: number) => `
    <div class="tip-callout" style="${idx > 0 ? "margin-top:10px;" : ""}">
      <div class="tip-outcome">${idx === 0 ? "🎯" : idx + 1 + "."}</div>
      <div class="tip-details">
        <div class="tip-label">${escapeHtml(bet.market)}: ${escapeHtml(
        translateNamesInText(bet.selection, r.fixture.homeTeam.name, r.fixture.awayTeam.name)
      )}</div>
        <div class="tip-meta">
          ${idx === 0 ? "Najvyššia dôvera zo všetkých trhov · " : ""}${bet.probability.toFixed(0)}%${betOddsHtml(bet)}
        </div>
        ${
          bet.explanation
            ? `<div class="tip-explanation">💡 ${escapeHtml(
                translateNamesInText(bet.explanation, r.fixture.homeTeam.name, r.fixture.awayTeam.name)
              )}</div>`
            : ""
        }
        ${
          bet.valueWarning
            ? `<div class="tip-explanation" style="color:var(--gold);font-style:normal;">⚠️ ${escapeHtml(bet.valueWarning)}</div>`
            : ""
        }
      </div>
    </div>
    <div style="display:flex; gap:8px; margin: 4px 0 8px;">
      <button class="btn-primary save-best-bet-btn" data-bet-idx="${idx}" style="flex:1;">Uložiť tento tip</button>
      <button class="btn-ghost add-to-ticket-btn" data-bet-idx="${idx}" style="flex:1;">+ Do tiketu</button>
    </div>
  `
    )
    .join("");

  const noBetsHtml =
    topBets.length === 0
      ? `<div class="empty-state" style="margin-bottom:16px;">Pri tomto zápase nie je žiadny tip v pásme 65–75 %${
          (r.lowValueBets || []).length > 0 ? ", ktorý by prešiel kontrolou kurzu" : ""
        }.</div>`
      : "";

  // Tipy v pásme, ktoré vypadli pre nízky skutočný kurz (bez hodnoty) - len na informáciu.
  const lowValueHtml =
    (r.lowValueBets || []).length > 0
      ? `<div class="low-value-list">
          <div class="muted small" style="margin-bottom:6px;">Vyradené po kontrole kurzu (môžeš ich pridať na vlastnú zodpovednosť):</div>
          ${(r.lowValueBets || [])
            .map(
              (b: any, i: number) => `
            <div class="low-value-row">
              <span class="muted small">${escapeHtml(b.market)}: ${escapeHtml(
                translateNamesInText(b.selection, r.fixture.homeTeam.name, r.fixture.awayTeam.name)
              )} (${b.probability.toFixed(0)} %, kurz ${fmtOdds(b.odds)} – ${escapeHtml(b.rejectReason || "bez hodnoty")})</span>
              <span class="low-value-actions">
                <button class="btn-ghost btn-mini save-best-bet-btn" data-source="low" data-bet-idx="${i}">Uložiť aj tak</button>
                <button class="btn-ghost btn-mini add-to-ticket-btn" data-source="low" data-bet-idx="${i}">+ Do tiketu</button>
              </span>
            </div>`
            )
            .join("")}
        </div>`
      : "";

  analysisColumnEl.innerHTML = `
    <div class="match-header">
      <div class="league-name">${escapeHtml(translateLeagueName(r.fixture.league.name))} · sezóna ${r.fixture.league.season}</div>
      <h2 class="match-header-teams">
        ${r.fixture.homeTeam.logo ? `<img class="team-logo-lg" src="${escapeHtml(r.fixture.homeTeam.logo)}" alt="" />` : ""}
        <span>${escapeHtml(translateTeamName(r.fixture.homeTeam.name))}</span>
        <span class="vs-lg">—</span>
        ${r.fixture.awayTeam.logo ? `<img class="team-logo-lg" src="${escapeHtml(r.fixture.awayTeam.logo)}" alt="" />` : ""}
        <span>${escapeHtml(translateTeamName(r.fixture.awayTeam.name))}</span>
      </h2>
    </div>

    ${gamesPlayedHtml}
    ${warningHtml}

    ${matchHasStarted(r.fixture) ? `<div class="match-locked">⏱ ${MATCH_STARTED_TEXT}</div>` : ""}${topBetsHtml}${noBetsHtml}${lowValueHtml}
    <div id="saveTipMsg"></div>

    <div class="prob-section">
      <div class="section-title">Pravdepodobnosť výsledku</div>
      ${probRow(translateTeamName(r.fixture.homeTeam.name), r.probabilities.homeWin)}
      ${probRow("Remíza", r.probabilities.draw)}
      ${probRow(translateTeamName(r.fixture.awayTeam.name), r.probabilities.awayWin)}
    </div>

    <div class="stats-grid">
      ${teamStatCard(translateTeamName(r.fixture.homeTeam.name), r.form.home, r.form.homeScore, r.expectedGoals.home, r.historicalDataInfo?.home)}
      ${teamStatCard(translateTeamName(r.fixture.awayTeam.name), r.form.away, r.form.awayScore, r.expectedGoals.away, r.historicalDataInfo?.away)}
    </div>

    <div class="prob-section">
      <div class="section-title">Vzájomné zápasy (posledných ${r.headToHead.matchesConsidered})</div>
      <div class="stat-line"><span>Výhry ${escapeHtml(translateTeamName(r.fixture.homeTeam.name))}</span><strong>${r.headToHead.homeWins}</strong></div>
      <div class="stat-line"><span>Remízy</span><strong>${r.headToHead.draws}</strong></div>
      <div class="stat-line"><span>Výhry ${escapeHtml(translateTeamName(r.fixture.awayTeam.name))}</span><strong>${r.headToHead.awayWins}</strong></div>
    </div>

    <div class="prob-section">
      <div class="section-title">Najpravdepodobnejší strelec zápasu</div>
      <p class="muted small" style="margin: -4px 0 10px;">
        ${
          r.lineupConfirmed?.home || r.lineupConfirmed?.away
            ? "✓ Počíta z potvrdenej zostavy na zápas (kde je k dispozícii)."
            : "Zostava na tento zápas ešte nie je potvrdená (zvyčajne sa objaví cca hodinu pred výkopom) - počíta sa z celej súpisky."
        }
      </p>
      ${bestScorerCard(r.bestScorer)}
    </div>

    <div class="disclaimer">
      Toto je štatistický odhad založený na historických dátach (forma, vzájomné zápasy,
      priemer gólov), nie garancia výsledku. Športové stávkovanie nesie finančné riziko –
      stávkuj len sumy, ktoré si môžeš dovoliť stratiť.
    </div>
  `;

  initSaveTipButton(r);
  wireTicketButtons(r);
  wireScorerSaveButtons(r);
  if (matchHasStarted(r.fixture)) {
    document
      .querySelectorAll<HTMLButtonElement>(".save-best-bet-btn, .add-to-ticket-btn, .scorer-save-btn")
      .forEach((b) => {
        b.disabled = true;
        b.title = MATCH_STARTED_TEXT;
      });
  }
}

function probRow(label: string, value: number): string {
  return `
    <div class="prob-bar-row">
      <span class="prob-label">${escapeHtml(label)}</span>
      <div class="prob-bar-track"><div class="prob-bar-fill" style="width:${clampPercent(value)}%"></div></div>
      <span class="prob-value">${value.toFixed(0)}%</span>
    </div>
  `;
}

function teamStatCard(
  name: string,
  form: string,
  formScore: number,
  xg: number,
  historyInfo?: { seasonsUsed: number; seasonsChecked: number } | null
): string {
  const pills = form
    .slice(-5)
    .split("")
    .map((r) => `<div class="form-pill ${r}">${translateFormLetter(r)}</div>`)
    .join("");

  const historyLine = historyInfo
    ? `<div class="stat-line"><span>Historické sezóny použité</span><strong>${historyInfo.seasonsUsed} / ${historyInfo.seasonsChecked}</strong></div>`
    : `<div class="stat-line"><span>Historické sezóny použité</span><strong>0 (nenájdené)</strong></div>`;

  return `
    <div class="stat-card">
      <h4>${escapeHtml(name)}</h4>
      <div class="form-pills">${pills || '<span class="muted small">bez dát o forme</span>'}</div>
      <div class="stat-line"><span>Vážené skóre formy</span><strong>${formScore.toFixed(2)} / 3.00</strong></div>
      <div class="stat-line"><span>Očakávané góly</span><strong>${xg.toFixed(2)}</strong></div>
      ${historyLine}
    </div>
  `;
}

function bestScorerCard(best: any): string {
  if (!best) {
    return `
      <div class="stat-card">
        <p class="muted small">Nenašiel sa hráč s dostatočným počtom zápasov v žiadnom z tímov.</p>
      </div>
    `;
  }

  const prediction = best.prediction;

  return `
    <div class="stat-card">
      <h4>${escapeHtml(prediction.player.name)} <span class="muted small">(${escapeHtml(translateTeamName(best.team))})</span></h4>
      <div class="stat-line"><span>Góly / zápasy</span><strong>${prediction.seasonGoals} / ${prediction.appearances}</strong></div>
      <div class="tip-callout" style="margin-top:10px; margin-bottom:0; padding: 10px 14px;">
        <div class="tip-outcome" style="font-size:16px;">⚽</div>
        <div class="tip-details">
          <div class="tip-label" style="font-size:13px;">Pravdepodobnosť gólu</div>
        </div>
        <div class="best-bet-prob" style="margin-left:auto;">${prediction.probabilityToScore.toFixed(0)}%</div>
      </div>
      <button
        class="tip-save-btn scorer-save-btn"
        style="margin-top:8px; width:100%;"
        data-player-id="${prediction.player.id}"
        data-player-name="${escapeHtml(prediction.player.name)}"
        data-probability="${prediction.probabilityToScore}"
      >Uložiť tento tip</button>
    </div>
  `;
}

function clampPercent(v: number): number {
  return Math.max(0, Math.min(100, v));
}

function escapeHtml(str: string): string {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

// ---- Nastavenia / API kľúč ----

function openSettings() {
  settingsModal.hidden = false;
  window.api.getApiKey().then((key) => {
    apiKeyInput.value = key ?? "";
  });
}

function closeSettings() {
  settingsModal.hidden = true;
}

openSettingsBtn.addEventListener("click", openSettings);
cancelSettingsBtn.addEventListener("click", closeSettings);
saveSettingsBtn.addEventListener("click", async () => {
  await window.api.setApiKey(apiKeyInput.value);
  closeSettings();
});

// ---- Uložiť tip ----

function wireScorerSaveButtons(r: any) {
  const buttons = document.querySelectorAll<HTMLButtonElement>(".scorer-save-btn");
  buttons.forEach((btn) => {
    // Nastavíme handler nanovo (aby sa nezdvojoval pri opakovanom volaní).
    btn.onclick = async () => {
      if (matchHasStarted(r.fixture)) {
        showToast(MATCH_STARTED_TEXT);
        return;
      }
      const playerId = parseInt(btn.dataset.playerId ?? "0", 10);
      const playerName = btn.dataset.playerName ?? "";
      const probability = parseFloat(btn.dataset.probability ?? "0");

      const tip = {
        id: `${r.fixture.fixtureId}-player-${playerId}-${Date.now()}`,
        fixtureId: r.fixture.fixtureId,
        leagueId: r.fixture.league.id,
        season: r.fixture.league.season,
        leagueName: r.fixture.league.name,
        homeTeam: r.fixture.homeTeam.name,
        awayTeam: r.fixture.awayTeam.name,
        homeTeamLogo: r.fixture.homeTeam.logo,
        awayTeamLogo: r.fixture.awayTeam.logo,
        matchDate: r.fixture.date,
        market: "Strelec gólov",
        selection: playerName,
        probability,
        savedAt: new Date().toISOString(),
        status: "pending",
        playerId,
        playerName,
      };

      btn.disabled = true;
      const originalText = btn.textContent;
      try {
        await window.api.saveTip(tip);
        btn.textContent = "✓ Uložené";
      } catch {
        btn.textContent = "Uloženie zlyhalo";
      } finally {
        setTimeout(() => {
          btn.textContent = originalText;
          btn.disabled = false;
        }, 2000);
      }
    };
  });
}

function askTelegramTarget(): Promise<string | null> {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal" style="max-width:320px;">
        <h3>Odoslať do Telegramu?</h3>
        <div style="display:flex; flex-direction:column; gap:10px; margin-top:18px;">
          <button class="btn-primary" id="tgChoicePremium">◆ PREMIUM kanál</button>
          <button class="btn-primary" id="tgChoiceVip">♛ VIP kanál</button>
          <button class="btn-ghost" id="tgChoiceBoth">Oba naraz</button>
          <button class="btn-ghost" id="tgChoiceNone">Neposielať</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    const cleanup = (result: string | null) => {
      document.body.removeChild(overlay);
      resolve(result);
    };
    overlay.querySelector("#tgChoicePremium")!.addEventListener("click", () => cleanup("premium"));
    overlay.querySelector("#tgChoiceVip")!.addEventListener("click", () => cleanup("vip"));
    overlay.querySelector("#tgChoiceBoth")!.addEventListener("click", () => cleanup("both"));
    overlay.querySelector("#tgChoiceNone")!.addEventListener("click", () => cleanup(null));
  });
}

async function maybeOfferTelegram(tipId: string) {
  const target = await askTelegramTarget();
  if (!target) return;
  try {
    await window.api.sendTipToTelegram(tipId, target);
  } catch (err: any) {
    showToast(`Odoslanie do Telegramu zlyhalo: ${err?.message ?? String(err)}`);
  }
}

function initSaveTipButton(r: any) {
  const msgEl = document.getElementById("saveTipMsg") as HTMLElement | null;
  const buttons = document.querySelectorAll<HTMLButtonElement>(".save-best-bet-btn");
  if (!msgEl) return;

  buttons.forEach((btn) => {
    btn.onclick = async () => {
      const idx = parseInt(btn.dataset.betIdx ?? "0", 10);
      if (matchHasStarted(r.fixture)) {
        showToast(MATCH_STARTED_TEXT);
        return;
      }
      const fromLow = btn.dataset.source === "low"; // vyradený tip pridaný ručne
      const chosenBet = (fromLow ? r.lowValueBets : r.bestBets)?.[idx];
      if (!chosenBet) return;

      const tip = {
        id: `${r.fixture.fixtureId}-${Date.now()}`,
        fixtureId: r.fixture.fixtureId,
        leagueId: r.fixture.league.id,
        season: r.fixture.league.season,
        leagueName: r.fixture.league.name,
        homeTeam: r.fixture.homeTeam.name,
        awayTeam: r.fixture.awayTeam.name,
        homeTeamLogo: r.fixture.homeTeam.logo,
        awayTeamLogo: r.fixture.awayTeam.logo,
        matchDate: r.fixture.date,
        market: chosenBet.market,
        selection: chosenBet.selection,
        probability: chosenBet.probability,
        odds: chosenBet.odds ?? null,
        ...(fromLow ? { overrideFilter: true } : {}),
        savedAt: new Date().toISOString(),
        status: "pending",
      };

      btn.disabled = true;
      try {
        await window.api.saveTip(tip);
        msgEl.innerHTML = `<p class="muted small" style="margin-top:6px;">✓ Tip uložený (${escapeHtml(
          chosenBet.market
        )}: ${escapeHtml(
          translateNamesInText(chosenBet.selection, r.fixture.homeTeam.name, r.fixture.awayTeam.name)
        )})</p>`;
        await maybeOfferTelegram(tip.id);
      } catch (err: any) {
        msgEl.innerHTML = `<p class="muted small" style="margin-top:6px;">Uloženie zlyhalo: ${escapeHtml(
          err?.message ?? String(err)
        )}</p>`;
      } finally {
        btn.disabled = false;
      }
    };
  });
}

// ---- Tiket (spojenie viacerých tipov) ----

function wireTicketButtons(r: any) {
  const buttons = document.querySelectorAll<HTMLButtonElement>(".add-to-ticket-btn");
  buttons.forEach((btn) => {
    btn.onclick = () => {
      const idx = parseInt(btn.dataset.betIdx ?? "0", 10);
      if (matchHasStarted(r.fixture)) {
        showToast(MATCH_STARTED_TEXT);
        return;
      }
      const fromLow = btn.dataset.source === "low";
      const bet = (fromLow ? r.lowValueBets : r.bestBets)?.[idx];
      if (!bet) return;

      const id = `${r.fixture.fixtureId}-${bet.market}-${bet.selection}`;
      if (ticketItems.some((t) => t.id === id)) {
        btn.textContent = "✓ Už v tikete";
        setTimeout(() => (btn.textContent = "+ Do tiketu"), 1500);
        return;
      }

      ticketItems.push({
        id,
        fixtureId: r.fixture.fixtureId,
        leagueId: r.fixture.league.id,
        season: r.fixture.league.season,
        homeTeam: r.fixture.homeTeam.name,
        awayTeam: r.fixture.awayTeam.name,
        matchDate: r.fixture.date,
        market: bet.market,
        selection: bet.selection,
        probability: bet.probability,
        odds: bet.odds ?? null,
        ...(fromLow ? { overrideFilter: true } : {}),
      });

      updateTicketCount();
      btn.textContent = "✓ Pridané";
      setTimeout(() => (btn.textContent = "+ Do tiketu"), 1500);
    };
  });
}

function updateTicketCount() {
  ticketCountEl.textContent = ticketItems.length > 0 ? `(${ticketItems.length})` : "";
}

function renderTicket() {
  if (ticketItems.length === 0) {
    ticketSummaryEl.innerHTML = "";
    ticketValueNoteEl.innerHTML = "";
    ticketListEl.innerHTML = `<p class="empty-state">Tiket je zatiaľ prázdny - pridaj tipy tlačidlom "+ Do tiketu" pri analýze zápasu.</p>`;
    return;
  }

  const combinedProbability = ticketItems.reduce((acc, t) => acc * (t.probability / 100), 1) * 100;
  const impliedOdds = combinedProbability > 0 ? 100 / combinedProbability : 0;
  const allHaveOdds = ticketItems.every((t: any) => typeof t.odds === "number" && t.odds > 1);
  const realTicketOdds = allHaveOdds ? ticketItems.reduce((acc, t: any) => acc * t.odds, 1) : null;
  const isGoodValue = impliedOdds >= 2;

  ticketSummaryEl.innerHTML = `
    <span>Počet tipov: <strong>${ticketItems.length}</strong></span>
    <span>Kombinovaná pravdepodobnosť: <strong>${combinedProbability.toFixed(1)}%</strong></span>
    <span>${realTicketOdds ? `Kurz: <strong>${fmtOdds(realTicketOdds)}</strong>` : `Odvodený kurz: <strong>~${impliedOdds.toFixed(2)}</strong>`}</span>
  `;

  ticketValueNoteEl.innerHTML = isGoodValue
    ? `<p class="muted small" style="color: var(--accent-strong); margin: 8px 0 0;">✓ Hodnotný tiket - kombinovaný kurz je 2.0 alebo vyšší.</p>`
    : `<p class="muted small" style="color: var(--gold); margin: 8px 0 0;">⚠️ Kurz je zatiaľ pod 2.0 - pridaj ešte aspoň jeden tip, aby mal tiket lepšiu hodnotu.</p>`;

  ticketListEl.innerHTML = ticketItems
    .map(
      (t) => `
    <div class="tip-row">
      <div class="tip-row-info">
        <div class="tip-row-match">${escapeHtml(translateTeamName(t.homeTeam))} — ${escapeHtml(translateTeamName(t.awayTeam))}</div>
        <div class="tip-row-market">${escapeHtml(t.market)}: ${escapeHtml(translateNamesInText(t.selection, t.homeTeam, t.awayTeam))} · ${t.probability.toFixed(0)}%</div>
      </div>
      <button class="tip-delete-btn" data-ticket-id="${t.id}" title="Odstrániť z tiketu">✕</button>
    </div>
  `
    )
    .join("");

  ticketListEl.querySelectorAll(".tip-delete-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = (e.currentTarget as HTMLElement).dataset.ticketId;
      ticketItems = ticketItems.filter((t) => t.id !== id);
      updateTicketCount();
      renderTicket();
    });
  });
}

bankrollStartInput.addEventListener("input", () => {
  if (lastRenderedTips.length > 0) renderBankrollSimulation(lastRenderedTips);
});

openTicketBtn.addEventListener("click", () => {
  ticketModal.hidden = false;
  renderTicket();
});

closeTicketBtn.addEventListener("click", () => {
  ticketModal.hidden = true;
});

clearTicketBtn.addEventListener("click", () => {
  if (ticketItems.length === 0) return;
  if (!window.confirm("Naozaj chceš vymazať celý tiket?")) return;
  ticketItems = [];
  updateTicketCount();
  renderTicket();
});

saveTicketBtn.addEventListener("click", async () => {
  if (ticketItems.length < 2) {
    showToast("Tiket musí obsahovať aspoň 2 tipy.");
    return;
  }

  const startedLegs = ticketItems.filter((t: any) => {
    const time = new Date(t.matchDate).getTime();
    return !isNaN(time) && time <= Date.now();
  });
  if (startedLegs.length > 0) {
    showToast(
      `Tiket obsahuje zápas, ktorý už začal: ${startedLegs
        .map((t: any) => `${translateTeamName(t.homeTeam)} – ${translateTeamName(t.awayTeam)}`)
        .join(", ")}. Odstráň ho z tiketu.`
    );
    return;
  }

  const combinedProbability = ticketItems.reduce((acc, t) => acc * (t.probability / 100), 1) * 100;

  const ticketTip = {
    id: `ticket-${Date.now()}`,
    fixtureId: ticketItems[0].fixtureId,
    leagueId: ticketItems[0].leagueId,
    season: ticketItems[0].season,
    leagueName: "Tiket",
    homeTeam: "Tiket",
    awayTeam: `${ticketItems.length} zápasov`,
    matchDate: new Date().toISOString(),
    market: "Tiket",
    selection: `${ticketItems.length} tipov`,
    probability: combinedProbability,
    ...(ticketItems.some((t: any) => t.overrideFilter) ? { overrideFilter: true } : {}),
    odds: ticketItems.every((t: any) => typeof t.odds === "number" && t.odds > 1)
      ? Math.round(ticketItems.reduce((acc, t: any) => acc * t.odds, 1) * 100) / 100
      : null,
    savedAt: new Date().toISOString(),
    status: "pending",
    legs: ticketItems.map((t) => ({
      fixtureId: t.fixtureId,
      leagueId: t.leagueId,
      season: t.season,
      homeTeam: t.homeTeam,
      awayTeam: t.awayTeam,
      matchDate: t.matchDate,
      market: t.market,
      selection: t.selection,
      probability: t.probability,
      odds: t.odds ?? null,
      ...(t.overrideFilter ? { overrideFilter: true } : {}),
      status: "pending",
    })),
  };

  saveTicketBtn.disabled = true;
  try {
    await window.api.saveTip(ticketTip as any);
    ticketItems = [];
    updateTicketCount();
    renderTicket();
    await maybeOfferTelegram(ticketTip.id);
  } catch (err: any) {
    showToast(`Uloženie tiketu zlyhalo: ${err?.message ?? String(err)}`);
  } finally {
    saveTicketBtn.disabled = false;
  }
});

// ---- História tipov ----

async function openTipsHistory() {
  tipsModal.hidden = false;
  tipsListEl.innerHTML = skeletonHtml(2);
  try {
    const tips = await window.api.listTips();
    renderTipsList(tips);
  } catch (err: any) {
    tipsListEl.innerHTML = `<p class="empty-state">Tipy sa nepodarilo načítať: ${escapeHtml(
      err?.message ?? String(err)
    )}</p>`;
  }
}

let lastRenderedTips: any[] = [];

function stakeTierPercent(probability: number): number {
  if (probability >= 70) return 0.03; // vyššia dôvera = väčšia sadzba
  if (probability >= 60) return 0.02;
  return 0.01;
}

function renderCalibrationReport(tips: any[]) {
  const resolved = tips.filter((t) => !t.legs && (t.status === "won" || t.status === "lost"));

  if (resolved.length === 0) {
    calibrationResultEl.innerHTML = `<p class="muted small">Zatiaľ nemáš dosť vyhodnotených tipov na kalibráciu.</p>`;
    return;
  }

  const buckets = [
    { min: 50, max: 60, label: "50-60%" },
    { min: 60, max: 70, label: "60-70%" },
    { min: 70, max: 80, label: "70-80%" },
    { min: 80, max: 90, label: "80-90%" },
    { min: 90, max: 100, label: "90-100%" },
  ];

  const rows = buckets
    .map((b) => {
      const inBucket = resolved.filter((t) => t.probability >= b.min && t.probability < (b.max === 100 ? 101 : b.max));
      if (inBucket.length === 0) return null;
      const won = inBucket.filter((t) => t.status === "won").length;
      const actualPct = (won / inBucket.length) * 100;
      const predictedMid = (b.min + b.max) / 2;
      return { label: b.label, count: inBucket.length, actualPct, predictedMid };
    })
    .filter((r): r is { label: string; count: number; actualPct: number; predictedMid: number } => r !== null);

  if (rows.length === 0) {
    calibrationResultEl.innerHTML = `<p class="muted small">Zatiaľ nemáš dosť vyhodnotených tipov na kalibráciu.</p>`;
    return;
  }

  calibrationResultEl.innerHTML =
    rows
      .map(
        (r) => `
      <div class="market-breakdown-row">
        <div class="market-breakdown-label">
          <span>Predikcia ${r.label}</span>
          <span class="muted small">realita: ${r.actualPct.toFixed(0)}% · ${r.count} tipov</span>
        </div>
        <div class="market-breakdown-bar" style="position:relative;">
          <div class="market-breakdown-bar-fill" style="width: ${r.actualPct}%;"></div>
          <div style="position:absolute; left:${r.predictedMid}%; top:-2px; bottom:-2px; width:2px; background:var(--text);"></div>
        </div>
      </div>
    `
      )
      .join("") +
    `<p class="muted small" style="margin-top:8px;">Zlatý pruh = koľko tipov reálne vyšlo. Biela čiarka = stred predikovaného rozsahu (kde by mal pruh byť, ak je model presný).</p>`;
}

function renderBankrollSimulation(tips: any[]) {
  lastRenderedTips = tips;

  const resolved = tips
    .filter((t) => t.status === "won" || t.status === "lost")
    .sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime());

  if (resolved.length === 0) {
    bankrollResultEl.innerHTML = `<p class="muted small">Zatiaľ nemáš žiadne vyhodnotené tipy na simuláciu.</p>`;
    return;
  }

  const startingBankroll = parseFloat(bankrollStartInput.value) || 1000;
  let bankroll = startingBankroll;
  const history: number[] = [bankroll];

  for (const t of resolved) {
    const stakePct = stakeTierPercent(t.probability);
    const stake = bankroll * stakePct;
    // Skutočný kurz, ak bol pri tipe uložený - inak "fér" kurz odvodený z pravdepodobnosti modelu.
    const impliedOdds = typeof t.odds === "number" && t.odds > 1 ? t.odds : 100 / t.probability;
    bankroll += t.status === "won" ? stake * (impliedOdds - 1) : -stake;
    history.push(bankroll);
  }

  const totalReturn = ((bankroll - startingBankroll) / startingBankroll) * 100;
  const maxVal = Math.max(...history);
  const minVal = Math.min(...history);
  const range = maxVal - minVal || 1;

  const barsHtml = history
    .map((v) => {
      const heightPct = 10 + ((v - minVal) / range) * 90; // min. 10%, aby bol vidno aj nízky stĺpec
      return `<div class="bankroll-bar" style="height:${heightPct}%;" title="${v.toFixed(0)}€"></div>`;
    })
    .join("");

  bankrollResultEl.innerHTML = `
    <div class="bankroll-summary">
      <span>Použitých tipov: <strong>${resolved.length}</strong></span>
      <span>Konečný bankroll: <strong>${bankroll.toFixed(0)}€</strong></span>
      <span>Celková zmena: <strong style="color:${totalReturn >= 0 ? "var(--success)" : "var(--danger)"};">${
    totalReturn >= 0 ? "+" : ""
  }${totalReturn.toFixed(1)}%</strong></span>
    </div>
    <div class="bankroll-chart">${barsHtml}</div>
  `;
}

function renderMarketBreakdown(tips: any[]) {
  const decidedTips = tips.filter((t) => t.status === "won" || t.status === "lost");
  if (decidedTips.length === 0) {
    marketBreakdownEl.innerHTML = "";
    return;
  }

  const byMarket: Record<string, { won: number; total: number }> = {};
  for (const t of decidedTips) {
    if (!byMarket[t.market]) byMarket[t.market] = { won: 0, total: 0 };
    byMarket[t.market].total++;
    if (t.status === "won") byMarket[t.market].won++;
  }

  const rows = Object.entries(byMarket).sort((a, b) => b[1].total - a[1].total);

  marketBreakdownEl.innerHTML = `
    <div class="market-breakdown-title">Úspešnosť podľa typu stávky</div>
    ${rows
      .map(([market, stats]) => {
        const pct = (stats.won / stats.total) * 100;
        return `
        <div class="market-breakdown-row">
          <div class="market-breakdown-label">
            <span>${escapeHtml(market)}</span>
            <span class="muted small">${stats.won}/${stats.total} · ${pct.toFixed(0)}%</span>
          </div>
          <div class="market-breakdown-bar">
            <div class="market-breakdown-bar-fill" style="width: ${pct}%;"></div>
          </div>
        </div>
      `;
      })
      .join("")}
  `;
}

/** Samostatný prehľad tipov "mimo filtra" - či sa oplatí prekonávať kontrolu kurzu. */
function overrideSummaryHtml(tips: any[]) {
  const ov = tips.filter(isOverrideTip);
  if (ov.length === 0) return "";
  const decided = ov.filter((t: any) => t.status === "won" || t.status === "lost");
  const won = decided.filter((t: any) => t.status === "won").length;
  const withOdds = decided.filter((t: any) => typeof t.odds === "number" && t.odds > 1);
  const profit = withOdds.reduce((sum: number, t: any) => sum + (t.status === "won" ? t.odds - 1 : -1), 0);
  return `<span title="Tipy vyradené kontrolou kurzu, ktoré si pridal ručne">⚠️ Mimo filtra: <strong>${won} z ${decided.length}</strong>${
    withOdds.length > 0 ? ` · zisk <strong>${profit >= 0 ? "+" : ""}${profit.toFixed(1).replace(".", ",")} j.</strong>` : ""
  }${ov.length > decided.length ? ` · čaká ${ov.length - decided.length}` : ""}</span>`;
}

const EXCLUDED_STATS_MARKETS: string[] = ["Dvojšanca", "Presný výsledok", "Čisté konto"];

function renderTipsList(tips: any[]) {
  // Tipy na trhy, ktoré appka už neponúka (dvojšanca, presný výsledok, čisté
  // konto), ostávajú v zozname, ale nerátajú sa do štatistík.
  const statTips = tips.filter((t: any) => !EXCLUDED_STATS_MARKETS.includes(t.market));
  const won = statTips.filter((t: any) => t.status === "won").length;
  const lost = statTips.filter((t: any) => t.status === "lost").length;
  const pending = statTips.filter((t: any) => t.status === "pending").length;
  const decided = won + lost;
  const winRate = decided > 0 ? ((won / decided) * 100).toFixed(0) : "—";

  tipsSummaryEl.innerHTML = `
    <span>Spolu: <strong>${statTips.length}</strong></span>
    <span>Čaká: <strong>${pending}</strong></span>
    <span>Vyhral: <strong>${won}</strong></span>
    <span>Prehral: <strong>${lost}</strong></span>
    <span>Úspešnosť: <strong>${winRate}${decided > 0 ? "%" : ""}</strong></span>
    ${overrideSummaryHtml(statTips)}
  `;

  renderMarketBreakdown(statTips);
  renderBankrollSimulation(statTips);
  renderCalibrationReport(statTips);

  if (tips.length === 0) {
    tipsListEl.innerHTML = `<p class="empty-state">Zatiaľ nemáš uložené žiadne tipy.</p>`;
    return;
  }

  tipsListEl.innerHTML = tips
    .map((t) => {
      const date = new Date(t.matchDate).toLocaleDateString("sk-SK");
      const rowClass = t.status === "won" ? "tip-row-won" : t.status === "lost" ? "tip-row-lost" : "";
      const resultIconHtml =
        t.status === "won"
          ? `<span class="tip-result-icon won">✓</span>`
          : t.status === "lost"
          ? `<span class="tip-result-icon lost">✕</span>`
          : `<span class="tip-status ${t.status}">${t.status === "void" ? "Neurčené" : "Čaká"}</span>`;

      if (t.legs && t.legs.length > 0) {
        const legsHtml = t.legs
          .map(
            (leg: any) => `
            <div class="tip-row-market" style="padding-left: 10px; border-left: 2px solid var(--border); margin-top: 4px;">
              ${escapeHtml(translateTeamName(leg.homeTeam))} — ${escapeHtml(translateTeamName(leg.awayTeam))}: ${escapeHtml(leg.market)}: ${escapeHtml(
              translateNamesInText(leg.selection, leg.homeTeam, leg.awayTeam)
            )} · ${leg.probability.toFixed(0)}%
            </div>`
          )
          .join("");

        return `
        <div class="tip-row ${rowClass}" data-row-id="${t.id}" style="align-items: flex-start;">
          <div class="tip-row-info">
            <div class="tip-row-match">🎫 Tiket (${t.legs.length} tipov) <span class="muted small">(${date})</span></div>
            <div class="tip-row-market">Kombinovaná pravdepodobnosť: ${t.probability.toFixed(1)}% · kurz ${tipOddsLabel(t)}${overrideBadge(t)}</div>
            ${legsHtml}
          </div>
          ${resultIconHtml}
          ${
            t.status === "pending"
              ? `<button class="tip-delete-btn" data-send-id="${t.id}" title="Poslať do Telegram kanála" aria-label="Poslať do Telegram kanála"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" style="display:block"><path fill="currentColor" d="M21.9 4.3 18.7 19.4c-.2 1-.9 1.3-1.7.8l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.3-5 9.1-8.2c.4-.4-.1-.6-.6-.2L6.2 13.1 1.3 11.6c-1-.3-1.1-1 .2-1.5L20.6 2.8c.9-.3 1.6.2 1.3 1.5z"/></svg></button><button class="tip-delete-btn" data-motw-id="${t.id}" title="Poslať ako Zápas/Tiket týždňa">★</button>`
              : `<button class="tip-delete-btn" data-result-id="${t.id}" title="Poslať výsledok do Telegramu">➤</button>`
          }
        </div>
      `;
      }

      return `
        <div class="tip-row ${rowClass}" data-row-id="${t.id}">
          <div class="tip-row-info">
            <div class="tip-row-match">${escapeHtml(translateTeamName(t.homeTeam))} — ${escapeHtml(translateTeamName(t.awayTeam))} <span class="muted small">(${date})</span></div>
            <div class="tip-row-market">${escapeHtml(t.market)}: ${escapeHtml(translateNamesInText(t.selection, t.homeTeam, t.awayTeam))} · ${t.probability.toFixed(0)}% · kurz ${tipOddsLabel(t)}${overrideBadge(t)}</div>
          </div>
          ${resultIconHtml}
          ${
            t.status === "pending"
              ? `<button class="tip-delete-btn" data-send-id="${t.id}" title="Poslať do Telegram kanála" aria-label="Poslať do Telegram kanála"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" style="display:block"><path fill="currentColor" d="M21.9 4.3 18.7 19.4c-.2 1-.9 1.3-1.7.8l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.3-5 9.1-8.2c.4-.4-.1-.6-.6-.2L6.2 13.1 1.3 11.6c-1-.3-1.1-1 .2-1.5L20.6 2.8c.9-.3 1.6.2 1.3 1.5z"/></svg></button><button class="tip-delete-btn" data-motw-id="${t.id}" title="Poslať ako Zápas/Tiket týždňa">★</button>`
              : `<button class="tip-delete-btn" data-result-id="${t.id}" title="Poslať výsledok do Telegramu">➤</button>`
          }
        </div>
      `;
    })
    .join("");

  tipsListEl.querySelectorAll("[data-row-id]").forEach((row) => {
    row.addEventListener("click", async (e) => {
      if ((e.target as HTMLElement).closest("button")) return;
      const id = (row as HTMLElement).dataset.rowId;
      if (!id) return;
      const confirmed = window.confirm("Naozaj chceš odstrániť tento tip/tiket z histórie? Táto akcia sa nedá vrátiť späť.");
      if (!confirmed) return;
      try {
        await window.api.deleteTip(id);
      } catch (err: any) {
        showToast(`Zmazanie zlyhalo: ${err?.message ?? String(err)}. Skús to prosím znova.`);
      } finally {
        openTipsHistory();
      }
    });
  });

  tipsListEl.querySelectorAll("[data-send-id]").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const id = (e.currentTarget as HTMLElement).dataset.sendId;
      if (!id) return;
      const target = await askTelegramTarget();
      if (!target) return;
      try {
        await window.api.sendTipToTelegram(id, target);
        showToast("Tip odoslaný do Telegram kanála.");
      } catch (err: any) {
        showToast(`Odoslanie zlyhalo: ${err?.message ?? String(err)}`);
      }
    });
  });

  tipsListEl.querySelectorAll("[data-motw-id]").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const id = (e.currentTarget as HTMLElement).dataset.motwId;
      if (!id) return;
      const target = await askTelegramTarget();
      if (!target) return;
      try {
        await window.api.sendTipToTelegram(id, target, true);
        showToast("Odoslané ako Zápas/Tiket týždňa.");
      } catch (err: any) {
        showToast(`Odoslanie zlyhalo: ${err?.message ?? String(err)}`);
      }
    });
  });

  tipsListEl.querySelectorAll("[data-result-id]").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const id = (e.currentTarget as HTMLElement).dataset.resultId;
      if (!id) return;
      const target = await askTelegramTarget();
      if (!target) return;
      try {
        await window.api.sendTipResult(id, target);
        showToast("Výsledok odoslaný.");
      } catch (err: any) {
        showToast(`Odoslanie zlyhalo: ${err?.message ?? String(err)}`);
      }
    });
  });
}

openTipsBtn.addEventListener("click", openTipsHistory);
closeTipsBtn.addEventListener("click", () => {
  tipsModal.hidden = true;
});

// ---- Predplatitelia ----

function daysUntil(dateStr: string): number {
  const diffMs = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function subscriberStatus(sub: any): { label: string; cls: string } {
  const days = daysUntil(sub.nextPaymentDue);
  if (days < 0) return { label: "Vypršal", cls: "lost" };
  if (days <= 3) return { label: `Vyprší o ${days} d.`, cls: "void" };
  return { label: "Aktívny", cls: "won" };
}

async function openSubscribers() {
  subscribersModal.hidden = false;
  subscribersListEl.innerHTML = skeletonHtml(2);
  try {
    const subs = await window.api.listSubscribers();
    renderSubscribersList(subs);
  } catch (err: any) {
    subscribersListEl.innerHTML = `<p class="muted small">Predplatiteľov sa nepodarilo načítať: ${escapeHtml(
      err?.message ?? String(err)
    )}</p>`;
  }
}

function renderSubscribersList(subs: any[]) {
  const activeCount = subs.filter((s) => daysUntil(s.nextPaymentDue) >= 0).length;
  const monthlyRevenue = subs
    .filter((s) => daysUntil(s.nextPaymentDue) >= 0)
    .reduce((sum, s) => sum + (s.priceEur || 0), 0);

  subscribersSummaryEl.innerHTML = `
    <span>Spolu: <strong>${subs.length}</strong></span>
    <span>Aktívnych: <strong>${activeCount}</strong></span>
    <span>Mesačný príjem: <strong>${monthlyRevenue} €</strong></span>
  `;

  if (subs.length === 0) {
    subscribersListEl.innerHTML = `<p class="empty-state">Zatiaľ nemáš pridaných žiadnych predplatiteľov.</p>`;
    return;
  }

  subscribersListEl.innerHTML = subs
    .map((s) => {
      const status = subscriberStatus(s);
      const tierLabel = s.tier === "group" ? "VIP" : "PREMIUM";
      const dueDate = new Date(s.nextPaymentDue).toLocaleDateString("sk-SK");
      return `
        <div class="tip-row">
          <div class="tip-row-info">
            <div class="tip-row-match">${escapeHtml(s.name)} <span class="muted small">(${tierLabel} · ${s.priceEur} €)</span></div>
            <div class="tip-row-market">${escapeHtml(s.contact || "")} · najbližšia platba: ${dueDate}</div>
          </div>
          <span class="tip-status ${status.cls}">${status.label}</span>
          <button class="tip-delete-btn" data-extend-id="${s.id}" title="Predĺžiť o mesiac" style="background:var(--surface-alt); color:var(--gold-bright); border-radius:6px; padding:4px 8px; font-size:12px;">+30d</button>
          <button class="tip-delete-btn" data-remove-id="${s.id}" title="Zmazať">✕</button>
        </div>
      `;
    })
    .join("");

  subscribersListEl.querySelectorAll("[data-extend-id]").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const id = (e.currentTarget as HTMLElement).dataset.extendId!;
      const sub = subs.find((s) => s.id === id);
      if (!sub) return;
      const base = daysUntil(sub.nextPaymentDue) > 0 ? new Date(sub.nextPaymentDue) : new Date();
      base.setDate(base.getDate() + 30);
      try {
        await window.api.updateSubscriber(id, { nextPaymentDue: base.toISOString() });
        openSubscribers();
      } catch (err: any) {
        showToast(`Predĺženie zlyhalo: ${err?.message ?? String(err)}`);
      }
    });
  });

  subscribersListEl.querySelectorAll("[data-remove-id]").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const id = (e.currentTarget as HTMLElement).dataset.removeId!;
      if (!window.confirm("Naozaj zmazať tohto predplatiteľa?")) return;
      try {
        await window.api.deleteSubscriber(id);
        openSubscribers();
      } catch (err: any) {
        showToast(`Zmazanie zlyhalo: ${err?.message ?? String(err)}`);
      }
    });
  });
}

openSubscribersBtn.addEventListener("click", openSubscribers);
closeSubscribersBtn.addEventListener("click", () => {
  subscribersModal.hidden = true;
});

addSubscriberBtn.addEventListener("click", async () => {
  const name = subNameInput.value.trim();
  if (!name) {
    showToast("Zadaj meno alebo názov skupiny.");
    return;
  }
  const tier = subTierSelect.value;
  const priceEur = tier === "group" ? 99 : 29;
  const nextPaymentDue = new Date();
  nextPaymentDue.setDate(nextPaymentDue.getDate() + 30);

  const subscriber = {
    id: `sub-${Date.now()}`,
    name,
    contact: subContactInput.value.trim(),
    telegramChatId: subTelegramChatIdInput.value.trim() || undefined,
    tier,
    priceEur,
    nextPaymentDue: nextPaymentDue.toISOString(),
    createdAt: new Date().toISOString(),
  };

  addSubscriberBtn.disabled = true;
  try {
    await window.api.addSubscriber(subscriber);
    subNameInput.value = "";
    subContactInput.value = "";
    subTelegramChatIdInput.value = "";
    openSubscribers();
  } catch (err: any) {
    showToast(`Pridanie zlyhalo: ${err?.message ?? String(err)}`);
  } finally {
    addSubscriberBtn.disabled = false;
  }
});

checkResultsBtn.addEventListener("click", async () => {
  checkResultsBtn.disabled = true;
  checkResultsBtn.textContent = "Kontrolujem…";
  try {
    const tips = await window.api.checkTipResults();
    renderTipsList(tips);
  } catch (err: any) {
    showToast(`Kontrola výsledkov zlyhala: ${err?.message ?? String(err)}`);
  } finally {
    checkResultsBtn.disabled = false;
    checkResultsBtn.textContent = "Skontrolovať výsledky";
  }
});

clearAllTipsBtn.addEventListener("click", async () => {
  const confirmed = window.confirm(
    "Naozaj chceš vymazať ÚPLNE VŠETKY uložené tipy (aj už vyhodnotené)? Táto akcia sa nedá vrátiť späť."
  );
  if (!confirmed) return;

  clearAllTipsBtn.disabled = true;
  try {
    await window.api.clearAllTips();
    renderTipsList([]);
  } catch (err: any) {
    showToast(`Vymazanie zlyhalo: ${err?.message ?? String(err)}. Skús to prosím znova.`);
  } finally {
    clearAllTipsBtn.disabled = false;
  }
});

noTipTodayBtn.addEventListener("click", async () => {
  const target = await askTelegramTarget();
  if (!target) return;
  noTipTodayBtn.disabled = true;
  try {
    await window.api.sendNoTipToday(target);
    showToast("Odoslané.");
  } catch (err: any) {
    showToast(`Odoslanie zlyhalo: ${err?.message ?? String(err)}`);
  } finally {
    noTipTodayBtn.disabled = false;
  }
});

weeklyReportBtn.addEventListener("click", async () => {
  const target = await askTelegramTarget();
  if (!target) return;
  weeklyReportBtn.disabled = true;
  try {
    await window.api.sendWeeklyReport(target);
    showToast("Odoslané.");
  } catch (err: any) {
    showToast(`Odoslanie zlyhalo: ${err?.message ?? String(err)}`);
  } finally {
    weeklyReportBtn.disabled = false;
  }
});

// ---- Synchronizácia s webovou appkou ----

openWebSyncBtn.addEventListener("click", async () => {
  webSyncModal.hidden = false;
  const current = await window.api.getWebSyncSettings();
  webSyncUrlInput.value = current.url ?? "";
  webSyncUserInput.value = current.user ?? "";
  webSyncPasswordInput.value = current.password ?? "";
});

cancelWebSyncBtn.addEventListener("click", () => {
  webSyncModal.hidden = true;
});

saveWebSyncBtn.addEventListener("click", async () => {
  await window.api.setWebSyncSettings({
    url: webSyncUrlInput.value,
    user: webSyncUserInput.value,
    password: webSyncPasswordInput.value,
  });
  webSyncModal.hidden = true;
});


init();
