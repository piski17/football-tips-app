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

  getSquad: (teamId: number) => ipcRenderer.invoke("squad:get", teamId),

  analyzePlayerGoal: (payload: {
    playerId: number;
    playerName: string;
    leagueId: number;
    season: number;
    teamExpectedGoalsThisMatch: number;
    teamSeasonGoalsPerGame: number;
  }) => ipcRenderer.invoke("player:analyzeGoal", payload),

  saveTip: (tip: any) => ipcRenderer.invoke("tips:save", tip),
  sendTipToTelegram: (id: string, target: string, asMatchOfWeek?: boolean) =>
    ipcRenderer.invoke("tips:sendToTelegram", id, target, asMatchOfWeek),
  listSubscribers: () => ipcRenderer.invoke("subscribers:list"),
  addSubscriber: (subscriber: any) => ipcRenderer.invoke("subscribers:add", subscriber),
  updateSubscriber: (id: string, updates: any) => ipcRenderer.invoke("subscribers:update", id, updates),
  deleteSubscriber: (id: string) => ipcRenderer.invoke("subscribers:delete", id),
  sendNoTipToday: (target: string) => ipcRenderer.invoke("telegram:noTipToday", target),
  sendWeeklyReport: (target: string) => ipcRenderer.invoke("telegram:weeklyReport", target),
  sendTipResult: (id: string, target: string) => ipcRenderer.invoke("telegram:tipResult", id, target),
  listTips: () => ipcRenderer.invoke("tips:list"),
  deleteTip: (id: string) => ipcRenderer.invoke("tips:delete", id),
  checkTipResults: () => ipcRenderer.invoke("tips:checkResults"),
  clearAllTips: () => ipcRenderer.invoke("tips:clearAll"),

  getWebSyncSettings: () => ipcRenderer.invoke("websync:get"),
  setWebSyncSettings: (settings: { url: string; user: string; password: string }) =>
    ipcRenderer.invoke("websync:set", settings),
});
