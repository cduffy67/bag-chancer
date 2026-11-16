import { motion } from "framer-motion";

const FACES = {
  happy: "🧳✨",
  nervous: "🧳😬",
  panic: "🧳🚨",
  default: "🧳",
} as const;

export function Mascot({
  mood = "default",
  size = "md",
}: {
  mood?: keyof typeof FACES;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = { sm: "text-4xl", md: "text-6xl", lg: "text-8xl" };
  return (
    <motion.div
      className={`select-none ${sizes[size]}`}
      animate={{ rotate: [-3, 3, -3], y: [0, -4, 0] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
    >
      {FACES[mood]}
    </motion.div>
  );
}
