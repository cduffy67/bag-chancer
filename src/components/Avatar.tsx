import { useEffect, useState } from "react";
import { loadProfile, PROFILE_EVENT, type Profile } from "@/lib/profile";
import defaultAvatar from "@/assets/default-avatar.svg";

export const DEFAULT_AVATAR = defaultAvatar;

export function useProfile(): Profile {
  const [p, setP] = useState<Profile>({});
  useEffect(() => {
    let cancelled = false;
    const read = () => {
      loadProfile().then((next) => {
        if (!cancelled) setP(next);
      });
    };
    read();
    window.addEventListener(PROFILE_EVENT, read);
    window.addEventListener("storage", read);
    return () => {
      cancelled = true;
      window.removeEventListener(PROFILE_EVENT, read);
      window.removeEventListener("storage", read);
    };
  }, []);
  return p;
}

export function ProfileAvatar({
  size = 32,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  const profile = useProfile();
  const src = profile.avatarDataUrl ?? DEFAULT_AVATAR;
  return (
    <div
      className={`grid shrink-0 place-items-center overflow-hidden rounded-full border-2 border-foreground bg-accent ${className}`}
      style={{ width: size, height: size }}
      title="Your profile"
      aria-label="Your profile"
    >
      <img src={src} alt="" className="h-full w-full object-cover" />
    </div>
  );
}

// Shown on "not a bag" results and history rows.
export function NotBagBadge({
  size = 32,
  className = "",
  wobble = false,
}: {
  size?: number;
  className?: string;
  wobble?: boolean;
}) {
  return (
    <div
      className={`grid shrink-0 place-items-center overflow-hidden rounded-full border-2 border-foreground bg-accent ${wobble ? "animate-wobble" : ""} ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.6) }}
      aria-label="Not a bag"
      title="Not a bag"
    >
      <span aria-hidden>🙃</span>
    </div>
  );
}
