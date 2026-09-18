export {}; // aby súbor bol modulom (kvôli izolovanému scope)

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
}

declare global {
  interface Window {
    api: FootballApi;
  }
}

let selectedLeagueId: number | null = null;
let currentFixtures: any[] = [];
let selectedFixtureId: number | null = null;
let currentAnalysis: any = null; // posledný výsledok analyzeFixture, používa sa pre strelcov gólov
let currentLeagueId: number | null = null;
let currentSeason: number | null = null;
let homeSquadCache: any[] | null = null;
let awaySquadCache: any[] | null = null;

const leagueListEl = document.getElementById("leagueList") as HTMLElement;
const customLeagueInput = document.getElementById("customLeagueId") as HTMLInputElement;
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
  });

  const hasKey = await window.api.hasApiKey();
  if (!hasKey) {
    openSettings();
  }

  const leagues = await window.api.getLeaguePresets();
  leagueListEl.innerHTML = "";
  leagues.forEach((league) => {
    const item = document.createElement("div");
    item.className = "league-item";
    item.dataset.leagueId = String(league.id);
    item.innerHTML = `<span class="name">${escapeHtml(league.name)}</span><span class="country">${escapeHtml(
      league.country
    )}</span>`;
    item.addEventListener("click", () => selectLeague(league.id, item));
    leagueListEl.appendChild(item);
  });
}

function selectLeague(id: number, el: HTMLElement) {
  selectedLeagueId = id;
  customLeagueInput.value = "";
  document.querySelectorAll(".league-item").forEach((n) => n.classList.remove("active"));
  el.classList.add("active");
}

function getActiveLeagueId(): number | null {
  if (customLeagueInput.value.trim()) {
    return parseInt(customLeagueInput.value.trim(), 10);
  }
  return selectedLeagueId;
}

loadFixturesBtn.addEventListener("click", async () => {
  const leagueId = getActiveLeagueId();
  const season = parseInt(seasonInput.value, 10);

  if (!leagueId) {
    fixtureListEl.innerHTML = `<p class="empty-state">Vyber ligu vľavo, alebo zadaj vlastné ID ligy.</p>`;
    return;
  }

  const hasKey = await window.api.hasApiKey();
  if (!hasKey) {
    openSettings();
    return;
  }

  fixtureListEl.innerHTML = `<div class="loading-state">Načítavam zápasy…</div>`;
  loadFixturesBtn.disabled = true;

  try {
    const fixtures = await window.api.getFixturesByLeague(
      leagueId,
      season,
      20,
      matchDateInput.value || new Date().toISOString().slice(0, 10)
    );
    currentFixtures = fixtures;
    renderFixtureList(fixtures, leagueId, season);
  } catch (err: any) {
    fixtureListEl.innerHTML = `<p class="empty-state">Chyba pri načítaní: ${escapeHtml(
      err?.message ?? String(err)
    )}</p>`;
  } finally {
    loadFixturesBtn.disabled = false;
  }
});

function renderFixtureList(fixtures: any[], leagueId: number, season: number) {
  fixtureCountEl.textContent = fixtures.length ? `${fixtures.length} zápasov` : "";

  if (!fixtures.length) {
    fixtureListEl.innerHTML = `<p class="empty-state">Pre túto ligu sa v tento deň nekonajú žiadne zápasy.</p>`;
    return;
  }

  fixtureListEl.innerHTML = "";
  fixtures.forEach((fixture) => {
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

    row.innerHTML = `
      <div class="time">${escapeHtml(time)}</div>
      <div class="teams">
        <span class="team-name">${escapeHtml(fixture.homeTeam.name)}</span>
        <span class="vs">vs</span>
        <span class="team-name">${escapeHtml(fixture.awayTeam.name)}</span>
      </div>
    `;

    row.addEventListener("click", () => {
      document.querySelectorAll(".fixture-row").forEach((n) => n.classList.remove("selected"));
      row.classList.add("selected");
      selectedFixtureId = fixture.fixtureId;
      analyzeFixture(fixture, leagueId, season);
    });

    fixtureListEl.appendChild(row);
  });
}

async function analyzeFixture(fixture: any, leagueId: number, season: number) {
  analysisColumnEl.innerHTML = `<div class="loading-state">Počítam štatistickú analýzu…</div>`;

  try {
    const result = await window.api.analyzeFixture(fixture, leagueId, season);
    currentAnalysis = result;
    currentLeagueId = leagueId;
    currentSeason = season;
    homeSquadCache = null;
    awaySquadCache = null;
    renderAnalysis(result);
  } catch (err: any) {
    analysisColumnEl.innerHTML = `<div class="empty-state">Analýzu sa nepodarilo vypočítať: ${escapeHtml(
      err?.message ?? String(err)
    )}</div>`;
  }
}

function renderAnalysis(r: any) {
  const outcomeLetter = r.tip.outcome; // "1" | "X" | "2"

  const warningHtml = r.sampleSizeWarning
    ? `<div class="disclaimer" style="margin-top:0;margin-bottom:20px;border-top:none;padding-top:0;color:var(--gold);">⚠️ ${escapeHtml(
        r.sampleSizeWarning
      )}</div>`
    : "";

  analysisColumnEl.innerHTML = `
    <div class="match-header">
      <div class="league-name">${escapeHtml(r.fixture.league.name)} · sezóna ${r.fixture.league.season}</div>
      <h2>${escapeHtml(r.fixture.homeTeam.name)} — ${escapeHtml(r.fixture.awayTeam.name)}</h2>
    </div>

    ${warningHtml}

    <div class="tip-callout">
      <div class="tip-outcome">${outcomeLetter}</div>
      <div class="tip-details">
        <div class="tip-label">${escapeHtml(r.tip.outcomeLabel)}</div>
        <div class="tip-meta">Istota modelu: ${escapeHtml(r.tip.confidence)} · Odhad gólov: ${escapeHtml(
    r.tip.goalsMarket
  )}</div>
      </div>
    </div>

    <div class="best-bets-section">
      <div class="section-title">Odporúčané tipy (zoradené podľa istoty)</div>
      <div class="best-bets-list">
        ${(r.bestBets || [])
          .map(
            (bet: any, idx: number) => `
          <div class="best-bet-row">
            <div class="best-bet-rank">${idx + 1}.</div>
            <div class="best-bet-info">
              <div class="best-bet-market">${escapeHtml(bet.market)}</div>
              <div class="best-bet-selection">${escapeHtml(bet.selection)}</div>
            </div>
            <div class="best-bet-prob">${bet.probability.toFixed(0)}%</div>
          </div>
        `
          )
          .join("")}
      </div>
    </div>

    <div class="prob-section">
      <div class="section-title">Pravdepodobnosť výsledku</div>
      ${probRow(r.fixture.homeTeam.name, r.probabilities.homeWin)}
      ${probRow("Remíza", r.probabilities.draw)}
      ${probRow(r.fixture.awayTeam.name, r.probabilities.awayWin)}
    </div>

    <div class="stats-grid">
      ${teamStatCard(r.fixture.homeTeam.name, r.form.home, r.form.homeScore, r.expectedGoals.home, r.historicalDataInfo?.home)}
      ${teamStatCard(r.fixture.awayTeam.name, r.form.away, r.form.awayScore, r.expectedGoals.away, r.historicalDataInfo?.away)}
    </div>

    <div class="prob-section">
      <div class="section-title">Vzájomné zápasy (posledných ${r.headToHead.matchesConsidered})</div>
      <div class="stat-line"><span>Výhry ${escapeHtml(r.fixture.homeTeam.name)}</span><strong>${r.headToHead.homeWins}</strong></div>
      <div class="stat-line"><span>Remízy</span><strong>${r.headToHead.draws}</strong></div>
      <div class="stat-line"><span>Výhry ${escapeHtml(r.fixture.awayTeam.name)}</span><strong>${r.headToHead.awayWins}</strong></div>
    </div>

    <div class="markets-grid">
      <div class="market-card">
        <div class="market-value">${r.overUnder25.over.toFixed(0)}%</div>
        <div class="market-label">Over 2.5 gólu</div>
      </div>
      <div class="market-card">
        <div class="market-value">${r.btts.yes.toFixed(0)}%</div>
        <div class="market-label">Obaja tímy skórujú</div>
      </div>
      ${
        r.corners
          ? `
      <div class="market-card">
        <div class="market-value">${r.corners.over >= r.corners.under ? r.corners.over.toFixed(0) : r.corners.under.toFixed(0)}%</div>
        <div class="market-label">${r.corners.over >= r.corners.under ? "Over" : "Under"} ${r.corners.line} rohov</div>
      </div>`
          : ""
      }
      <div class="market-card">
        <div class="market-value">${r.cards.over >= r.cards.under ? r.cards.over.toFixed(0) : r.cards.under.toFixed(0)}%</div>
        <div class="market-label">${r.cards.over >= r.cards.under ? "Over" : "Under"} ${r.cards.line} kariet</div>
      </div>
    </div>

    <div class="prob-section">
      <div class="section-title">Najpravdepodobnejší strelci (automaticky)</div>
      <div class="stats-grid">
        ${topScorerCard(r.fixture.homeTeam.name, r.topScorers?.home)}
        ${topScorerCard(r.fixture.awayTeam.name, r.topScorers?.away)}
      </div>
    </div>

    <div class="prob-section">
      <div class="section-title">Overiť iného hráča</div>
      <div id="scorerControls" class="scorer-controls">
        <select id="scorerSelect" class="scorer-select">
          <option value="">Načítavam hráčov…</option>
        </select>
        <button class="btn-primary" id="scorerCheckBtn">Overiť pravdepodobnosť</button>
      </div>
      <div id="scorerResult"></div>
    </div>

    <div class="disclaimer">
      Toto je štatistický odhad založený na historických dátach (forma, vzájomné zápasy,
      priemer gólov), nie garancia výsledku. Športové stávkovanie nesie finančné riziko –
      stávkuj len sumy, ktoré si môžeš dovoliť stratiť.
    </div>
  `;

  initScorerSection(r);
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
    .map((r) => `<div class="form-pill ${r}">${r}</div>`)
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

function topScorerCard(teamName: string, prediction: any): string {
  if (!prediction) {
    return `
      <div class="stat-card">
        <h4>${escapeHtml(teamName)}</h4>
        <p class="muted small">Nenašiel sa hráč s dostatočným počtom zápasov.</p>
      </div>
    `;
  }

  return `
    <div class="stat-card">
      <h4>${escapeHtml(teamName)}</h4>
      <div class="stat-line"><span>Hráč</span><strong>${escapeHtml(prediction.player.name)}</strong></div>
      <div class="stat-line"><span>Góly / zápasy</span><strong>${prediction.seasonGoals} / ${prediction.appearances}</strong></div>
      <div class="tip-callout" style="margin-top:10px; margin-bottom:0; padding: 10px 14px;">
        <div class="tip-outcome" style="font-size:16px;">⚽</div>
        <div class="tip-details">
          <div class="tip-label" style="font-size:13px;">Pravdepodobnosť gólu</div>
        </div>
        <div class="best-bet-prob" style="margin-left:auto;">${prediction.probabilityToScore.toFixed(0)}%</div>
      </div>
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

// ---- Strelci gólov ----

async function initScorerSection(r: any) {
  const selectEl = document.getElementById("scorerSelect") as HTMLSelectElement | null;
  const checkBtn = document.getElementById("scorerCheckBtn") as HTMLButtonElement | null;
  const resultEl = document.getElementById("scorerResult") as HTMLElement | null;
  if (!selectEl || !checkBtn || !resultEl || currentLeagueId == null || currentSeason == null) return;

  selectEl.innerHTML = `<option value="">Načítavam hráčov…</option>`;
  checkBtn.disabled = true;

  try {
    const [homeSquad, awaySquad] = await Promise.all([
      homeSquadCache ?? window.api.getSquad(r.fixture.homeTeam.id),
      awaySquadCache ?? window.api.getSquad(r.fixture.awayTeam.id),
    ]);
    homeSquadCache = homeSquad;
    awaySquadCache = awaySquad;

    const homeOptions = homeSquad
      .map((p: any) => `<option value="home:${p.id}:${escapeHtml(p.name)}">${escapeHtml(p.name)}</option>`)
      .join("");
    const awayOptions = awaySquad
      .map((p: any) => `<option value="away:${p.id}:${escapeHtml(p.name)}">${escapeHtml(p.name)}</option>`)
      .join("");

    selectEl.innerHTML = `
      <option value="">Vyber hráča…</option>
      <optgroup label="${escapeHtml(r.fixture.homeTeam.name)}">${homeOptions}</optgroup>
      <optgroup label="${escapeHtml(r.fixture.awayTeam.name)}">${awayOptions}</optgroup>
    `;
    checkBtn.disabled = false;
  } catch (err: any) {
    selectEl.innerHTML = `<option value="">Súpisky sa nepodarilo načítať</option>`;
  }

  checkBtn.onclick = () => checkScorerProbability(r);
}

async function checkScorerProbability(r: any) {
  const selectEl = document.getElementById("scorerSelect") as HTMLSelectElement | null;
  const resultEl = document.getElementById("scorerResult") as HTMLElement | null;
  if (!selectEl || !resultEl || currentLeagueId == null || currentSeason == null) return;

  const value = selectEl.value;
  if (!value) {
    resultEl.innerHTML = `<p class="empty-state">Najprv vyber hráča zo zoznamu.</p>`;
    return;
  }

  const [side, idStr, ...nameParts] = value.split(":");
  const playerId = parseInt(idStr, 10);
  const playerName = nameParts.join(":");
  const teamExpectedGoalsThisMatch = side === "home" ? r.expectedGoals.home : r.expectedGoals.away;
  const teamSeasonGoalsPerGame =
    side === "home" ? r.teamSeasonGoalsPerGame.home : r.teamSeasonGoalsPerGame.away;

  resultEl.innerHTML = `<div class="loading-state">Počítam pravdepodobnosť gólu…</div>`;

  try {
    const prediction = await window.api.analyzePlayerGoal({
      playerId,
      playerName,
      leagueId: currentLeagueId,
      season: currentSeason,
      teamExpectedGoalsThisMatch,
      teamSeasonGoalsPerGame,
    });

    resultEl.innerHTML = `
      <div class="market-card" style="text-align:left; padding: 16px 18px;">
        <div class="stat-line"><span>Hráč</span><strong>${escapeHtml(prediction.player.name)}</strong></div>
        <div class="stat-line"><span>Góly túto sezónu</span><strong>${prediction.seasonGoals} (${prediction.appearances} zápasov)</strong></div>
        <div class="stat-line"><span>Priemer gólov/zápas</span><strong>${prediction.goalsPerGame.toFixed(2)}</strong></div>
        <div class="tip-callout" style="margin-top:12px; margin-bottom:0;">
          <div class="tip-outcome">⚽</div>
          <div class="tip-details">
            <div class="tip-label">Pravdepodobnosť gólu v tomto zápase</div>
            <div class="tip-meta">Odhad na základe podielu hráča na góloch tímu</div>
          </div>
          <div class="best-bet-prob" style="margin-left:auto;">${prediction.probabilityToScore.toFixed(0)}%</div>
        </div>
      </div>
    `;
  } catch (err: any) {
    resultEl.innerHTML = `<p class="empty-state">${escapeHtml(err?.message ?? String(err))}</p>`;
  }
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

init();
