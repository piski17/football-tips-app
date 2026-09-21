import { app, BrowserWindow, ipcMain, nativeImage } from "electron";
import * as path from "path";
import { getApiKey, setApiKey, hasApiKey, getWebSyncSettings, setWebSyncSettings, WebSyncSettings } from "./config";
import {
  getFixturesByLeague,
  getTeamStatistics,
  getHeadToHead,
  getLeagueAverages,
  getHistoricalGoalPriors,
  getTeamExtendedStatsAverages,
  getTeamSquad,
  getPlayerSeasonStats,
  getTeamPlayersWithStats,
  getFixtureResult,
  getFixtureCornersAndCards,
  getFixtureGoalscorerIds,
  getFixtureLineupPlayerIds,
} from "./apiClient";
import { predictMatch, predictPlayerGoal, DEFAULT_WEIGHTS } from "./predictor";
import { LeaguePreset, SavedTip } from "./types";
import { saveTip, listTips, updateTip, deleteTip, clearAllTips, checkResultsRemote } from "./tipsStore";
import { evaluateTip, computeTicketStatus } from "./tipEvaluator";

// Top ligy dostupné s API-Football Pro plánom.
const LEAGUE_PRESETS: LeaguePreset[] = [
  { id: 39, name: "Premier League", country: "Anglicko" },
  { id: 140, name: "La Liga", country: "Španielsko" },
  { id: 135, name: "Serie A", country: "Taliansko" },
  { id: 78, name: "Bundesliga", country: "Nemecko" },
  { id: 61, name: "Ligue 1", country: "Francúzsko" },
  { id: 2, name: "UEFA Champions League", country: "Európa" },
];

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: "#0f1b14",
    icon: path.join(__dirname, "..", "renderer", "assets", "icon-256.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "..", "renderer", "index.html"));
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Na macOS treba ikonu Docku nastaviť samostatne - BrowserWindow "icon"
  // tam ovplyvňuje len samotné okno (ktoré na macOS aj tak nezobrazuje ikonu
  // v titulku), nie appku v Docku.
  if (process.platform === "darwin" && app.dock) {
    const dockIcon = nativeImage.createFromPath(
      path.join(__dirname, "..", "renderer", "assets", "icon-512.png")
    );
    if (!dockIcon.isEmpty()) {
      app.dock.setIcon(dockIcon);
    }
  }
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// ---- IPC handlery ----

ipcMain.handle("settings:hasApiKey", () => hasApiKey());
ipcMain.handle("settings:getApiKey", () => getApiKey());
ipcMain.handle("settings:setApiKey", (_e, key: string) => {
  setApiKey(key);
  return true;
});
ipcMain.handle("leagues:presets", () => LEAGUE_PRESETS);

ipcMain.handle(
  "fixtures:byLeague",
  async (_e, leagueId: number, season: number, next: number, date?: string) => {
    const day = date || new Date().toISOString().slice(0, 10);
    return getFixturesByLeague(leagueId, season, next, day);
  }
);

ipcMain.handle(
  "analyze:fixture",
  async (
    _e,
    payload: {
      fixture: any;
      leagueId: number;
      season: number;
    }
  ) => {
    const { fixture, leagueId, season } = payload;

    // Prvá vlna - rovnaké volania, ktoré boli predtým otestované ako stabilné.
    const [homeStats, awayStats, h2h, leagueAvg, homePriors, awayPriors, homeExtStats, awayExtStats] =
      await Promise.all([
        getTeamStatistics(leagueId, season, fixture.homeTeam.id),
        getTeamStatistics(leagueId, season, fixture.awayTeam.id),
        getHeadToHead(fixture.homeTeam.id, fixture.awayTeam.id, 10),
        getLeagueAverages(leagueId, season),
        getHistoricalGoalPriors(leagueId, season, fixture.homeTeam.id),
        getHistoricalGoalPriors(leagueId, season, fixture.awayTeam.id),
        getTeamExtendedStatsAverages(leagueId, season, fixture.homeTeam.id),
        getTeamExtendedStatsAverages(leagueId, season, fixture.awayTeam.id),
      ]);

    // Druhá vlna - súpisky hráčov + potvrdená zostava (ak je k dispozícii),
    // spustené AŽ PO prvej vlne, aby appka nevystrelila príliš veľa
    // požiadaviek úplne naraz.
    const [homePlayers, awayPlayers, lineup] = await Promise.all([
      getTeamPlayersWithStats(fixture.homeTeam.id, season, leagueId),
      getTeamPlayersWithStats(fixture.awayTeam.id, season, leagueId),
      getFixtureLineupPlayerIds(fixture.fixtureId),
    ]);

    const result = predictMatch(
      fixture,
      homeStats,
      awayStats,
      h2h,
      leagueAvg,
      DEFAULT_WEIGHTS,
      homePriors,
      awayPriors,
      homeExtStats.corners,
      awayExtStats.corners,
      homePlayers,
      awayPlayers,
      lineup.homeIds,
      lineup.awayIds,
      {
        homeShotsOnGoal: homeExtStats.shotsOnGoal,
        awayShotsOnGoal: awayExtStats.shotsOnGoal,
        homeFouls: homeExtStats.fouls,
        awayFouls: awayExtStats.fouls,
        homeOffsides: homeExtStats.offsides,
        awayOffsides: awayExtStats.offsides,
      }
    );

    return result;
  }
);

ipcMain.handle("squad:get", async (_e, teamId: number) => {
  return getTeamSquad(teamId);
});

ipcMain.handle(
  "player:analyzeGoal",
  async (
    _e,
    payload: {
      playerId: number;
      playerName: string;
      leagueId: number;
      season: number;
      teamExpectedGoalsThisMatch: number;
      teamSeasonGoalsPerGame: number;
    }
  ) => {
    const { playerId, playerName, leagueId, season, teamExpectedGoalsThisMatch, teamSeasonGoalsPerGame } =
      payload;

    const stats = await getPlayerSeasonStats(playerId, season, leagueId);
    if (!stats) {
      throw new Error(
        `Pre hráča ${playerName} sa nenašli sezónne štatistiky v tejto súťaži (možno málo minút/zápasov).`
      );
    }

    return predictPlayerGoal(
      playerName,
      playerId,
      stats.goals,
      stats.appearances,
      teamExpectedGoalsThisMatch,
      teamSeasonGoalsPerGame
    );
  }
);

// ---- Uložené tipy (spätné vyhodnotenie) ----

ipcMain.handle("tips:save", async (_e, tip: SavedTip) => {
  await saveTip(tip);
  return true;
});

ipcMain.handle("tips:list", async () => {
  return await listTips();
});

ipcMain.handle("tips:delete", async (_e, id: string) => {
  await deleteTip(id);
  return true;
});

ipcMain.handle("tips:clearAll", async () => {
  await clearAllTips();
  return true;
});

ipcMain.handle("tips:checkResults", async () => {
  // Ak je zapnutá synchronizácia s webovou appkou, kontrolu výsledkov
  // vykoná rovno ona (má rovnakú logiku) a appka len prevezme jej odpoveď.
  const remoteResult = await checkResultsRemote();
  if (remoteResult !== null) return remoteResult;

  const tips = await listTips();
  const pending = tips.filter((t) => t.status === "pending");

  for (const tip of pending) {
    if (tip.legs && tip.legs.length > 0) {
      // Tiket - vyhodnotíme každú "nohu" zvlášť (každá môže patriť inému zápasu).
      let anyLegChanged = false;

      for (const leg of tip.legs) {
        if (leg.status !== "pending") continue;

        const result = await getFixtureResult(leg.fixtureId);
        if (!result || result.status !== "FT" || result.homeGoals == null || result.awayGoals == null) {
          continue; // tento konkrétny zápas sa ešte neodohral
        }

        let corners: number | null = null;
        let cards: number | null = null;
        let shotsOnGoal: number | null = null;
        let fouls: number | null = null;
        let offsides: number | null = null;
        const statsMarkets = ["Rohy", "Karty", "Strely na bránu", "Fauly", "Ofsajdy"];
        if (statsMarkets.includes(leg.market)) {
          const stats = await getFixtureCornersAndCards(leg.fixtureId);
          corners = stats.corners;
          cards = stats.cards;
          shotsOnGoal = stats.shotsOnGoal;
          fouls = stats.fouls;
          offsides = stats.offsides;
        }

        let scorerIds: number[] | null = null;
        if (leg.market === "Strelec gólov") {
          scorerIds = await getFixtureGoalscorerIds(leg.fixtureId);
        }

        leg.status = evaluateTip(
          leg,
          result.homeGoals,
          result.awayGoals,
          corners,
          cards,
          scorerIds,
          shotsOnGoal,
          fouls,
          offsides
        );
        leg.actualHomeGoals = result.homeGoals;
        leg.actualAwayGoals = result.awayGoals;
        anyLegChanged = true;
      }

      if (anyLegChanged) {
        const overallStatus = computeTicketStatus(tip.legs);
        await updateTip(tip.id, { status: overallStatus, legs: tip.legs });
      }
      continue;
    }

    const result = await getFixtureResult(tip.fixtureId);
    if (!result || result.status !== "FT" || result.homeGoals == null || result.awayGoals == null) {
      continue; // zápas sa ešte neodohral, alebo výsledok nie je k dispozícii
    }

    let corners: number | null = null;
    let cards: number | null = null;
    let shotsOnGoal: number | null = null;
    let fouls: number | null = null;
    let offsides: number | null = null;
    const statsMarkets = ["Rohy", "Karty", "Strely na bránu", "Fauly", "Ofsajdy"];
    if (statsMarkets.includes(tip.market)) {
      const stats = await getFixtureCornersAndCards(tip.fixtureId);
      corners = stats.corners;
      cards = stats.cards;
      shotsOnGoal = stats.shotsOnGoal;
      fouls = stats.fouls;
      offsides = stats.offsides;
    }

    let scorerIds: number[] | null = null;
    if (tip.market === "Strelec gólov") {
      scorerIds = await getFixtureGoalscorerIds(tip.fixtureId);
    }

    const status = evaluateTip(
      tip,
      result.homeGoals,
      result.awayGoals,
      corners,
      cards,
      scorerIds,
      shotsOnGoal,
      fouls,
      offsides
    );
    await updateTip(tip.id, { status, actualHomeGoals: result.homeGoals, actualAwayGoals: result.awayGoals });
  }

  return await listTips();
});

// ---- Nastavenia synchronizácie s webovou appkou ----

ipcMain.handle("websync:get", () => {
  return getWebSyncSettings();
});

ipcMain.handle("websync:set", (_e, settings: WebSyncSettings) => {
  setWebSyncSettings(settings);
  return true;
});
