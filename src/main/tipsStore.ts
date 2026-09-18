import * as fs from "fs";
import * as path from "path";
import { app } from "electron";
import { SavedTip } from "./types";

function getFilePath(): string {
  return path.join(app.getPath("userData"), "saved-tips.json");
}

function readAll(): SavedTip[] {
  try {
    const raw = fs.readFileSync(getFilePath(), "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeAll(tips: SavedTip[]): void {
  fs.writeFileSync(getFilePath(), JSON.stringify(tips, null, 2), "utf-8");
}

export function saveTip(tip: SavedTip): void {
  const tips = readAll();
  tips.unshift(tip);
  writeAll(tips);
}

export function listTips(): SavedTip[] {
  return readAll();
}

export function updateTip(id: string, updates: Partial<SavedTip>): void {
  const tips = readAll();
  const idx = tips.findIndex((t) => t.id === id);
  if (idx >= 0) {
    tips[idx] = { ...tips[idx], ...updates };
    writeAll(tips);
  }
}

export function deleteTip(id: string): void {
  const tips = readAll().filter((t) => t.id !== id);
  writeAll(tips);
}
