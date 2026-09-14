import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { SignupForm } from "@/components/auth/SignupForm";

export const metadata = {
  title: "Request staff access — Madras",
  description:
    "Request an Admin or Analyst account on the Madras operations platform. Public weather needs no account.",
};

export default function SignupPage() {
  return (
    <AuthSplitLayout>
      <div className="mb-8">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E8F0FE] px-3 py-1 text-xs font-semibold text-[#1A73E8]">
          <ShieldCheck size={12} aria-hidden="true" />
          Staff access request
        </span>
        <h3 className="mt-4 text-2xl font-bold text-[#202124]">Request staff access</h3>
        <p className="mt-2 leading-relaxed text-[#5F6368]">
          For operations staff who need the dashboard. New accounts start with view-only access —
          an administrator reviews and grants Admin/Analyst roles afterwards. Checking the public
          weather needs no account.
        </p>
      </div>

      <SignupForm />

      <div className="mt-8 text-center">
        <p className="text-[#5F6368]">
          Already have an account?{" "}
          <Link href="/login" className="font-bold text-[#1A73E8] transition-colors hover:text-[#202124]">
            Sign in
          </Link>
        </p>
      </div>
    </AuthSplitLayout>
  );
}
