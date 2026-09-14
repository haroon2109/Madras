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

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [remember, setRemember] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
    const [loading, setLoading] = useState(false);

    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    function validate(): { email?: string; password?: string } {
        const errors: { email?: string; password?: string } = {};
        const trimmed = email.trim();

        if (!trimmed) {
            errors.email = "Email address is required.";
        } else if (!EMAIL_RE.test(trimmed)) {
            errors.email = "Enter a valid email address.";
        }

        if (!password) {
            errors.password = "Password is required.";
        } else if (password.length < 8) {
            errors.password = "Password must be at least 8 characters.";
        }

        return errors;
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);

        const errors = validate();
        setFieldErrors(errors);
        if (Object.keys(errors).length > 0) return;

        setLoading(true);

        try {
            const res = await signIn("credentials", {
                email: email.trim(),
                password,
                redirect: false,
            });

            if (res?.error) {
                setError("Invalid email or password. Please try again.");
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
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Email Field */}
            <div className="space-y-2">
                <label
                    htmlFor="email"
                    className="block text-sm font-semibold text-[#202124]"
                >
                    Email address
                </label>
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-[#5F6368] group-focus-within:text-[#1A73E8] transition-colors">
                        <Mail size={20} />
                    </div>
                    <input
                        id="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => {
                            setEmail(e.target.value);
                            if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: undefined });
                        }}
                        placeholder="Email address"
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

            {/* Password Field */}
            <div className="space-y-2">
                <label
                    htmlFor="password"
                    className="block text-sm font-semibold text-[#202124]"
                >
                    Password
                </label>
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-[#5F6368] group-focus-within:text-[#1A73E8] transition-colors">
                        <Lock size={20} />
                    </div>
                    <input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => {
                            setPassword(e.target.value);
                            if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: undefined });
                        }}
                        placeholder="Password"
                        aria-invalid={Boolean(fieldErrors.password)}
                        aria-describedby={fieldErrors.password ? "password-error" : undefined}
                        className={`${inputBase} pr-12 ${fieldErrors.password ? inputError : inputNormal}`}
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
                {fieldErrors.password && (
                    <p id="password-error" role="alert" className="text-sm font-medium text-red-500">
                        {fieldErrors.password}
                    </p>
                )}
            </div>
{/* Remember Me / Forgot Password */}
            <div className="flex items-center justify-between gap-4">
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
                <Link
                    href="/forgot-password"
                    className="text-sm font-semibold text-[#1A73E8] transition-colors hover:text-[#202124]"
                >
                    Forgot password?
                </Link>
            </div>

            {/* Error Message */}
            {error && (
                <div role="alert" className="animate-in fade-in p-3 rounded-xl bg-red-50 text-red-600 text-sm font-medium border border-red-100">
                    {error}
                </div>
            )}

            {/* Sign In Button */}
            <button
                type="submit"
                disabled={loading}
                className="group relative flex w-full h-[54px] items-center justify-center gap-2 rounded-full bg-[#1A73E8] text-white font-semibold shadow-lg shadow-[#1A73E8]/25 hover:bg-[#1068d6] hover:shadow-xl hover:shadow-[#1A73E8]/25 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
                {loading ? (
                    <>
                        <Loader2 className="animate-spin" size={20} aria-hidden="true" />
                        Signing in...
                    </>
                ) : (
                    <>
                        Sign In
                        <ArrowRight className="group-hover:translate-x-0.5 transition-transform" size={20} aria-hidden="true" />
                    </>
                )}
            </button>
        </form>
    );
}
