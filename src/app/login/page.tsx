import { Suspense } from "react";
import Link from "next/link";
import { CloudRain, Lock, ShieldCheck } from "lucide-react";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { LoginForm } from "@/components/auth/LoginForm";
import { AuthDivider } from "@/components/auth/AuthDivider";
import { GoogleButton } from "@/components/auth/GoogleButton";

export const metadata = {
  title: "Staff sign in — Madras",
  description:
    "Sign in for Admin and Analyst access to the Madras operations dashboard. Public users can check their zone without an account.",
};

export default function LoginPage() {
  return (
    <AuthSplitLayout>
      <div className="mb-6">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F0FE] px-3 py-1 text-xs font-semibold text-[#1A73E8]">
          <Lock size={12} aria-hidden="true" />
          Admin &amp; Analyst access
        </span>
        <h3 className="mt-4 text-2xl font-bold text-[#202124]">Staff sign in</h3>
        <p className="mt-2 leading-relaxed text-[#5F6368]">
          This area is for Greater Chennai operations staff — admins and analysts who manage
          incidents, reports, and decision support. Sign in to continue to the dashboard.
        </p>
      </div>

      <div className="mb-6 rounded-xl border border-[#DADCE0] bg-[#F8F9FA] p-4">
        <div className="flex items-start gap-3">
          <CloudRain size={18} className="mt-0.5 shrink-0 text-[#1A73E8]" aria-hidden="true" />
          <div className="text-sm">
            <p className="font-semibold text-[#202124]">
              Looking for the weather? No account needed.
            </p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-[#5F6368]">
              Public users can check rainfall, flood risk, and tide for their zone — free, with
              no sign-up.{" "}
              <Link
                href="/weather"
                className="font-semibold text-[#1A73E8] transition-colors hover:text-[#1765CC]"
              >
                Open public weather →
              </Link>
            </p>
          </div>
        </div>
      </div>

      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>

      <AuthDivider />

      <GoogleButton />

      <div className="mt-8 flex items-start justify-center gap-1.5 text-center text-[13px] text-[#80868B]">
        <ShieldCheck size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
        <p>
          Accounts are provisioned by the Madras operations team.{" "}
          <Link href="/signup" className="font-semibold text-[#1A73E8] transition-colors hover:text-[#1765CC]">
            Request access
          </Link>
        </p>
      </div>
    </AuthSplitLayout>
  );
}
