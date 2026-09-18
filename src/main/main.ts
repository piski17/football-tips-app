import { app, BrowserWindow, ipcMain } from "electron";
import * as path from "path";
import { getApiKey, setApiKey, hasApiKey } from "./config";
import {
  getFixturesByLeague,
  getTeamStatistics,
  getHeadToHead,
  getLeagueAverages,
  getHistoricalGoalPriors,
  getTeamCornersAverage,
} from "./apiClient";
import { predictMatch, DEFAULT_WEIGHTS } from "./predictor";
import { LeaguePreset } from "./types";

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

app.whenReady().then(createWindow);

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

    const [homeStats, awayStats, h2h, leagueAvg, homePriors, awayPriors, homeCorners, awayCorners] =
      await Promise.all([
        getTeamStatistics(leagueId, season, fixture.homeTeam.id),
        getTeamStatistics(leagueId, season, fixture.awayTeam.id),
        getHeadToHead(fixture.homeTeam.id, fixture.awayTeam.id, 10),
        getLeagueAverages(leagueId, season),
        getHistoricalGoalPriors(leagueId, season, fixture.homeTeam.id),
        getHistoricalGoalPriors(leagueId, season, fixture.awayTeam.id),
        getTeamCornersAverage(leagueId, season, fixture.homeTeam.id),
        getTeamCornersAverage(leagueId, season, fixture.awayTeam.id),
      ]);

    return predictMatch(
      fixture,
      homeStats,
      awayStats,
      h2h,
      leagueAvg,
      DEFAULT_WEIGHTS,
      homePriors,
      awayPriors,
      homeCorners,
      awayCorners
    );
  }
);
