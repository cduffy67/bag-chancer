// Manual stats. Bags checked & times chanced it are derived from history.

const KEY = "bag-chancer-stats";

export type Stats = {
  flightsSurvived: number;
  tripsCompleted: number;
};

const DEFAULT: Stats = { flightsSurvived: 0, tripsCompleted: 0 };

export function loadStats(): Stats {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    const parsed = JSON.parse(raw);
    return {
      flightsSurvived: parsed.flightsSurvived ?? 0,
      tripsCompleted: parsed.tripsCompleted ?? 0,
    };
  } catch {
    return DEFAULT;
  }
}

export function saveStats(s: Stats) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(s));
  window.dispatchEvent(new Event("bag-chancer:stats"));
}

export function bumpStat(key: keyof Stats, delta = 1) {
  const s = loadStats();
  s[key] = Math.max(0, s[key] + delta);
  saveStats(s);
}
