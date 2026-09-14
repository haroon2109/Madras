"use client";

import { useActionState } from "react";
import { Bell, MapPin, ArrowRight, Loader2, CircleAlert, CircleCheck, BellOff } from "lucide-react";

interface ZoneOption {
  number: number;
  name: string;
  subscribed: boolean;
}

interface PublicSubscribeFormProps {
  zones: ZoneOption[];
  /** useActionState-style server action: (prevState, formData) => newState. */
  subscribeAction: (
    prev: { error?: string; success?: string },
    formData: FormData
  ) => Promise<{ error?: string; success?: string }>;
  signedIn: boolean;
}

export default function PublicSubscribeForm({ zones, subscribeAction, signedIn }: PublicSubscribeFormProps) {
  const [state, formAction, pending] = useActionState(subscribeAction, {
    error: undefined,
    success: undefined,
  });

  const inputBase =
    "block h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus:ring-4 transition-all";
  const inputNormal = "focus:border-[#1A73E8] focus:ring-[#1A73E8]/15";

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
          {state.success}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <MapPin size={15} className="text-sky-600" />
          <span>Which zone do you follow?</span>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Pick the zone you want to receive alert updates for.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {zones.slice(0, 9).map((z) => (
          <label
            key={z.number}
            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${z.subscribed ? "border-sky-200 bg-sky-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}
          >
            <input
              type="radio"
              name="zoneId"
              value={`zone-${z.number}`}
              required
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#1A73E8] focus:ring-[#1A73E8]"
            />
            <div className="min-w-0">
              <span className="text-sm font-bold text-slate-900">Zone {z.number}</span>
              <span className="text-xs text-slate-500 block">{z.name}</span>
            </div>
            {z.subscribed && (
              <span className="ml-auto shrink-0 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700">Following</span>
            )}
          </label>
        ))}
      </div>
      <p className="text-xs text-slate-400">
        If your zone is not listed, sign in and use the full picker on the weather page.
      </p>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-full bg-[#1A73E8] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#1765CC] disabled:opacity-60"
        >
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Bell size={15} />
              Subscribe
            </>
          )}
        </button>
        <span className="text-xs text-slate-500">
          You can unsubscribe later from your subscriptions page.
        </span>
      </div>
    </form>
  );
}
