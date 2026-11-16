import { Link } from "@tanstack/react-router";
import { Luggage } from "lucide-react";
import { ProfileAvatar } from "@/components/Avatar";

export function AppHeader() {
  return (
    <header className="mx-auto flex max-w-md items-center justify-between px-5 pt-6">
      <Link to="/" className="flex items-center gap-2">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary text-primary-foreground btn-chunky">
          <Luggage className="h-5 w-5" />
        </span>
        <span className="font-display text-2xl font-extrabold tracking-tight">
          Bag Chancer
        </span>
      </Link>
      <nav className="flex items-center gap-1 text-sm font-semibold">
        <Link
          to="/history"
          className="rounded-full px-3 py-1.5 hover:bg-accent/60"
          activeProps={{ className: "bg-accent" }}
        >
          History
        </Link>
        <Link
          to="/about"
          className="rounded-full px-3 py-1.5 hover:bg-accent/60"
          activeProps={{ className: "bg-accent" }}
        >
          About
        </Link>
        <Link to="/profile" className="ml-1" aria-label="Profile">
          <ProfileAvatar size={32} />
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
