"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { CircleAlert } from "lucide-react";

/**
 * Google sign-in button.
 *
 * Triggers NextAuth's built-in Google provider. When OAuth credentials are not
 * configured (no GOOGLE_CLIENT_ID/SECRET), the provider is not registered and
 * signIn() resolves with an error — shown inline instead of failing silently.
 */
export function GoogleButton() {
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    try {
      const res = await signIn("google", { redirect: false });
      // next-auth v5 resolves with an `error` payload when the provider is
      // missing or the OAuth handshake fails.
      if (res && "error" in res && res.error) {
        setError("Google sign-in is not available yet. Use your email and password.");
      }
    } catch {
      setError("Google sign-in is not available yet. Use your email and password.");
    }
  }

  return (
    <div>
      {error && (
        <div
          role="alert"
          className="animate-in fade-in mb-3 flex items-start gap-2 rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm font-medium text-amber-700"
        >
          <CircleAlert size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
          {error}
        </div>
      )}
      <button
        onClick={handleClick}
        type="button"
        className="flex w-full items-center justify-center gap-3 rounded-full border border-[#DADCE0] bg-white py-3.5 text-sm font-semibold text-[#202124] shadow-sm transition-all hover:bg-[#F8F9FA] hover:shadow-md active:scale-[0.98]"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
        </svg>
        Continue with Google
      </button>
    </div>
  );
}
