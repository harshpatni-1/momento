"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "../components/AuthProvider";
import { useRouter } from "next/navigation";

type Step = "email" | "otp" | "name";

export default function LoginPage() {
    const { loginWithOTP, isAuthenticated } = useAuth();
    const router = useRouter();
    const [step, setStep] = useState<Step>("email");
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [otp, setOtp] = useState(["", "", "", "", "", ""]);
    const [hash, setHash] = useState("");
    const [timestamp, setTimestamp] = useState(0);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        if (isAuthenticated) {
            router.push("/");
        }
    }, [isAuthenticated, router]);

    if (isAuthenticated) {
        return null;
    }

    const handleSendOTP = async () => {
        setError("");
        if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
            setError("Please enter a valid email address.");
            return;
        }
        setLoading(true);
        try {
            const res = await fetch("/api/auth/send-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Failed to send OTP.");
                setLoading(false);
                return;
            }
            setHash(data.hash);
            setTimestamp(data.timestamp);
            setStep("otp");
        } catch {
            setError("Network error. Please try again.");
        }
        setLoading(false);
    };

    const handleOTPChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value.slice(-1);
        setOtp(newOtp);
        if (value && index < 5) {
            otpRefs.current[index + 1]?.focus();
        }
    };

    const handleOTPKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            otpRefs.current[index - 1]?.focus();
        }
    };

    const handleVerifyOTP = async () => {
        setError("");
        const otpStr = otp.join("");
        if (otpStr.length !== 6) {
            setError("Please enter the full 6-digit code.");
            return;
        }
        setLoading(true);
        try {
            const res = await fetch("/api/auth/verify-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, otp: otpStr, hash, timestamp }),
            });
            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Verification failed.");
                setLoading(false);
                return;
            }
            setStep("name");
        } catch {
            setError("Network error. Please try again.");
        }
        setLoading(false);
    };

    const handleComplete = () => {
        if (!name.trim()) {
            setError("Please enter your name.");
            return;
        }
        loginWithOTP(email, name);
        router.push("/");
    };

    return (
        <div className="hero-gradient min-h-screen flex items-center justify-center px-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <img src="/momento-logo.png" alt="Momento" className="w-16 h-16 mx-auto mb-4 rounded-2xl" />
                    <h1 className="text-3xl font-bold shimmer">Momento</h1>
                    <p className="text-[var(--text-secondary)] mt-1.5 text-sm">
                        Screenshot → Actionable Task List
                    </p>
                </div>

                {/* Card */}
                <div className="card p-7">
                    {step === "email" && (
                        <>
                            <h2 className="text-xl font-bold mb-1">Get started</h2>
                            <p className="text-sm text-[var(--text-secondary)] mb-5">
                                Enter your email to receive a verification code
                            </p>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block uppercase tracking-wide">
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleSendOTP()}
                                        placeholder="you@example.com"
                                        className="input-field"
                                        autoFocus
                                    />
                                </div>
                                {error && (
                                    <div className="text-sm text-[var(--error)] bg-red-50 rounded-lg px-3 py-2 border border-red-200">
                                        ⚠️ {error}
                                    </div>
                                )}
                                <button onClick={handleSendOTP} disabled={loading} className="btn-primary w-full py-3">
                                    {loading ? "Sending code..." : "Send verification code →"}
                                </button>
                            </div>
                        </>
                    )}

                    {step === "otp" && (
                        <>
                            <h2 className="text-xl font-bold mb-1">Check your email</h2>
                            <p className="text-sm text-[var(--text-secondary)] mb-5">
                                We sent a 6-digit code to <strong className="text-[var(--text-primary)]">{email}</strong>
                            </p>
                            <div className="flex gap-2 justify-center mb-5">
                                {otp.map((digit, i) => (
                                    <input
                                        key={i}
                                        ref={(el) => { otpRefs.current[i] = el; }}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={1}
                                        value={digit}
                                        onChange={(e) => handleOTPChange(i, e.target.value)}
                                        onKeyDown={(e) => handleOTPKeyDown(i, e)}
                                        className="otp-input"
                                        autoFocus={i === 0}
                                    />
                                ))}
                            </div>
                            {error && (
                                <div className="text-sm text-[var(--error)] bg-red-50 rounded-lg px-3 py-2 border border-red-200 mb-4">
                                    ⚠️ {error}
                                </div>
                            )}
                            <button onClick={handleVerifyOTP} disabled={loading} className="btn-primary w-full py-3 mb-3">
                                {loading ? "Verifying..." : "Verify code"}
                            </button>
                            <button
                                onClick={() => { setStep("email"); setOtp(["", "", "", "", "", ""]); setError(""); }}
                                className="btn-outline w-full py-2.5"
                            >
                                ← Use a different email
                            </button>
                        </>
                    )}

                    {step === "name" && (
                        <>
                            <div className="text-center mb-4">
                                <div className="text-4xl mb-2">✅</div>
                                <h2 className="text-xl font-bold">Email verified!</h2>
                                <p className="text-sm text-[var(--text-secondary)] mt-1">
                                    One last step — what should we call you?
                                </p>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block uppercase tracking-wide">
                                        Your Name
                                    </label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleComplete()}
                                        placeholder="Your name"
                                        className="input-field"
                                        autoFocus
                                    />
                                </div>
                                {error && (
                                    <div className="text-sm text-[var(--error)] bg-red-50 rounded-lg px-3 py-2 border border-red-200">
                                        ⚠️ {error}
                                    </div>
                                )}
                                <button onClick={handleComplete} className="btn-primary w-full py-3">
                                    Start using Momento 🚀
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* Benefits */}
                <div className="mt-6 grid grid-cols-3 gap-3 text-center">
                    {[
                        { emoji: "🆓", label: "5 free/day" },
                        { emoji: "⚡", label: "2 AI agents" },
                        { emoji: "💾", label: "Obsidian sync" },
                    ].map((b) => (
                        <div key={b.label} className="text-xs text-[var(--text-secondary)]">
                            <div className="text-base mb-0.5">{b.emoji}</div>
                            {b.label}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
