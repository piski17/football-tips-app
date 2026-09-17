import { app, BrowserWindow, ipcMain } from "electron";
import * as path from "path";
import { getApiKey, setApiKey, hasApiKey } from "./config";
import {
  getFixturesByLeague,
  getFixturesByDate,
  getTeamStatistics,
  getHeadToHead,
} from "./apiClient";
import { predictMatch, DEFAULT_WEIGHTS } from "./predictor";
import { LeaguePreset } from "./types";

// Niekoľko bežných líg dostupných na bezplatnom pláne football-data.org.
const LEAGUE_PRESETS: LeaguePreset[] = [
  { id: "PL", name: "Premier League", country: "Anglicko" },
  { id: "PD", name: "La Liga", country: "Španielsko" },
  { id: "SA", name: "Serie A", country: "Taliansko" },
  { id: "BL1", name: "Bundesliga", country: "Nemecko" },
  { id: "FL1", name: "Ligue 1", country: "Francúzsko" },
  { id: "CL", name: "UEFA Champions League", country: "Európa" },
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
  async (_e, leagueId: string, season: number, next: number, date?: string) => {
    const day = date || new Date().toISOString().slice(0, 10);
    return getFixturesByLeague(leagueId, season, next, day, day);
  }
);

ipcMain.handle(
  "fixtures:byDate",
  async (_e, date: string, leagueId?: string, season?: number) => {
    return getFixturesByDate(date, leagueId, season);
  }
);

ipcMain.handle(
  "analyze:fixture",
  async (
    _e,
    payload: {
      fixture: any;
      leagueId: string;
      season: number;
    }
  ) => {
    const { fixture, leagueId, season } = payload;

    const [homeStats, awayStats, h2h] = await Promise.all([
      getTeamStatistics(leagueId, season, fixture.homeTeam.id),
      getTeamStatistics(leagueId, season, fixture.awayTeam.id),
      getHeadToHead(fixture.fixtureId, 10),
    ]);

    return predictMatch(fixture, homeStats, awayStats, h2h, DEFAULT_WEIGHTS);
  }
);
