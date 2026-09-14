"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Lock, ArrowLeft, CheckCircle2, CircleAlert } from "lucide-react";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | undefined>(undefined);
  const [submitted, setSubmitted] = useState(false);

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function validate(): string | undefined {
    const trimmed = email.trim();
    if (!trimmed) return "Email address is required.";
    if (!EMAIL_RE.test(trimmed)) return "Enter a valid email address.";
    return undefined;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(false);
    const error = validate();
    setFieldError(error);
    if (error) return;

    // Placeholder: password reset is not wired to a backend yet.
    // Future integration should call the reset endpoint here and then
    // navigate to a confirmation state.
    setSubmitted(true);
  }

  const inputBase =
    "block w-full h-[54px] bg-white border rounded-xl text-[#202124] pl-12 focus:outline-none focus:ring-4 transition-all";
  const inputNormal = "border-[#DADCE0] focus:border-[#1A73E8] focus:ring-[#1A73E8]/15";
  const inputError = "border-red-300 focus:border-red-400 focus:ring-red-100";

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {submitted && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-medium text-emerald-700"
        >
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            If an account exists for <strong>{email.trim()}</strong>, password reset
            instructions will be on their way shortly.
          </span>
        </div>
      )}

      <div className="space-y-2">
        <label htmlFor="fp-email" className="block text-sm font-semibold text-[#202124]">
          Email address
        </label>
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-[#5F6368] group-focus-within:text-[#1A73E8] transition-colors">
            <Mail size={20} />
          </div>
          <input
            id="fp-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldError) setFieldError(undefined);
            }}
            placeholder="Email address"
            aria-invalid={Boolean(fieldError)}
            aria-describedby={fieldError ? "fp-email-error" : undefined}
            className={`${inputBase} ${fieldError ? inputError : inputNormal}`}
          />
        </div>
        {fieldError && (
          <p id="fp-email-error" role="alert" className="flex items-center gap-1.5 text-sm font-medium text-red-500">
            <CircleAlert size={14} aria-hidden="true" />
            {fieldError}
          </p>
        )}
      </div>

      <button
        type="submit"
        className="flex w-full h-[54px] items-center justify-center gap-2 rounded-full bg-[#1A73E8] text-white font-semibold shadow-lg shadow-[#1A73E8]/25 hover:bg-[#1068d6] hover:shadow-xl hover:shadow-[#1A73E8]/25 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all"
      >
        Send reset instructions
      </button>

      <p className="flex items-center justify-center gap-1.5 text-sm text-[#5F6368]">
        <Lock size={14} className="text-[#1A73E8]" aria-hidden="true" />
        Backed by encrypted session tokens.
      </p>

      <div className="text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#1A73E8] transition-colors hover:text-[#202124]"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to sign in
        </Link>
      </div>
    </form>
  );
}