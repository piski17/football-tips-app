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
    try {
      await webClient().post("/api/tips", tip);
    } catch (err: any) {
      // Zrozumiteľná hláška zo servera (napr. "Zápas už začal…") namiesto "status code 400".
      throw new Error(err?.response?.data?.error ?? err?.message ?? String(err));
    }
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
  if (!target) return;
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

/**
 * Pošle už uložený tip do Telegramu - funguje len pri zapnutej synchronizácii
 * s webom (Telegram integrácia beží na strane webového servera).
 */
export async function sendTipToTelegram(
  id: string,
  target: "premium" | "vip" | "both",
  asMatchOfWeek?: boolean
): Promise<void> {
  if (!hasWebSync()) {
    throw new Error("Odosielanie do Telegramu funguje len pri zapnutej synchronizácii s webovou appkou.");
  }
  await webClient().post(`/api/tips/${id}/telegram`, { target, asMatchOfWeek });
}

/**
 * Správa predplatiteľov beží výhradne na webovom serveri (dáta sú v Upstash
 * Redis) - appka len preposiela požiadavky tam. Funguje len pri zapnutej
 * synchronizácii s webom.
 */
function requireWebSync(): void {
  if (!hasWebSync()) {
    throw new Error("Táto funkcia funguje len pri zapnutej synchronizácii s webovou appkou.");
  }
}

export async function listSubscribersRemote(): Promise<any[]> {
  requireWebSync();
  const res = await webClient().get("/api/subscribers");
  return res.data ?? [];
}

export async function addSubscriberRemote(subscriber: any): Promise<void> {
  requireWebSync();
  await webClient().post("/api/subscribers", subscriber);
}

export async function updateSubscriberRemote(id: string, updates: any): Promise<void> {
  requireWebSync();
  await webClient().patch(`/api/subscribers/${id}`, updates);
}

export async function deleteSubscriberRemote(id: string): Promise<void> {
  requireWebSync();
  await webClient().delete(`/api/subscribers/${id}`);
}

export async function sendNoTipTodayRemote(target: "premium" | "vip" | "both"): Promise<void> {
  requireWebSync();
  await webClient().post("/api/telegram/no-tip-today", { target });
}

export async function sendWeeklyReportRemote(target: "premium" | "vip" | "both"): Promise<void> {
  requireWebSync();
  await webClient().post("/api/telegram/weekly-report", { target });
}

export async function sendTipResultRemote(id: string, target: "premium" | "vip" | "both"): Promise<void> {
  requireWebSync();
  await webClient().post(`/api/tips/${id}/telegram-result`, { target });
}
