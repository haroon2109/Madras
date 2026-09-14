import { AuthSplitLayout } from "@/components/auth/AuthSplitLayout";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata = {
  title: "Reset password — Madras",
  description: "Reset your Madras account password.",
};

export default function ForgotPasswordPage() {
  return (
    <AuthSplitLayout>
      <div className="mb-8">
        <h3 className="text-2xl font-bold text-[#202124]">Reset your password</h3>
        <p className="mt-2 leading-relaxed text-[#5F6368]">
          Enter the email linked to your account and we&apos;ll send reset
          instructions.
        </p>
      </div>

      <ForgotPasswordForm />
    </AuthSplitLayout>
  );
}
