import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("api", {
  hasApiKey: () => ipcRenderer.invoke("settings:hasApiKey"),
  getApiKey: () => ipcRenderer.invoke("settings:getApiKey"),
  setApiKey: (key: string) => ipcRenderer.invoke("settings:setApiKey", key),

  getLeaguePresets: () => ipcRenderer.invoke("leagues:presets"),

  getFixturesByLeague: (leagueId: string, season: number, next: number, date?: string) =>
    ipcRenderer.invoke("fixtures:byLeague", leagueId, season, next, date),

  getFixturesByDate: (date: string, leagueId?: string, season?: number) =>
    ipcRenderer.invoke("fixtures:byDate", date, leagueId, season),

  analyzeFixture: (fixture: any, leagueId: string, season: number) =>
    ipcRenderer.invoke("analyze:fixture", { fixture, leagueId, season }),
});
