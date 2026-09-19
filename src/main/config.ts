import Store from "electron-store";

interface ConfigSchema {
  apiFootballKey: string;
  webSyncUrl: string;
  webSyncUser: string;
  webSyncPassword: string;
}

// Uchováva API kľúč a nastavenia synchronizácie lokálne (v používateľskom
// priečinku appky, napr. ~/Library/Application Support/football-tips-app
// na macOS). POZOR: ukladá sa ako čistý text v lokálnom súbore - vhodné
// len pre osobné použitie na vlastnom počítači.
const store = new Store<ConfigSchema>({
  name: "config",
  defaults: {
    apiFootballKey: "",
    webSyncUrl: "",
    webSyncUser: "",
    webSyncPassword: "",
  },
});

export function getApiKey(): string {
  return store.get("apiFootballKey", "");
}

export function setApiKey(key: string): void {
  store.set("apiFootballKey", key.trim());
}

export function hasApiKey(): boolean {
  return getApiKey().length > 0;
}

export interface WebSyncSettings {
  url: string;
  user: string;
  password: string;
}

export function getWebSyncSettings(): WebSyncSettings {
  return {
    url: store.get("webSyncUrl", ""),
    user: store.get("webSyncUser", ""),
    password: store.get("webSyncPassword", ""),
  };
}

export function setWebSyncSettings(settings: WebSyncSettings): void {
  store.set("webSyncUrl", settings.url.trim().replace(/\/+$/, "")); // orežeme koncové lomky
  store.set("webSyncUser", settings.user.trim());
  store.set("webSyncPassword", settings.password);
}

export function hasWebSync(): boolean {
  return getWebSyncSettings().url.length > 0;
}
