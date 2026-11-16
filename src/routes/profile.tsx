import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Trash2, ArrowLeft } from "lucide-react";
import { AppHeader, DisclaimerFooter } from "@/components/AppShell";
import { DEFAULT_AVATAR } from "@/components/Avatar";
import { clearAvatar, loadProfile, saveAvatar } from "@/lib/profile";
import { fileToResizedDataUrl } from "@/lib/image";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
  head: () => ({
    meta: [{ title: "Profile — Bag Chancer" }],
  }),
});

function ProfilePage() {
  const [avatar, setAvatar] = useState<string | undefined>(undefined);
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProfile().then((p) => setAvatar(p.avatarDataUrl));
  }, []);

  const onFile = async (file: File) => {
    const url = await fileToResizedDataUrl(file, 256);
    setAvatar(url);
    await saveAvatar(url);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const onClear = async () => {
    await clearAvatar();
    setAvatar(undefined);
  };

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-md px-5 pt-4">
        <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        <h1 className="font-display text-3xl font-extrabold">Your avatar</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick any photo — it shows in the header and is used sparingly throughout the app.
        </p>

        <section className="card-chunky mt-6 p-5">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="grid h-24 w-24 place-items-center overflow-hidden rounded-full border-2 border-foreground bg-accent text-2xl font-bold"
            >
              <img
                src={avatar ?? DEFAULT_AVATAR}
                alt="Your avatar"
                className="h-full w-full object-cover"
              />
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onFile(f);
                }}
              />
            </button>
            <div className="flex-1 text-sm">
              <div className="font-display text-xl font-extrabold">You</div>
              <p className="mt-1 text-xs text-muted-foreground">
                {saved ? "Saved ✓" : avatar ? "Tap to swap photo." : "Tap to upload your own."}
              </p>
              {avatar && (
                <button
                  onClick={onClear}
                  className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-destructive"
                >
                  <Trash2 className="h-3 w-3" /> Remove photo
                </button>
              )}
            </div>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Stored only on this device. Nothing is uploaded.
          </p>
        </section>

        <DisclaimerFooter />
      </main>
    </div>
  );
}
