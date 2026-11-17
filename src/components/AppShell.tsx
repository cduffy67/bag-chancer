import { Link } from "@tanstack/react-router";
import { Luggage } from "lucide-react";
import { ProfileAvatar } from "@/components/Avatar";

export function AppHeader() {
  return (
    <header className="mx-auto flex max-w-md items-center justify-between gap-2 px-4 pt-6 sm:px-5">
      <Link to="/" className="flex shrink-0 items-center gap-1.5">
        <span className="grid h-9 w-9 place-items-center rounded-2xl bg-primary text-primary-foreground btn-chunky sm:h-10 sm:w-10">
          <Luggage className="h-5 w-5" />
        </span>
        <span className="whitespace-nowrap font-display text-lg font-extrabold tracking-tight sm:text-2xl">
          Bag Chancer
        </span>
      </Link>
      <nav className="flex items-center text-[13px] font-semibold sm:gap-0.5 sm:text-sm">
        <Link
          to="/history"
          className="rounded-full px-1.5 py-1.5 hover:bg-accent/60 sm:px-2.5"
          activeProps={{ className: "bg-accent" }}
        >
          History
        </Link>
        <Link
          to="/eval"
          className="rounded-full px-1.5 py-1.5 hover:bg-accent/60 sm:px-2.5"
          activeProps={{ className: "bg-accent" }}
        >
          Eval
        </Link>
        <Link
          to="/about"
          className="rounded-full px-1.5 py-1.5 hover:bg-accent/60 sm:px-2.5"
          activeProps={{ className: "bg-accent" }}
        >
          About
        </Link>
        <Link to="/profile" className="ml-0.5" aria-label="Profile">
          <ProfileAvatar size={28} />
        </Link>
      </nav>
    </header>
  );
}

export function DisclaimerFooter() {
  return (
    <footer className="mx-auto mt-12 max-w-md px-5 pb-10 text-center text-xs leading-relaxed text-muted-foreground">
      <p className="rounded-2xl border border-dashed border-foreground/30 bg-card/60 p-3">
        Bag Chancer is for fun and guidance only. Airline staff always have the final say — don&apos;t blame the app if a gate agent chooses violence.
      </p>
    </footer>
  );
}
