// Hardcoded airline carry-on rules for Ireland↔UK flights.
// Dimensions are in cm (W x H x D) and weights in kg.
// Sources: published baggage rules as of 2025. Subject to change — this is a playful guide.

export type FareTier = {
  id: string;
  name: string;
  // free included bag(s) — small under-seat
  smallBag?: { w: number; h: number; d: number; weight?: number };
  // larger cabin bag (overhead)
  cabinBag?: { w: number; h: number; d: number; weight?: number };
};

export type Airline = {
  id: string;
  name: string;
  emoji: string;
  fares: FareTier[];
  note?: string;
};

export const AIRLINES: Airline[] = [
  {
    id: "ryanair",
    name: "Ryanair",
    emoji: "🟦",
    note: "Famously strict at the gate.",
    fares: [
      {
        id: "basic",
        name: "Basic (no Priority)",
        smallBag: { w: 40, h: 25, d: 20, weight: 10 },
      },
      {
        id: "priority",
        name: "Priority & 2 Cabin Bags",
        smallBag: { w: 40, h: 25, d: 20 },
        cabinBag: { w: 55, h: 40, d: 20, weight: 10 },
      },
      {
        id: "plus",
        name: "Plus",
        smallBag: { w: 40, h: 25, d: 20 },
        cabinBag: { w: 55, h: 40, d: 20, weight: 10 },
      },
      {
        id: "flexi",
        name: "Flexi Plus",
        smallBag: { w: 40, h: 25, d: 20 },
        cabinBag: { w: 55, h: 40, d: 20, weight: 10 },
      },
    ],
  },
  {
    id: "aerlingus",
    name: "Aer Lingus",
    emoji: "🟩",
    fares: [
      {
        id: "saver",
        name: "Saver / Smart (short-haul)",
        smallBag: { w: 25, h: 33, d: 20 },
        cabinBag: { w: 55, h: 40, d: 24, weight: 10 },
      },
      {
        id: "plus",
        name: "Plus / Advantage",
        smallBag: { w: 25, h: 33, d: 20 },
        cabinBag: { w: 55, h: 40, d: 24, weight: 10 },
      },
    ],
  },
  {
    id: "emerald",
    name: "Aer Lingus Regional (Emerald)",
    emoji: "💚",
    note: "Smaller ATR aircraft — overhead space is tight.",
    fares: [
      {
        id: "saver",
        name: "Saver",
        smallBag: { w: 25, h: 33, d: 20 },
        cabinBag: { w: 48, h: 33, d: 20, weight: 7 },
      },
      {
        id: "plus",
        name: "Plus",
        smallBag: { w: 25, h: 33, d: 20 },
        cabinBag: { w: 48, h: 33, d: 20, weight: 7 },
      },
    ],
  },
  {
    id: "ba",
    name: "British Airways",
    emoji: "🇬🇧",
    fares: [
      {
        id: "basic",
        name: "Basic / Economy",
        smallBag: { w: 40, h: 30, d: 15, weight: 23 },
        cabinBag: { w: 56, h: 45, d: 25, weight: 23 },
      },
    ],
  },
  {
    id: "easyjet",
    name: "easyJet",
    emoji: "🟧",
    fares: [
      {
        id: "standard",
        name: "Standard (no add-on)",
        smallBag: { w: 45, h: 36, d: 20, weight: 15 },
      },
      {
        id: "uphold",
        name: "Up Front / Extra Legroom",
        smallBag: { w: 45, h: 36, d: 20 },
        cabinBag: { w: 56, h: 45, d: 25, weight: 15 },
      },
      {
        id: "plus",
        name: "easyJet Plus / Hands Free",
        smallBag: { w: 45, h: 36, d: 20 },
        cabinBag: { w: 56, h: 45, d: 25, weight: 15 },
      },
    ],
  },
  {
    id: "loganair",
    name: "Loganair",
    emoji: "🟪",
    note: "Small turboprops — bags often gate-checked.",
    fares: [
      {
        id: "standard",
        name: "Standard",
        smallBag: { w: 35, h: 20, d: 16 },
        cabinBag: { w: 55, h: 40, d: 20, weight: 6 },
      },
    ],
  },
];

export const AIRPORTS = [
  { id: "DUB", name: "Dublin (DUB)", country: "IE" },
  { id: "ORK", name: "Cork (ORK)", country: "IE" },
  { id: "SNN", name: "Shannon (SNN)", country: "IE" },
  { id: "NOC", name: "Knock (NOC)", country: "IE" },
  { id: "BFS", name: "Belfast International (BFS)", country: "UK" },
  { id: "BHD", name: "Belfast City (BHD)", country: "UK" },
  { id: "LHR", name: "London Heathrow (LHR)", country: "UK" },
  { id: "LGW", name: "London Gatwick (LGW)", country: "UK" },
  { id: "STN", name: "London Stansted (STN)", country: "UK" },
  { id: "LTN", name: "London Luton (LTN)", country: "UK" },
  { id: "MAN", name: "Manchester (MAN)", country: "UK" },
  { id: "LPL", name: "Liverpool (LPL)", country: "UK" },
  { id: "EDI", name: "Edinburgh (EDI)", country: "UK" },
  { id: "GLA", name: "Glasgow (GLA)", country: "UK" },
  { id: "BRS", name: "Bristol (BRS)", country: "UK" },
  { id: "BHX", name: "Birmingham (BHX)", country: "UK" },
];

export function getAirline(id: string): Airline | undefined {
  return AIRLINES.find((a) => a.id === id);
}
