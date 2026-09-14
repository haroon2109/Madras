"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Camera, LocateFixed, MapPin } from "lucide-react";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-2xl bg-[#1A73E8] px-5 py-4 text-base font-bold text-white shadow-sm transition-all hover:bg-[#1765CC] active:scale-[0.98] disabled:opacity-60"
    >
      {pending ? "Filing…" : "File incident"}
    </button>
  );
}

export default function IncidentReportForm({
  zones,
  createAction,
}: {
  zones: { id: string; number: number; name: string }[];
  createAction: (formData: FormData) => Promise<void>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<"idle" | "locating" | "done" | "error">("idle");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  function locate() {
    if (!("geolocation" in navigator)) {
      setGpsStatus("error");
      return;
    }
    setGpsStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsStatus("done");
      },
      () => setGpsStatus("error"),
      { enableHighAccuracy: true, timeout: 10_000 }
    );
  }

  function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  }

  return (
    <form
      ref={formRef}
      action={async (formData: FormData) => {
        if (gps) {
          formData.set("latitude", String(gps.lat));
          formData.set("longitude", String(gps.lng));
        }
        await createAction(formData);
        setGps(null);
        setPhotoPreview(null);
        formRef.current?.reset();
      }}
      className="rounded-2xl border border-[#DADCE0] bg-white p-5 shadow-[0_1px_2px_rgba(16,42,86,0.04)]"
    >
      <h2 className="text-sm font-extrabold uppercase tracking-wide text-[#5F6368]">Report waterlogging</h2>

      <div className="mt-3 space-y-4">
        <label className="block">
          <span className="text-xs font-semibold text-[#5F6368]">Zone</span>
          <select name="zoneId" required className="mt-1 block h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-800">
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                Zone {z.number} — {z.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-[#5F6368]">Water depth (cm)</span>
          <input
            name="depthCm"
            type="number"
            inputMode="numeric"
            min={0}
            max={300}
            defaultValue={15}
            className="mt-1 block h-12 w-full rounded-xl border border-slate-300 px-3 text-base text-slate-800"
          />
        </label>

        <div>
          <span className="text-xs font-semibold text-[#5F6368]">GPS location</span>
          <div className="mt-1 flex items-center gap-2">
            <button
              type="button"
              onClick={locate}
              className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-[#F8F9FA] px-3 text-sm font-bold text-[#1A73E8] active:scale-[0.98]"
            >
              <LocateFixed size={18} aria-hidden="true" />
              {gpsStatus === "locating" ? "Locating…" : gps ? "Update location" : "Use my location"}
            </button>
          </div>
          {gps ? (
            <p className="mt-1 flex items-center gap-1 text-xs text-emerald-700">
              <MapPin size={13} aria-hidden="true" />
              {gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}
            </p>
          ) : gpsStatus === "error" ? (
            <p className="mt-1 text-xs text-red-600">Could not get location. Check permissions.</p>
          ) : (
            <p className="mt-1 text-xs text-[#80868B]">Fills zone centre if skipped.</p>
          )}
        </div>

        <label className="block">
          <span className="text-xs font-semibold text-[#5F6368]">Photo (optional)</span>
          <div className="mt-1 flex items-center gap-3">
            <span className="inline-flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-[#F8F9FA] px-3 text-sm font-bold text-[#1A73E8] active:scale-[0.98]">
              <Camera size={18} aria-hidden="true" />
              {photoPreview ? "Change photo" : "Add photo"}
              <input type="file" accept="image/*" capture="environment" onChange={onPhoto} className="hidden" />
            </span>
            {photoPreview && <img src={photoPreview} alt="Preview" className="h-12 w-12 rounded-lg object-cover" />}
          </div>
          <input type="hidden" name="photoDataUrl" value={photoPreview ?? ""} />
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-[#5F6368]">Source</span>
          <select name="source" className="mt-1 block h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-800">
            <option value="field">Field team</option>
            <option value="citizen">Citizen</option>
          </select>
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-[#5F6368]">Reporter (optional)</span>
          <input
            name="reporterName"
            maxLength={120}
            placeholder="Name / team"
            className="mt-1 block h-12 w-full rounded-xl border border-slate-300 px-3 text-base text-slate-800"
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-[#5F6368]">Location detail</span>
          <input
            name="description"
            maxLength={500}
            placeholder="Street / landmark…"
            className="mt-1 block h-12 w-full rounded-xl border border-slate-300 px-3 text-base text-slate-800"
          />
        </label>
      </div>

      <div className="mt-5">
        <SubmitButton />
        <Link href="/dashboard" className="mt-3 block text-center text-sm font-bold text-[#1A73E8] hover:underline">
          View on map →
        </Link>
      </div>
    </form>
  );
}
