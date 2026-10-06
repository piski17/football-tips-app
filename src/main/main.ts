import { app, BrowserWindow, ipcMain, nativeImage, shell } from "electron";
import * as path from "path";
import { getApiKey, setApiKey, hasApiKey, getWebSyncSettings, setWebSyncSettings, WebSyncSettings, hasWebSync } from "./config";
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
  getFixtureLineupPlayerIds,
  getFixtureOdds,
  getRecentFormAnyCompetition,
  getHeadToHeadStats,
} from "./apiClient";
import { predictMatch, predictPlayerGoal, DEFAULT_WEIGHTS } from "./predictor";
import { LeaguePreset, SavedTip } from "./types";
import {
  saveTip,
  listTips,
  updateTip,
  deleteTip,
  clearAllTips,
  checkResultsRemote,
  webClient,
  sendTipToTelegram,
  listSubscribersRemote,
  addSubscriberRemote,
  updateSubscriberRemote,
  deleteSubscriberRemote,
  sendNoTipTodayRemote,
  sendWeeklyReportRemote,
  sendDailyResultsRemote,
  sendTipResultRemote, archiveTip, editTip, recordShadowRemote, getShadowSummaryRemote, getClvSummaryRemote, listLeadsRemote, deleteLeadRemote } from "./tipsStore";
import { computeTicketStatus, settleBet, tipHasStartedMatch, MATCH_STARTED_MESSAGE } from "./tipEvaluator";

// Top ligy dostupné s API-Football Pro plánom.
const LEAGUE_PRESETS: LeaguePreset[] = [
  { id: 39, name: "Premier League", country: "Anglicko" },
  { id: 140, name: "La Liga", country: "Španielsko" },
  { id: 135, name: "Serie A", country: "Taliansko" },
  { id: 78, name: "Bundesliga", country: "Nemecko" },
  { id: 61, name: "Ligue 1", country: "Francúzsko" },
  { id: 2, name: "UEFA Champions League", country: "Európa" },
  // Liga národov (id 5) odstránená 6. 10. 2026 - reprezentácie majú málo zápasov, tipy nespoľahlivé.
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

  // Externé odkazy (Telegram tg://, https://t.me…) otvoriť v systéme, nie v okne appky.


  mainWindow.webContents.setWindowOpenHandler(({ url }) => {


    if (/^(https?:|tg:|mailto:)/.test(url)) void shell.openExternal(url);


    return { action: "deny" };


  });


  mainWindow.webContents.on("will-navigate", (e, url) => {


    if (/^(https?:|tg:|mailto:)/.test(url)) {


      e.preventDefault();


      void shell.openExternal(url);


    }


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

/**
 * Očakávaná hodnota štatistiky tímu v zápase: priemer toho, čo tím sám robí
 * (napr. koľko rohov získava), a toho, čo súper dovoľuje (koľko rohov púšťa).
 * Ak údaj o súperovi chýba, použije sa len vlastný priemer tímu.
 */
function mixStat(own: number | null | undefined, opponentAllows: number | null | undefined): number | null {
  if (own == null) return opponentAllows ?? null;
  if (opponentAllows == null) return own;
  return (own + opponentAllows) / 2;
}

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
    // Ak je zapnutá synchronizácia s webovou appkou, analýzu necháme
    // vypočítať priamo tam - appka len prevezme jej výsledok. Vďaka tomu
    // appka aj web vždy zobrazujú úplne rovnaké tipy (namiesto toho, aby si
    // to každý počítal nezávisle a mohol dostať mierne odlišné číslo).
    if (hasWebSync()) {
      const res = await webClient().post("/api/analyze", payload);
      return res.data;
    }

    const { fixture, leagueId, season } = payload;

    // Prvá vlna - rovnaké volania, ktoré boli predtým otestované ako stabilné.
    let [homeStats, awayStats, h2h, leagueAvg, homePriors, awayPriors, homeExtStats, awayExtStats] =
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

    // Tím v tejto sezóne súťaže ešte nehral (typicky reprezentácie na začiatku
    // Ligy národov) -> forma z posledných zápasov vo všetkých súťažiach.
    if (!homeStats.form) {
      const form = await getRecentFormAnyCompetition(fixture.homeTeam.id);
      if (form) homeStats = { ...homeStats, form };
    }
    if (!awayStats.form) {
      const form = await getRecentFormAnyCompetition(fixture.awayTeam.id);
      if (form) awayStats = { ...awayStats, form };
    }

    // Druhá vlna - súpisky hráčov + potvrdená zostava (ak je k dispozícii),
    // spustené AŽ PO prvej vlne, aby appka nevystrelila príliš veľa
    // požiadaviek úplne naraz.
    const [homePlayers, awayPlayers, lineup, marketOdds] = await Promise.all([
      getTeamPlayersWithStats(fixture.homeTeam.id, season, leagueId),
      getTeamPlayersWithStats(fixture.awayTeam.id, season, leagueId),
      getFixtureLineupPlayerIds(fixture.fixtureId),
      getFixtureOdds(fixture.fixtureId),
    ]);

    // Štatistiky posledných vzájomných zápasov (rohy, karty…) – pri chybe sa jednoducho nepoužijú.
    const h2hStats = await getHeadToHeadStats(h2h, fixture.homeTeam.name).catch(() => []);
    const result = predictMatch(
      fixture,
      homeStats,
      awayStats,
      h2h,
      leagueAvg,
      DEFAULT_WEIGHTS,
      homePriors,
      awayPriors,
      mixStat(homeExtStats.corners, awayExtStats.cornersAgainst),
      mixStat(awayExtStats.corners, homeExtStats.cornersAgainst),
      homePlayers,
      awayPlayers,
      lineup.homeIds,
      lineup.awayIds,
      {
        homeShotsOnGoal: mixStat(homeExtStats.shotsOnGoal, awayExtStats.shotsOnGoalAgainst),
        awayShotsOnGoal: mixStat(awayExtStats.shotsOnGoal, homeExtStats.shotsOnGoalAgainst),
        homeFouls: mixStat(homeExtStats.fouls, awayExtStats.foulsAgainst),
        awayFouls: mixStat(awayExtStats.fouls, homeExtStats.foulsAgainst),
        homeOffsides: mixStat(homeExtStats.offsides, awayExtStats.offsidesAgainst),
        awayOffsides: mixStat(awayExtStats.offsides, homeExtStats.offsidesAgainst),
        homePossession: homeExtStats.possession,
        awayPossession: awayExtStats.possession,
        homeCards: mixStat(homeExtStats.cards, awayExtStats.cardsAgainst),
        awayCards: mixStat(awayExtStats.cards, homeExtStats.cardsAgainst),
      },
      marketOdds,
      h2hStats,
      { home: { goalsFor: homeExtStats.goalsFor ?? null, goalsAgainst: homeExtStats.goalsAgainst ?? null, games: homeExtStats.goalsGames ?? 0 }, away: { goalsFor: awayExtStats.goalsFor ?? null, goalsAgainst: awayExtStats.goalsAgainst ?? null, games: awayExtStats.goalsGames ?? 0 } }
    );

    // Tichá evidencia tipov vyradených pre rozpor so stávkovkami – posiela sa na web
    // (len pri zapnutej synchronizácii), na pozadí, nič neblokuje.
    void recordShadowRemote(fixture, (result as any).lowValueBets ?? []);
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
  const isManualResult = tip.manualEntry === true && ["won", "lost", "void"].includes(tip.status);
  if (!isManualResult && tipHasStartedMatch(tip)) throw new Error(MATCH_STARTED_MESSAGE);
  await saveTip(tip);
  return true;
});

ipcMain.handle(
  "tips:sendToTelegram",
  async (_e, id: string, target: "premium" | "vip" | "both", asMatchOfWeek?: boolean) => {
    await sendTipToTelegram(id, target, asMatchOfWeek);
    return true;
  }
);

ipcMain.handle("subscribers:list", async () => {
  return listSubscribersRemote();
});

ipcMain.handle("subscribers:add", async (_e, subscriber: any) => {
  await addSubscriberRemote(subscriber);
  return true;
});

ipcMain.handle("subscribers:update", async (_e, id: string, updates: any) => {
  await updateSubscriberRemote(id, updates);
  return true;
});

ipcMain.handle("subscribers:delete", async (_e, id: string) => {
  await deleteSubscriberRemote(id);
  return true;
});

ipcMain.handle("telegram:noTipToday", async (_e, target: "premium" | "vip" | "both") => {
  await sendNoTipTodayRemote(target);
  return true;
});

ipcMain.handle(
  "telegram:dailyResults",
  async (_e, target: "premium" | "vip" | "both", day: string, force: boolean) => {
    return await sendDailyResultsRemote(target, day, force);
  }
);

ipcMain.handle("telegram:weeklyReport", async (_e, target: "premium" | "vip" | "both") => {
  await sendWeeklyReportRemote(target);
  return true;
});

ipcMain.handle("telegram:tipResult", async (_e, id: string, target: "premium" | "vip" | "both") => {
  await sendTipResultRemote(id, target);
  return true;
});


ipcMain.handle("tips:list", async () => {
  return await listTips();
});

ipcMain.handle("shadow:summary", async () => getShadowSummaryRemote());
ipcMain.handle("clv:summary", async () => getClvSummaryRemote());
ipcMain.handle("leads:list", async () => listLeadsRemote());
ipcMain.handle("leads:delete", async (_e, chatId: string) => deleteLeadRemote(chatId));

ipcMain.handle("tips:edit", async (_e, id: string, edit: any) => {
  await editTip(id, edit);
  return true;
});

ipcMain.handle("tips:archive", async (_e, id: string, archived: boolean) => {
  await archiveTip(id, archived);
  return true;
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
        const settled = await settleBet(leg);
        if (!settled) continue; // zápas sa ešte neskončil
        leg.status = settled.status;
        leg.actualHomeGoals = settled.homeGoals;
        leg.actualAwayGoals = settled.awayGoals;
        anyLegChanged = true;
      }
      if (anyLegChanged) {
        const overallStatus = computeTicketStatus(tip.legs);
        await updateTip(tip.id, { status: overallStatus, legs: tip.legs });
      }
      continue;
    }

    const settled = await settleBet(tip);
    if (!settled) continue; // zápas sa ešte neskončil
    await updateTip(tip.id, {
      status: settled.status,
      actualHomeGoals: settled.homeGoals,
      actualAwayGoals: settled.awayGoals,
    });
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
