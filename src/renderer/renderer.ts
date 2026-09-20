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
  saveTip(tip: any): Promise<boolean>;
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
}
let collapsedLeagues: Set<string> = new Set(); // ligy schované cez tlačidlo, zostáva aj po automatickom obnovení

const customLeagueInput = document.getElementById("customLeagueId") as HTMLInputElement;
const toggleCustomLeagueBtn = document.getElementById("toggleCustomLeagueBtn") as HTMLButtonElement;
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
const tipsListEl = document.getElementById("tipsList") as HTMLElement;
const closeTipsBtn = document.getElementById("closeTipsBtn") as HTMLButtonElement;
const checkResultsBtn = document.getElementById("checkResultsBtn") as HTMLButtonElement;
const clearAllTipsBtn = document.getElementById("clearAllTipsBtn") as HTMLButtonElement;

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

toggleCustomLeagueBtn.addEventListener("click", () => {
  customLeagueInput.hidden = !customLeagueInput.hidden;
  if (!customLeagueInput.hidden) customLeagueInput.focus();
});

customLeagueInput.addEventListener("change", () => loadFixtures());

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
  const customId = customLeagueInput.value.trim() ? parseInt(customLeagueInput.value.trim(), 10) : null;
  if (customId) leagueIds.add(customId);

  if (leagueIds.size === 0) {
    if (!silent) {
      fixtureListEl.innerHTML = `<p class="empty-state">Zaškrtni aspoň jednu ligu, alebo zadaj vlastné ID ligy.</p>`;
    }
    return;
  }

  const hasKey = await window.api.hasApiKey();
  if (!hasKey) {
    if (!silent) openSettings();
    return;
  }

  if (!silent) {
    fixtureListEl.innerHTML = `<div class="loading-state">Načítavam zápasy…</div>`;
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
    const isCollapsed = collapsedLeagues.has(leagueName);

    const group = document.createElement("div");
    group.className = "league-group";

    const header = document.createElement("button");
    header.className = "league-group-header";
    header.innerHTML = `<span>${escapeHtml(leagueName)}</span><span class="chevron">${isCollapsed ? "▸" : "▾"}</span>`;
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
        analyzeFixture(fixture, fixture.league.id, fixture.league.season);
      });

      rowsContainer.appendChild(row);
    });

    group.appendChild(rowsContainer);
    fixtureListEl.appendChild(group);
  });
}

async function analyzeFixture(fixture: any, leagueId: number, season: number) {
  analysisColumnEl.innerHTML = `<div class="loading-state">Počítam štatistickú analýzu…</div>`;

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
  const bestBet = (r.bestBets && r.bestBets[0]) || null;

  const gamesPlayedHtml = r.seasonGamesPlayed
    ? `<p class="muted small" style="margin: -6px 0 12px;">Odohratých zápasov v tejto sezóne: ${escapeHtml(
        r.fixture.homeTeam.name
      )} ${r.seasonGamesPlayed.home}, ${escapeHtml(r.fixture.awayTeam.name)} ${r.seasonGamesPlayed.away}</p>`
    : "";

  const warningHtml = r.sampleSizeWarning
    ? `<div class="disclaimer" style="margin-top:0;margin-bottom:20px;border-top:none;padding-top:0;color:var(--gold);">⚠️ ${escapeHtml(
        r.sampleSizeWarning
      )}</div>`
    : "";

  const topBetsHtml = bestBet
    ? `
    <div class="tip-callout">
      <div class="tip-outcome">🎯</div>
      <div class="tip-details">
        <div class="tip-label">${escapeHtml(bestBet.market)}: ${escapeHtml(bestBet.selection)}</div>
        <div class="tip-meta">Najvyššia dôvera zo všetkých trhov · ${bestBet.probability.toFixed(0)}%</div>
      </div>
    </div>
    <div style="display:flex; gap:8px; margin: 4px 0 8px;">
      <button class="btn-primary save-best-bet-btn" data-bet-idx="0" style="flex:1;">Uložiť tento tip</button>
      <button class="btn-ghost add-to-ticket-btn" data-bet-idx="0" style="flex:1;">+ Do tiketu</button>
    </div>
  `
    : "";

  analysisColumnEl.innerHTML = `
    <div class="match-header">
      <div class="league-name">${escapeHtml(r.fixture.league.name)} · sezóna ${r.fixture.league.season}</div>
      <h2>${escapeHtml(r.fixture.homeTeam.name)} — ${escapeHtml(r.fixture.awayTeam.name)}</h2>
    </div>

    ${gamesPlayedHtml}
    ${warningHtml}

    ${topBetsHtml}
    <div id="saveTipMsg"></div>

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
      <h4>${escapeHtml(prediction.player.name)} <span class="muted small">(${escapeHtml(best.team)})</span></h4>
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

function initSaveTipButton(r: any) {
  const msgEl = document.getElementById("saveTipMsg") as HTMLElement | null;
  const buttons = document.querySelectorAll<HTMLButtonElement>(".save-best-bet-btn");
  if (!msgEl || !r.bestBets || r.bestBets.length === 0) return;

  buttons.forEach((btn) => {
    btn.onclick = async () => {
      const idx = parseInt(btn.dataset.betIdx ?? "0", 10);
      const chosenBet = r.bestBets[idx];
      if (!chosenBet) return;

      const tip = {
        id: `${r.fixture.fixtureId}-${Date.now()}`,
        fixtureId: r.fixture.fixtureId,
        leagueId: r.fixture.league.id,
        season: r.fixture.league.season,
        leagueName: r.fixture.league.name,
        homeTeam: r.fixture.homeTeam.name,
        awayTeam: r.fixture.awayTeam.name,
        matchDate: r.fixture.date,
        market: chosenBet.market,
        selection: chosenBet.selection,
        probability: chosenBet.probability,
        savedAt: new Date().toISOString(),
        status: "pending",
      };

      btn.disabled = true;
      try {
        await window.api.saveTip(tip);
        msgEl.innerHTML = `<p class="muted small" style="margin-top:6px;">✓ Tip uložený (${escapeHtml(
          chosenBet.market
        )}: ${escapeHtml(chosenBet.selection)})</p>`;
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
      const bet = r.bestBets?.[idx];
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
  const isGoodValue = impliedOdds >= 2;

  ticketSummaryEl.innerHTML = `
    <span>Počet tipov: <strong>${ticketItems.length}</strong></span>
    <span>Kombinovaná pravdepodobnosť: <strong>${combinedProbability.toFixed(1)}%</strong></span>
    <span>Odvodený kurz: <strong>~${impliedOdds.toFixed(2)}</strong></span>
  `;

  ticketValueNoteEl.innerHTML = isGoodValue
    ? `<p class="muted small" style="color: var(--accent-strong); margin: 8px 0 0;">✓ Hodnotný tiket - kombinovaný kurz je 2.0 alebo vyšší.</p>`
    : `<p class="muted small" style="color: var(--gold); margin: 8px 0 0;">⚠️ Kurz je zatiaľ pod 2.0 - pridaj ešte aspoň jeden tip, aby mal tiket lepšiu hodnotu.</p>`;

  ticketListEl.innerHTML = ticketItems
    .map(
      (t) => `
    <div class="tip-row">
      <div class="tip-row-info">
        <div class="tip-row-match">${escapeHtml(t.homeTeam)} — ${escapeHtml(t.awayTeam)}</div>
        <div class="tip-row-market">${escapeHtml(t.market)}: ${escapeHtml(t.selection)} · ${t.probability.toFixed(0)}%</div>
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
    alert("Tiket musí obsahovať aspoň 2 tipy.");
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
      status: "pending",
    })),
  };

  saveTicketBtn.disabled = true;
  try {
    await window.api.saveTip(ticketTip as any);
    ticketItems = [];
    updateTicketCount();
    renderTicket();
    alert("Tiket bol uložený do histórie tipov.");
  } catch (err: any) {
    alert(`Uloženie tiketu zlyhalo: ${err?.message ?? String(err)}`);
  } finally {
    saveTicketBtn.disabled = false;
  }
});

// ---- História tipov ----

async function openTipsHistory() {
  tipsModal.hidden = false;
  tipsListEl.innerHTML = `<div class="loading-state">Načítavam tipy…</div>`;
  try {
    const tips = await window.api.listTips();
    renderTipsList(tips);
  } catch (err: any) {
    tipsListEl.innerHTML = `<p class="empty-state">Tipy sa nepodarilo načítať: ${escapeHtml(
      err?.message ?? String(err)
    )}</p>`;
  }
}

function renderTipsList(tips: any[]) {
  const won = tips.filter((t) => t.status === "won").length;
  const lost = tips.filter((t) => t.status === "lost").length;
  const pending = tips.filter((t) => t.status === "pending").length;
  const decided = won + lost;
  const winRate = decided > 0 ? ((won / decided) * 100).toFixed(0) : "—";

  tipsSummaryEl.innerHTML = `
    <span>Spolu: <strong>${tips.length}</strong></span>
    <span>Čaká: <strong>${pending}</strong></span>
    <span>Vyhral: <strong>${won}</strong></span>
    <span>Prehral: <strong>${lost}</strong></span>
    <span>Úspešnosť: <strong>${winRate}${decided > 0 ? "%" : ""}</strong></span>
  `;

  if (tips.length === 0) {
    tipsListEl.innerHTML = `<p class="empty-state">Zatiaľ nemáš uložené žiadne tipy.</p>`;
    return;
  }

  tipsListEl.innerHTML = tips
    .map((t) => {
      const date = new Date(t.matchDate).toLocaleDateString("sk-SK");
      const statusLabelOf = (s: string) =>
        s === "won" ? "Vyhral" : s === "lost" ? "Prehral" : s === "void" ? "Neurčené" : "Čaká";
      const statusLabel = statusLabelOf(t.status);

      if (t.legs && t.legs.length > 0) {
        const legsHtml = t.legs
          .map(
            (leg: any) => `
            <div class="tip-row-market" style="padding-left: 10px; border-left: 2px solid var(--border); margin-top: 4px;">
              ${escapeHtml(leg.homeTeam)} — ${escapeHtml(leg.awayTeam)}: ${escapeHtml(leg.market)}: ${escapeHtml(
              leg.selection
            )} · ${leg.probability.toFixed(0)}%
              <span class="tip-status ${leg.status}" style="margin-left:6px; font-size:9.5px; padding:2px 7px;">${statusLabelOf(
              leg.status
            )}</span>
            </div>`
          )
          .join("");

        return `
        <div class="tip-row" style="align-items: flex-start;">
          <div class="tip-row-info">
            <div class="tip-row-match">🎫 Tiket (${t.legs.length} tipov) <span class="muted small">(${date})</span></div>
            <div class="tip-row-market">Kombinovaná pravdepodobnosť: ${t.probability.toFixed(1)}%</div>
            ${legsHtml}
          </div>
          <span class="tip-status ${t.status}">${statusLabel}</span>
          ${
            t.status === "pending"
              ? `<button class="tip-delete-btn" data-tip-id="${t.id}" title="Zmazať">✕</button>`
              : ""
          }
        </div>
      `;
      }

      return `
        <div class="tip-row">
          <div class="tip-row-info">
            <div class="tip-row-match">${escapeHtml(t.homeTeam)} — ${escapeHtml(t.awayTeam)} <span class="muted small">(${date})</span></div>
            <div class="tip-row-market">${escapeHtml(t.market)}: ${escapeHtml(t.selection)} · ${t.probability.toFixed(0)}%</div>
          </div>
          <span class="tip-status ${t.status}">${statusLabel}</span>
          ${
            t.status === "pending"
              ? `<button class="tip-delete-btn" data-tip-id="${t.id}" title="Zmazať">✕</button>`
              : ""
          }
        </div>
      `;
    })
    .join("");

  tipsListEl.querySelectorAll(".tip-delete-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const id = (e.currentTarget as HTMLElement).dataset.tipId;
      if (!id) return;
      (btn as HTMLButtonElement).disabled = true;
      try {
        await window.api.deleteTip(id);
      } catch (err: any) {
        alert(`Zmazanie zlyhalo: ${err?.message ?? String(err)}. Skús to prosím znova.`);
      } finally {
        openTipsHistory();
      }
    });
  });
}

openTipsBtn.addEventListener("click", openTipsHistory);
closeTipsBtn.addEventListener("click", () => {
  tipsModal.hidden = true;
});

checkResultsBtn.addEventListener("click", async () => {
  checkResultsBtn.disabled = true;
  checkResultsBtn.textContent = "Kontrolujem…";
  try {
    const tips = await window.api.checkTipResults();
    renderTipsList(tips);
  } catch (err: any) {
    alert(`Kontrola výsledkov zlyhala: ${err?.message ?? String(err)}`);
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
    alert(`Vymazanie zlyhalo: ${err?.message ?? String(err)}. Skús to prosím znova.`);
  } finally {
    clearAllTipsBtn.disabled = false;
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
