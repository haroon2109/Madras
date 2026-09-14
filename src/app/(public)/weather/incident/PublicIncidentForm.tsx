"use client";

import { useActionState, useState } from "react";
import { CloudRain, MapPin, FileQuestion, User, Droplets, ArrowRight, Loader2, CircleAlert, CircleCheck } from "lucide-react";

interface ZoneOption {
  number: number;
  name: string;
}

interface PublicIncidentFormProps {
  zones: ZoneOption[];
  createAction: (formData: FormData) => Promise<{ ok: boolean; error?: string }>;
  signedIn: boolean;
}

export default function PublicIncidentForm({ zones, createAction, signedIn }: PublicIncidentFormProps) {
  const [state, formAction, pending] = useActionState<{ ok?: boolean; error?: string; success?: boolean }, FormData>(
    async (_prev, formData) => createAction(formData),
    { ok: false, error: undefined, success: false }
  );

  const [open, setOpen] = useState(false);

  const inputBase =
    "block w-full h-11 bg-white border rounded-xl text-slate-900 px-3 focus:outline-none focus:ring-4 transition-all";
  const inputNormal = "border-slate-200 focus:border-sky-500 focus:ring-sky-100";
  const inputError = "border-red-300 focus:border-red-400 focus:ring-red-100";

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <div className="animate-in fade-in flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-medium text-red-600">
          <CircleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          {state.error}
        </div>
      )}
      {state.success && (
        <div className="animate-in fade-in flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
          <CircleCheck size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          Report filed. The operations team will review it.
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <Droplets size={15} className="text-sky-600" />
          <span>What do you see?</span>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Pick the zone where the waterlogging is happening. If you know the approximate depth, add it — it helps the team prioritize.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="zoneNumber" className="text-sm font-semibold text-slate-700">
            Zone *
          </label>
          <select
            id="zoneNumber"
            name="zoneNumber"
            required
            className={`${inputBase} ${inputNormal}`}
          >
            <option value="">Select a zone</option>
            {zones.map((z) => (
              <option key={z.number} value={z.number}>
                Zone {z.number} — {z.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="depthCm" className="text-sm font-semibold text-slate-700">
            Water depth (cm, optional)
          </label>
          <div className="relative">
            <input
              id="depthCm"
              name="depthCm"
              type="number"
              min="0"
              max="500"
              className={`${inputBase} pr-12 ${inputNormal}`}
              placeholder="Ankle-deep is about 10–15 cm"
            />
            <span className="absolute inset-y-0 right-3 flex items-center text-xs text-slate-400">cm</span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="reporterName" className="text-sm font-semibold text-slate-700">
          Your name (optional)
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
            <User size={16} />
          </div>
          <input
            id="reporterName"
            name="reporterName"
            type="text"
            maxLength={120}
            className={`${inputBase} pl-10 ${inputNormal}`}
            placeholder="Your name, so the team can follow up"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="description" className="text-sm font-semibold text-slate-700">
          What is happening? *
        </label>
        <textarea
          id="description"
          name="description"
          required
          rows={4}
          maxLength={500}
          className={`${inputBase} ${inputNormal} resize-y`}
          placeholder="Street, landmark, how deep the water is, and anything else that helps locate it."
        />
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <FileQuestion size={12} />
            Be specific about location and depth.
          </span>
          <span>{state.success ? "" : `${500 - (state.error ? 0 : 0)} characters left`}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-sky-700 disabled:opacity-60"
        >
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <ArrowRight size={16} />
              File report
            </>
          )}
        </button>
        <span className="text-xs text-slate-500">
          This creates an open report for the operations team.
        </span>
      </div>

      {/* Quick open/close toggle for the form */}
      {!open && signedIn && (
        <details className="rounded-xl border border-slate-200 bg-slate-50">
          <summary className="cursor-pointer select-none rounded-xl px-4 py-3 text-sm font-semibold text-slate-700">
            Signed-in extras
          </summary>
          <div className="px-4 pb-3 text-sm text-slate-500">
            You are signed in as a citizen account. Your name and email will be attached to future reports.
          </div>
        </details>
      )}
    </form>
  );
}
