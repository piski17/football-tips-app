import Store from "electron-store";

interface ConfigSchema {
  apiFootballKey: string;
}

// Uchováva API kľúč lokálne (v používateľskom priečinku appky, napr.
// ~/Library/Application Support/football-tips-app na macOS).
// POZOR: kľúč sa ukladá ako čistý text v lokálnom súbore - vhodné len
// pre osobné použitie na vlastnom počítači.
const store = new Store<ConfigSchema>({
  name: "config",
  defaults: {
    apiFootballKey: "",
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
