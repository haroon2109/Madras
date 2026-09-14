"use client";

import { useActionState, useState } from "react";
import { createUser, FormState } from "@/app/(app)/admin/actions";

const initialState: FormState = {};

export default function UserForm() {
  const [state, formAction, pending] = useActionState(createUser, initialState);
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 shadow-sm">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-sm font-semibold text-sky-700 hover:text-sky-800"
      >
        {open ? "− Collapse" : "+ Add a user"}
      </button>
      {open && (
        <form action={formAction} className="mt-3 grid gap-3 sm:grid-cols-4">
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-medium text-slate-500">Name (optional)</span>
            <input name="name" placeholder="Jane Engineer" className={inputCls} />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-medium text-slate-500">Email</span>
            <input name="email" type="email" required placeholder="jane@madras.local" className={inputCls} />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-medium text-slate-500">Password (min 8 chars)</span>
            <input name="password" type="password" required minLength={8} className={inputCls} />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs font-medium text-slate-500">Role</span>
            <select name="role" defaultValue="VIEWER" className={inputCls}>
              <option value="VIEWER">Viewer</option>
              <option value="ANALYST">Analyst</option>
              <option value="ADMIN">Admin</option>
            </select>
          </label>
          <div className="sm:col-span-4 flex items-center gap-3">
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
            >
              {pending ? "Creating…" : "Create user"}
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