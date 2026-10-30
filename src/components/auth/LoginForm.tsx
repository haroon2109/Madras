"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";

export function LoginForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

    const [email, setEmail] = useState("admin@madras.local");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [remember, setRemember] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<{ email?: string }>({});
    const [loading, setLoading] = useState(false);

    async function handleQuickLogin(targetEmail: string) {
        setEmail(targetEmail);
        setError(null);
        setLoading(true);

        try {
            const res = await signIn("credentials", {
                email: targetEmail,
                password: "demo",
                redirect: false,
            });

            if (res?.error) {
                setError("Login failed. Please try again.");
            } else {
                router.push(callbackUrl);
                router.refresh();
            }
        } catch {
            setError("An unexpected error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        const trimmed = email.trim();
        if (!trimmed) {
            setFieldErrors({ email: "Please enter an email or username." });
            return;
        }

        setLoading(true);

        try {
            const res = await signIn("credentials", {
                email: trimmed,
                password: password || "demo",
                redirect: false,
            });

            if (res?.error) {
                setError("Login failed. Please check your username and try again.");
            } else {
                router.push(callbackUrl);
                router.refresh();
            }
        } catch {
            setError("An unexpected error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    const inputBase =
        "block w-full h-[54px] bg-white border rounded-xl text-[#202124] pl-12 focus:outline-none focus:ring-4 transition-all";
    const inputNormal = "border-[#DADCE0] focus:border-[#1A73E8] focus:ring-[#1A73E8]/15";
    const inputError = "border-red-300 focus:border-red-400 focus:ring-red-100";

    return (
        <div className="space-y-5">
            {/* 1-Click Quick Access */}
            <div className="rounded-xl border border-[#D2E3FC] bg-[#EEF5FD] p-3.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#1A73E8]">
                    1-Click Staff Access
                </p>
                <div className="mt-2.5 grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        disabled={loading}
                        onClick={() => handleQuickLogin("admin@madras.local")}
                        className="flex items-center justify-center gap-1.5 rounded-lg border border-[#1A73E8]/20 bg-white px-3 py-2 text-xs font-semibold text-[#1A73E8] shadow-sm transition hover:bg-[#1A73E8] hover:text-white disabled:opacity-60"
                    >
                        Login as Admin
                    </button>
                    <button
                        type="button"
                        disabled={loading}
                        onClick={() => handleQuickLogin("analyst@madras.local")}
                        className="flex items-center justify-center gap-1.5 rounded-lg border border-[#1A73E8]/20 bg-white px-3 py-2 text-xs font-semibold text-[#1A73E8] shadow-sm transition hover:bg-[#1A73E8] hover:text-white disabled:opacity-60"
                    >
                        Login as Analyst
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
                {/* Email / Username Field */}
                <div className="space-y-2">
                    <label
                        htmlFor="email"
                        className="block text-sm font-semibold text-[#202124]"
                    >
                        Email or Username
                    </label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-[#5F6368] group-focus-within:text-[#1A73E8] transition-colors">
                            <Mail size={20} />
                        </div>
                        <input
                            id="email"
                            type="text"
                            autoComplete="username"
                            required
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                if (fieldErrors.email) setFieldErrors({});
                            }}
                            placeholder="admin@madras.local or admin"
                            aria-invalid={Boolean(fieldErrors.email)}
                            aria-describedby={fieldErrors.email ? "email-error" : undefined}
                            className={`${inputBase} ${fieldErrors.email ? inputError : inputNormal}`}
                        />
                    </div>
                    {fieldErrors.email && (
                        <p id="email-error" role="alert" className="text-sm font-medium text-red-500">
                            {fieldErrors.email}
                        </p>
                    )}
                </div>

                {/* Password Field (Simple & Non-strict) */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label
                            htmlFor="password"
                            className="block text-sm font-semibold text-[#202124]"
                        >
                            Password
                        </label>
                        <span className="text-xs text-[#5F6368]">(optional)</span>
                    </div>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-[#5F6368] group-focus-within:text-[#1A73E8] transition-colors">
                            <Lock size={20} />
                        </div>
                        <input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter any password"
                            className={`${inputBase} pr-12 ${inputNormal}`}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 flex items-center pr-4 text-[#5F6368] hover:text-[#202124] transition-colors"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                </div>

                {/* Remember Me */}
                <div className="flex items-center justify-between gap-4 pt-1">
                    <label htmlFor="remember" className="flex cursor-pointer select-none items-center gap-2.5">
                        <input
                            id="remember"
                            type="checkbox"
                            checked={remember}
                            onChange={(e) => setRemember(e.target.checked)}
                            className="h-[18px] w-[18px] cursor-pointer rounded border-[#DADCE0] accent-[#1A73E8] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1A73E8]/40"
                        />
                        <span className="text-sm font-medium text-[#4A657F]">Remember me</span>
                    </label>
                </div>

                {/* Error Message */}
                {error && (
                    <div role="alert" className="animate-in fade-in p-3 rounded-xl bg-red-50 text-red-600 text-sm font-medium border border-red-100">
                        {error}
                    </div>
                )}

                {/* Login Button */}
                <button
                    type="submit"
                    disabled={loading}
                    className="group relative flex w-full h-[52px] items-center justify-center gap-2 rounded-full bg-[#1A73E8] text-white font-semibold shadow-lg shadow-[#1A73E8]/25 hover:bg-[#1068d6] hover:shadow-xl hover:shadow-[#1A73E8]/25 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                >
                    {loading ? (
                        <>
                            <Loader2 className="animate-spin" size={20} aria-hidden="true" />
                            Logging in...
                        </>
                    ) : (
                        <>
                            Log In
                            <ArrowRight className="group-hover:translate-x-0.5 transition-transform" size={20} aria-hidden="true" />
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}
