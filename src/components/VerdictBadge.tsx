import { TRAFFIC_LABELS, TRAFFIC_TONES, type Traffic } from "@/lib/verdict";

export type Tone = "green" | "amber" | "orange" | "red";

export function VerdictBadge({ traffic, className = "" }: { traffic: Traffic; className?: string }) {
  const tone = TRAFFIC_TONES[traffic] ?? "amber";
  const cls = toneClass(tone);
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${cls} ${className}`}>
      {TRAFFIC_LABELS[traffic] ?? traffic}
    </span>
  );
}

export function toneClass(tone: Tone): string {
  switch (tone) {
    case "green":
      return "!bg-verdict-green text-verdict-green-foreground";
    case "amber":
      return "!bg-verdict-amber text-verdict-amber-foreground";
    case "orange":
      return "!bg-verdict-orange text-verdict-orange-foreground";
    case "red":
      return "!bg-verdict-red text-verdict-red-foreground";
  }
}

export function toneEmoji(tone: Tone): string {
  switch (tone) {
    case "green":
      return "🟢";
    case "amber":
      return "🟡";
    case "orange":
      return "🟠";
    case "red":
      return "🔴";
  }
}
