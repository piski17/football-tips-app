import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("api", {
  hasApiKey: () => ipcRenderer.invoke("settings:hasApiKey"),
  getApiKey: () => ipcRenderer.invoke("settings:getApiKey"),
  setApiKey: (key: string) => ipcRenderer.invoke("settings:setApiKey", key),

  getLeaguePresets: () => ipcRenderer.invoke("leagues:presets"),

  getFixturesByLeague: (leagueId: number, season: number, next: number, date?: string) =>
    ipcRenderer.invoke("fixtures:byLeague", leagueId, season, next, date),

  analyzeFixture: (fixture: any, leagueId: number, season: number) =>
    ipcRenderer.invoke("analyze:fixture", { fixture, leagueId, season }),
});
