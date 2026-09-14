"use client";

import { useActionState } from "react";
import { Mail, Lock, User, ArrowRight, Loader2, CircleAlert, CircleCheck } from "lucide-react";
import { createCitizenAccount, type CitizenSignupState } from "./actions";

const initialState: CitizenSignupState = {};

export function CitizenSignupForm() {
  const [state, formAction, pending] = useActionState(createCitizenAccount, initialState);

  const inputBase =
    "block w-full h-[54px] bg-white border rounded-xl text-[#202124] pl-12 focus:outline-none focus:ring-4 transition-all";
  const inputNormal = "border-[#DADCE0] focus:border-[#1A73E8] focus:ring-[#1A73E8]/15";

  return (
    <form action={formAction} noValidate className="space-y-5">
      {state.error && (
        <div role="alert" className="animate-in fade-in flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-sm font-medium text-red-600">
          <CircleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          {state.error}
        </div>
      )}
      {state.success && (
        <div role="status" className="animate-in fade-in flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
          <CircleCheck size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          {state.success}
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="cs-name" className="block text-sm font-semibold text-[#202124]">
          Name
        </label>
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-[#5F6368] group-focus-within:text-[#1A73E8] transition-colors">
            <User size={20} aria-hidden="true" />
          </div>
          <input
            id="cs-name"
            name="name"
            type="text"
            autoComplete="name"
            placeholder="Your name"
            className={`${inputBase} ${inputNormal}`}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="cs-email" className="block text-sm font-semibold text-[#202124]">
          Email address
        </label>
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-[#5F6368] group-focus-within:text-[#1A73E8] transition-colors">
            <Mail size={20} aria-hidden="true" />
          </div>
          <input
            id="cs-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="Email address"
            className={`${inputBase} ${inputNormal}`}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="cs-password" className="block text-sm font-semibold text-[#202124]">
          Password
        </label>
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-[#5F6368] group-focus-within:text-[#1A73E8] transition-colors">
            <Lock size={20} aria-hidden="true" />
          </div>
          <input
            id="cs-password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            placeholder="At least 8 characters"
            className={`${inputBase} pr-12 ${inputNormal}`}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="group relative flex w-full h-[54px] items-center justify-center gap-2 rounded-full bg-[#1A73E8] text-white font-semibold shadow-lg shadow-[#1A73E8]/25 hover:bg-[#1068d6] hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
      >
        {pending ? (
          <>
            <Loader2 className="animate-spin" size={20} aria-hidden="true" />
            Creating account...
          </>
        ) : (
          <>
            Create citizen account
            <ArrowRight size={20} className="group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
          </>
        )}
      </button>
    </form>
  );
}
