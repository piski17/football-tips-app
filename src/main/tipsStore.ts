import * as fs from "fs";
import * as path from "path";
import axios from "axios";
import { app } from "electron";
import { SavedTip } from "./types";
import { getWebSyncSettings, hasWebSync } from "./config";

// ---- Lokálne úložisko (záloha / režim bez nastavenej web appky) ----

function getFilePath(): string {
  return path.join(app.getPath("userData"), "saved-tips.json");
}

function readAllLocal(): SavedTip[] {
  try {
    const raw = fs.readFileSync(getFilePath(), "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeAllLocal(tips: SavedTip[]): void {
  fs.writeFileSync(getFilePath(), JSON.stringify(tips, null, 2), "utf-8");
}

// ---- Klient na komunikáciu s webovou appkou (ak je nastavená) ----

export function webClient() {
  const { url, user, password } = getWebSyncSettings();
  const auth = user && password ? { username: user, password } : undefined;
  return axios.create({ baseURL: url, timeout: 30000, auth });
}

// ---- Verejné funkcie - použijú web appku, ak je nastavená, inak lokálny súbor ----

export async function saveTip(tip: SavedTip): Promise<void> {
  if (hasWebSync()) {
    await webClient().post("/api/tips", tip);
    return;
  }
  const tips = readAllLocal();
  tips.unshift(tip);
  writeAllLocal(tips);
}

export async function listTips(): Promise<SavedTip[]> {
  if (hasWebSync()) {
    const res = await webClient().get("/api/tips");
    return res.data ?? [];
  }
  return readAllLocal();
}

export async function updateTip(id: string, updates: Partial<SavedTip>): Promise<void> {
  if (hasWebSync()) {
    // Webová appka nemá samostatný "update" endpoint - kontrola výsledkov sa
    // preto pri zapnutej synchronizácii vykonáva na strane web servera
    // (pozri checkResultsRemote nižšie), táto funkcia sa v tom prípade nepoužíva.
    return;
  }
  const tips = readAllLocal();
  const idx = tips.findIndex((t) => t.id === id);
  if (idx >= 0) {
    tips[idx] = { ...tips[idx], ...updates };
    writeAllLocal(tips);
  }
}

/** Zmaže tip len ak je ešte "pending" - už vyhodnotené tipy (won/lost/void) sa nedajú zmazať, aby zostala história presná. */
export async function deleteTip(id: string): Promise<void> {
  if (hasWebSync()) {
    await webClient().delete(`/api/tips/${id}`);
    return;
  }
  const tips = readAllLocal();
  const target = tips.find((t) => t.id === id);
  if (!target || target.status !== "pending") return;
  writeAllLocal(tips.filter((t) => t.id !== id));
}

/** Vymaže úplne všetky uložené tipy (aj vyhodnotené) - použiteľné na kompletný reštart histórie. */
export async function clearAllTips(): Promise<void> {
  if (hasWebSync()) {
    await webClient().delete("/api/tips");
    return;
  }
  writeAllLocal([]);
}

/**
 * Skontroluje výsledky - pri zapnutej synchronizácii deleguje kontrolu na
 * webovú appku (má vlastný endpoint, ktorý si to vyhodnotí a rovno vráti
 * aktualizovaný zoznam). Bez synchronizácie appka kontroluje lokálne sama
 * (implementácia zostáva v main.ts).
 */
export async function checkResultsRemote(): Promise<SavedTip[] | null> {
  if (!hasWebSync()) return null;
  const res = await webClient().post("/api/tips/check-results");
  return res.data ?? [];
}
