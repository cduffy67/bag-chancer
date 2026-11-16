import type { Verdict } from "./verdict";
import { dbDeleteEntry, dbGetEntry, dbListEntries, dbSaveEntry } from "./db";

export const HISTORY_EVENT = "bag-chancer:history";

export type HistoryEntry = {
  id: string;
  createdAt: number;
  thumbnail?: string; // data URL
  airlineId: string;
  airlineName: string;
  fareId: string;
  fareName: string;
  fromAirport?: string;
  toAirport?: string;
  verdict?: Verdict;
  // AI vision metadata
  notBag?: boolean;
  schemaFailed?: boolean;
  detectedObject?: string;
  observation?: string;
};

function emit() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(HISTORY_EVENT));
  }
}

export async function loadHistory(): Promise<HistoryEntry[]> {
  return dbListEntries();
}

export async function saveEntry(entry: HistoryEntry): Promise<void> {
  await dbSaveEntry(entry);
  emit();
}

export async function getEntry(id: string): Promise<HistoryEntry | undefined> {
  return dbGetEntry(id);
}

export async function deleteEntry(id: string): Promise<void> {
  await dbDeleteEntry(id);
  emit();
}

export function newId() {
  return Math.random().toString(36).slice(2, 10);
}
