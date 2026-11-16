import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { Camera, Loader2, Plane, Ticket, Upload, X } from "lucide-react";
import { AppHeader, DisclaimerFooter } from "@/components/AppShell";
import { AIRLINES, AIRPORTS, getAirline } from "@/lib/airlines";
import { fileToResizedDataUrl, makeThumbnail } from "@/lib/image";
import { analyzeBag } from "@/lib/analyzeBag.functions";
import { computeVerdict, type Dims } from "@/lib/verdict";
import { newId, saveEntry } from "@/lib/history";
import { loadProfile } from "@/lib/profile";

export const Route = createFileRoute("/check")({
  component: CheckPage,
  head: () => ({
    meta: [
      { title: "Check your bag — Bag Chancer" },
      {
        name: "description",
        content: "Snap your bag and let Bag Chancer guess if it survives the gate.",
      },
    ],
  }),
});

function CheckPage() {
  const navigate = useNavigate();
  const analyzeFn = useServerFn(analyzeBag);

  const [bagImage, setBagImage] = useState<string | null>(null);

  const [airlineId, setAirlineId] = useState("ryanair");
  const [fareId, setFareId] = useState("basic");
  const [fromAirport, setFromAirport] = useState("DUB");
  const [toAirport, setToAirport] = useState("STN");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const airline = useMemo(() => getAirline(airlineId)!, [airlineId]);

  const handleBag = async (file: File) => {
    setError(null);
    const url = await fileToResizedDataUrl(file, 1024);
    setBagImage(url);
  };

  const onSubmit = async () => {
    if (!bagImage) {
      setError("Snap or upload a photo of your bag first.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const ai = await analyzeFn({
        data: { bagImageDataUrl: bagImage },
      });

      if (!ai.ok) {
        if (ai.schemaFailed) {
          const thumb = await makeThumbnail(bagImage);
          const id = newId();
          const fare = airline.fares.find((f) => f.id === fareId) ?? airline.fares[0];
          await saveEntry({
            id,
            createdAt: Date.now(),
            thumbnail: thumb,
            airlineId,
            airlineName: airline.name,
            fareId,
            fareName: fare.name,
            fromAirport,
            toAirport,
            schemaFailed: true,
          });
          navigate({ to: "/result/$id", params: { id } });
          return;
        }
        setError(ai.error);
        return;
      }

      const thumb = await makeThumbnail(bagImage);
      const id = newId();
      const fare = airline.fares.find((f) => f.id === fareId) ?? airline.fares[0];

      // If the AI says this isn't a bag, save a "not a bag" entry and skip scoring.
      if (!ai.result.isBag) {
        await saveEntry({
          id,
          createdAt: Date.now(),
          thumbnail: thumb,
          airlineId,
          airlineName: airline.name,
          fareId,
          fareName: fare.name,
          fromAirport,
          toAirport,
          notBag: true,
          detectedObject: ai.result.detectedObject,
          observation: ai.result.notes,
        });
        navigate({ to: "/result/$id", params: { id } });
        return;
      }

      const estimatedDims: Dims = {
        w: Math.round(ai.result.estimatedWidthCm),
        h: Math.round(ai.result.estimatedHeightCm),
        d: Math.round(ai.result.estimatedDepthCm),
      };
      // Map vision bagType (broad) → verdict bagType (soft/hard/backpack/tote)
      const bagType: "soft" | "hard" | "backpack" | "tote" =
        ai.result.bagType === "backpack"
          ? "backpack"
          : ai.result.bagType === "tote" || ai.result.bagType === "handbag"
            ? "tote"
            : ai.result.softOrHard === "hard-shell"
              ? "hard"
              : "soft";
      const bulging = ai.result.overpacked === "yes";

      const profile = await loadProfile();
      const verdict = computeVerdict({
        airlineId,
        fareId,
        estimatedDims,
        bagType,
        bulging,
        hasReferenceObject: ai.result.referenceObjectDetected,
        name: profile?.name,
      });

      await saveEntry({
        id,
        createdAt: Date.now(),
        thumbnail: thumb,
        airlineId,
        airlineName: airline.name,
        fareId,
        fareName: fare.name,
        fromAirport,
        toAirport,
        verdict,
        observation: ai.result.notes,
      });

      navigate({ to: "/result/$id", params: { id } });
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-md px-5 pt-6">
        <h1 className="font-display text-3xl font-extrabold">Check your bag</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Honest photos = honest verdict.
        </p>

        <Section step={1} title="Snap the bag" icon={<Camera className="h-4 w-4" />}>
          <p className="mb-3 text-xs italic text-muted-foreground">
            Pop something for scale in the shot — a can, a phone, a shoe — so the AI can size it properly.
          </p>
          <PhotoPicker
            value={bagImage}
            onChange={handleBag}
            onClear={() => setBagImage(null)}
            label="Tap to take or upload a photo"
          />
        </Section>

        <Section step={2} title="Pick your airline" icon={<Plane className="h-4 w-4" />}>
          <select
            value={airlineId}
            onChange={(e) => {
              setAirlineId(e.target.value);
              const al = getAirline(e.target.value)!;
              setFareId(al.fares[0].id);
            }}
            className="w-full rounded-2xl border-2 border-foreground bg-card px-4 py-3 font-semibold"
          >
            {AIRLINES.map((a) => (
              <option key={a.id} value={a.id}>
                {a.emoji}  {a.name}
              </option>
            ))}
          </select>
          {airline.note && (
            <p className="mt-2 text-xs italic text-muted-foreground">{airline.note}</p>
          )}
        </Section>

        <Section step={3} title="Fare type" icon={<Ticket className="h-4 w-4" />}>
          <div className="grid grid-cols-1 gap-2">
            {airline.fares.map((f) => (
              <label
                key={f.id}
                className={`card-chunky flex cursor-pointer items-center gap-3 p-3 text-sm ${
                  fareId === f.id ? "bg-accent" : ""
                }`}
              >
                <input
                  type="radio"
                  name="fare"
                  className="h-4 w-4"
                  checked={fareId === f.id}
                  onChange={() => setFareId(f.id)}
                />
                <span className="font-semibold">{f.name}</span>
              </label>
            ))}
          </div>
        </Section>

        <Section step={4} title="Flying from" icon={<Plane className="h-4 w-4" />}>
          <select
            value={fromAirport}
            onChange={(e) => setFromAirport(e.target.value)}
            className="w-full rounded-2xl border-2 border-foreground bg-card px-4 py-3 font-semibold"
          >
            {AIRPORTS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </Section>

        <Section step={5} title="Flying to" icon={<Plane className="h-4 w-4 rotate-90" />}>
          <select
            value={toAirport}
            onChange={(e) => setToAirport(e.target.value)}
            className="w-full rounded-2xl border-2 border-foreground bg-card px-4 py-3 font-semibold"
          >
            {AIRPORTS.filter((a) => a.id !== fromAirport).map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </Section>

        {error && (
          <div className="mt-4 rounded-2xl border-2 border-destructive bg-destructive/10 p-3 text-sm font-semibold text-destructive">
            {error}
          </div>
        )}

        <motion.button
          whileTap={{ scale: 0.97 }}
          disabled={submitting || !bagImage}
          onClick={onSubmit}
          className="btn-chunky mt-8 w-full bg-primary px-6 py-4 text-lg font-bold text-primary-foreground disabled:opacity-60"
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" /> Consulting the gods of the gate…
            </span>
          ) : (
            <>Get the verdict 🫣</>
          )}
        </motion.button>

        <DisclaimerFooter />
      </main>
    </div>
  );
}

function Section({
  step,
  title,
  icon,
  children,
}: {
  step: number;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 flex items-center gap-2 px-1 font-display text-lg font-bold">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-foreground text-xs font-bold text-background">
          {step}
        </span>
        {icon} {title}
      </h2>
      <div className="card-chunky p-4">{children}</div>
    </section>
  );
}

function PhotoPicker({
  value,
  onChange,
  onClear,
  label,
  small,
}: {
  value: string | null;
  onChange: (file: File) => void;
  onClear: () => void;
  label: string;
  small?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  if (value) {
    return (
      <div className={`relative overflow-hidden rounded-2xl border-2 border-foreground ${small ? "h-40" : "h-64"}`}>
        <img src={value} alt="" className="h-full w-full object-cover" />
        <button
          onClick={onClear}
          className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-foreground text-background"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      className={`flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-foreground bg-muted/40 ${
        small ? "h-32" : "h-48"
      } text-center text-sm font-semibold text-muted-foreground hover:bg-muted`}
    >
      <Upload className="h-6 w-6" />
      {label}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onChange(f);
        }}
      />
    </button>
  );
}
