"use client";

import { useActionState, useState } from "react";
import { createZone, FormState } from "@/app/(app)/admin/actions";

const initialState: FormState = {};

export default function ZoneForm() {
  const [state, formAction, pending] = useActionState(createZone, initialState);
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 shadow-sm">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-sm font-semibold text-sky-700 hover:text-sky-800"
      >
        {open ? "− Collapse" : "+ Add a zone"}
      </button>
      {open && (
        <form action={formAction} className="mt-3 grid gap-3 sm:grid-cols-3">
          <Field label="Zone number">
            <input name="number" type="number" min={1} required placeholder="16" className={inputCls} />
          </Field>
          <Field label="Name">
            <input name="name" required placeholder="New Zone" className={inputCls} />
          </Field>
          <Field label="Latitude">
            <input name="latitude" type="number" step="any" placeholder="13.08" className={inputCls} />
          </Field>
          <Field label="Longitude">
            <input name="longitude" type="number" step="any" placeholder="80.27" className={inputCls} />
          </Field>
          <Field label="Watch ≥ (mm)">
            <input name="watchThreshold" type="number" step="any" defaultValue={15} className={inputCls} />
          </Field>
          <Field label="Warning ≥ (mm)">
            <input name="warningThreshold" type="number" step="any" defaultValue={30} className={inputCls} />
          </Field>
          <Field label="Alert ≥ (mm)">
            <input name="alertThreshold" type="number" step="any" defaultValue={60} className={inputCls} />
          </Field>
          <div className="sm:col-span-3 flex items-center gap-3">
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
            >
              {pending ? "Creating…" : "Create zone"}
            </button>
            {state.error && <span className="text-sm text-red-600">{state.error}</span>}
            {state.success && <span className="text-sm text-emerald-600">{state.success}</span>}
          </div>
        </form>
      )}
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      {children}
    </label>
  );
}