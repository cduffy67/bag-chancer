import { motion } from "framer-motion";

export function ChancerMeter({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  const angle = (v / 100) * 180 - 90;
  return (
    <div className="relative mx-auto h-32 w-56">
      <svg viewBox="0 0 200 110" className="h-full w-full">
        <defs>
          <linearGradient id="meterGrad" x1="0" x2="1">
            <stop offset="0%" stopColor="var(--verdict-red)" />
            <stop offset="50%" stopColor="var(--verdict-amber)" />
            <stop offset="100%" stopColor="var(--verdict-green)" />
          </linearGradient>
        </defs>
        <path
          d="M 15 100 A 85 85 0 0 1 185 100"
          fill="none"
          stroke="url(#meterGrad)"
          strokeWidth="16"
          strokeLinecap="round"
        />
        <motion.line
          x1="100"
          y1="100"
          x2="100"
          y2="30"
          stroke="var(--foreground)"
          strokeWidth="4"
          strokeLinecap="round"
          initial={{ rotate: -90, originX: "100px", originY: "100px" }}
          animate={{ rotate: angle }}
          transition={{ type: "spring", stiffness: 70, damping: 12 }}
          style={{ transformOrigin: "100px 100px" }}
        />
        <circle cx="100" cy="100" r="8" fill="var(--foreground)" />
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center">
        <div className="font-display text-3xl font-extrabold">{v}%</div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">
          Confidence
        </div>
      </div>
    </div>
  );
}
