import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { CitizenSignupForm } from "./CitizenSignupForm";

export const metadata = {
  title: "Create a citizen account — Madras",
  description: "Sign up for a free Madras citizen account to follow zones and receive alert updates. Public weather needs no account.",
};

export default function CitizenSignupPage() {
  return (
    <AuthSplitLayout>
      <div className="mb-8">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F0FE] px-3 py-1 text-xs font-semibold text-[#1A73E8]">
          <ShieldCheck size={12} aria-hidden="true" />
          Citizen account
        </span>
        <h3 className="mt-4 text-2xl font-bold text-[#202124]">Follow Chennai zones</h3>
        <p className="mt-2 leading-relaxed text-[#5F6368]">
          Create a free citizen account to subscribe to rainfall and flood-alert updates for the
          zones you care about. Checking the public weather needs no account.
        </p>
      </div>

      <CitizenSignupForm />

      <div className="mt-8 text-center">
        <p className="text-[#5F6368]">
          Already have a staff account?{" "}
          <Link href="/login" className="font-bold text-[#1A73E8] transition-colors hover:text-[#202124]">
            Sign in
          </Link>
        </p>
      </div>
    </AuthSplitLayout>
  );
}
