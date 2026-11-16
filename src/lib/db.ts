// Lightweight IndexedDB wrapper for Bag Chancer.
// IndexedDB on iOS Safari is much more durable than localStorage,
// which the OS aggressively evicts after ~7 days of inactivity.
//
// One-time migration copies any existing localStorage data over on first load.

import type { HistoryEntry } from "./history";

const DB_NAME = "bag-chancer";
const DB_VERSION = 1;
const STORE_ENTRIES = "entries";
const STORE_META = "meta";
const LS_HISTORY = "bag-chancer-history";
const LS_AVATAR = "bag-chancer-avatar";

let dbPromise: Promise<IDBDatabase> | null = null;
let useFallback = false;

function isAvailable(): boolean {
  return typeof window !== "undefined" && "indexedDB" in window && !useFallback;
}

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  const p = new Promise<IDBDatabase>((resolve, reject) => {
    try {
      const req = window.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_ENTRIES)) {
          const store = db.createObjectStore(STORE_ENTRIES, { keyPath: "id" });
          store.createIndex("byCreatedAt", "createdAt");
        }
        if (!db.objectStoreNames.contains(STORE_META)) {
          db.createObjectStore(STORE_META, { keyPath: "key" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    } catch (err) {
      reject(err);
    }
  }).catch((err: unknown) => {
    console.warn("[db] IndexedDB unavailable, falling back to localStorage:", err);
    useFallback = true;
    throw err;
  });
  dbPromise = p;
  return p;
}

function tx(db: IDBDatabase, store: string, mode: IDBTransactionMode) {
  return db.transaction(store, mode).objectStore(store);
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ---------- Migration ----------
let migrationPromise: Promise<void> | null = null;

async function ensureMigrated(): Promise<void> {
  if (migrationPromise) return migrationPromise;
  migrationPromise = (async () => {
    if (!isAvailable()) return;
    try {
      const db = await openDb();
      const already = await reqToPromise(
        tx(db, STORE_META, "readonly").get("migratedFromLocalStorage"),
      );
      if (already) return;

      // History
      try {
        const raw = window.localStorage.getItem(LS_HISTORY);
        if (raw) {
          const list = JSON.parse(raw) as HistoryEntry[];
          if (Array.isArray(list) && list.length) {
            const store = tx(db, STORE_ENTRIES, "readwrite");
            for (const entry of list) {
              if (entry && entry.id) store.put(entry);
            }
          }
        }
      } catch (err) {
        console.warn("[db] history migration failed:", err);
      }

      // Avatar
      try {
        const avatar = window.localStorage.getItem(LS_AVATAR);
        if (avatar) {
          await reqToPromise(
            tx(db, STORE_META, "readwrite").put({ key: "avatarDataUrl", value: avatar }),
          );
        }
      } catch (err) {
        console.warn("[db] avatar migration failed:", err);
      }

      await reqToPromise(
        tx(db, STORE_META, "readwrite").put({ key: "migratedFromLocalStorage", value: true }),
      );
      console.log("[db] migration complete");
    } catch (err) {
      console.warn("[db] migration skipped:", err);
    }
  })();
  return migrationPromise;
}

// ---------- Entries ----------

export async function dbListEntries(): Promise<HistoryEntry[]> {
  if (!isAvailable()) return fallbackListEntries();
  try {
    await ensureMigrated();
    const db = await openDb();
    const all = await reqToPromise(tx(db, STORE_ENTRIES, "readonly").getAll());
    return (all as HistoryEntry[]).sort((a, b) => b.createdAt - a.createdAt);
  } catch (err) {
    console.warn("[db] listEntries fallback:", err);
    return fallbackListEntries();
  }
}

export async function dbGetEntry(id: string): Promise<HistoryEntry | undefined> {
  if (!isAvailable()) return fallbackListEntries().find((e) => e.id === id);
  try {
    await ensureMigrated();
    const db = await openDb();
    const e = await reqToPromise(tx(db, STORE_ENTRIES, "readonly").get(id));
    return e as HistoryEntry | undefined;
  } catch (err) {
    console.warn("[db] getEntry fallback:", err);
    return fallbackListEntries().find((e) => e.id === id);
  }
}

export async function dbSaveEntry(entry: HistoryEntry): Promise<void> {
  if (!isAvailable()) return fallbackSaveEntry(entry);
  try {
    await ensureMigrated();
    const db = await openDb();
    await reqToPromise(tx(db, STORE_ENTRIES, "readwrite").put(entry));
  } catch (err) {
    console.warn("[db] saveEntry fallback:", err);
    fallbackSaveEntry(entry);
  }
}

export async function dbDeleteEntry(id: string): Promise<void> {
  if (!isAvailable()) return fallbackDeleteEntry(id);
  try {
    await ensureMigrated();
    const db = await openDb();
    await reqToPromise(tx(db, STORE_ENTRIES, "readwrite").delete(id));
  } catch (err) {
    console.warn("[db] deleteEntry fallback:", err);
    fallbackDeleteEntry(id);
  }
}

// ---------- Avatar ----------

export async function dbGetAvatar(): Promise<string | undefined> {
  if (!isAvailable()) return fallbackGetAvatar();
  try {
    await ensureMigrated();
    const db = await openDb();
    const row = (await reqToPromise(tx(db, STORE_META, "readonly").get("avatarDataUrl"))) as
      | { key: string; value: string }
      | undefined;
    return row?.value;
  } catch (err) {
    console.warn("[db] getAvatar fallback:", err);
    return fallbackGetAvatar();
  }
}

export async function dbSetAvatar(dataUrl: string): Promise<void> {
  if (!isAvailable()) return fallbackSetAvatar(dataUrl);
  try {
    await ensureMigrated();
    const db = await openDb();
    await reqToPromise(
      tx(db, STORE_META, "readwrite").put({ key: "avatarDataUrl", value: dataUrl }),
    );
  } catch (err) {
    console.warn("[db] setAvatar fallback:", err);
    fallbackSetAvatar(dataUrl);
  }
}

export async function dbClearAvatar(): Promise<void> {
  if (!isAvailable()) return fallbackClearAvatar();
  try {
    await ensureMigrated();
    const db = await openDb();
    await reqToPromise(tx(db, STORE_META, "readwrite").delete("avatarDataUrl"));
  } catch (err) {
    console.warn("[db] clearAvatar fallback:", err);
    fallbackClearAvatar();
  }
}

// ---------- localStorage fallback ----------

function fallbackListEntries(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LS_HISTORY);
    if (!raw) return [];
    return JSON.parse(raw) as HistoryEntry[];
  } catch {
    return [];
  }
}

function fallbackSaveEntry(entry: HistoryEntry) {
  if (typeof window === "undefined") return;
  const list = fallbackListEntries().filter((e) => e.id !== entry.id);
  list.unshift(entry);
  window.localStorage.setItem(LS_HISTORY, JSON.stringify(list.slice(0, 200)));
}

function fallbackDeleteEntry(id: string) {
  if (typeof window === "undefined") return;
  const list = fallbackListEntries().filter((e) => e.id !== id);
  window.localStorage.setItem(LS_HISTORY, JSON.stringify(list));
}

function fallbackGetAvatar(): string | undefined {
  if (typeof window === "undefined") return undefined;
  return window.localStorage.getItem(LS_AVATAR) ?? undefined;
}

function fallbackSetAvatar(dataUrl: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LS_AVATAR, dataUrl);
}

function fallbackClearAvatar() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LS_AVATAR);
}
