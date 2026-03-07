"use client";

import { useState } from "react";
import { useAuth } from "./AuthProvider";

const PREMIUM_PRICE_INR = 167;
const PREMIUM_PRICE_USD = 2;
const UPI_ID = "yourname@upi";

export default function PremiumModal({ onClose }: { onClose: () => void }) {
    const { upgradeToPremium, user } = useAuth();
    const [step, setStep] = useState<"info" | "pay" | "verify" | "done">("info");
    const [transactionId, setTransactionId] = useState("");

    if (user?.tier === "premium") {
        return (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
                <div className="card p-8 max-w-md w-full text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="text-5xl mb-3">👑</div>
                    <h2 className="text-2xl font-bold shimmer">You&apos;re Premium!</h2>
                    <p className="text-[var(--text-secondary)] mt-2 text-sm">
                        300 analyses per day until {user.premiumExpiry ? new Date(user.premiumExpiry).toLocaleDateString() : "N/A"}
                    </p>
                    <button onClick={onClose} className="btn-primary mt-5 w-full py-3">Close</button>
                </div>
            </div>
        );
    }

    const upiPaymentUrl = `upi://pay?pa=${UPI_ID}&pn=Momento&am=${PREMIUM_PRICE_INR}&cu=INR&tn=Momento+Premium`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiPaymentUrl)}`;

    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="card p-6 max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <button onClick={onClose} className="float-right text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-lg">✕</button>

                {step === "info" && (
                    <div>
                        <div className="text-center mb-5">
                            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--primary-pale)] mb-3">
                                <span className="text-2xl">🚀</span>
                            </div>
                            <h2 className="text-xl font-bold">Upgrade to Premium</h2>
                            <p className="text-sm text-[var(--text-secondary)] mt-1">Unlock 300 analyses per day</p>
                        </div>

                        <div className="card-glow p-5 text-center mb-5">
                            <div className="text-3xl font-bold text-[var(--primary-deeper)]">
                                ₹{PREMIUM_PRICE_INR}<span className="text-base font-normal text-[var(--text-secondary)]">/month</span>
                            </div>
                            <div className="text-xs text-[var(--text-secondary)] mt-1">(${PREMIUM_PRICE_USD} USD)</div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-5">
                            <div className="card p-3.5">
                                <div className="text-xs font-semibold mb-2">🆓 Free</div>
                                <ul className="text-[11px] text-[var(--text-secondary)] space-y-1">
                                    <li>✅ 5 analyses/day</li>
                                    <li>✅ All 5 modes</li>
                                    <li>✅ Obsidian export</li>
                                </ul>
                            </div>
                            <div className="card-glow p-3.5">
                                <div className="text-xs font-semibold mb-2">👑 Premium</div>
                                <ul className="text-[11px] text-[var(--text-secondary)] space-y-1">
                                    <li>✅ <strong className="text-[var(--text-primary)]">300/day</strong></li>
                                    <li>✅ All 5 modes</li>
                                    <li>✅ Priority speed</li>
                                </ul>
                            </div>
                        </div>

                        <button onClick={() => setStep("pay")} className="btn-primary w-full py-3">
                            Pay ₹{PREMIUM_PRICE_INR} with UPI →
                        </button>
                    </div>
                )}

                {step === "pay" && (
                    <div>
                        <div className="text-center mb-4">
                            <h2 className="text-lg font-bold">Scan to Pay</h2>
                            <p className="text-xs text-[var(--text-secondary)] mt-1">Use GPay, PhonePe, or any UPI app</p>
                        </div>
                        <div className="flex justify-center mb-4">
                            <div className="card p-3">
                                <img src={qrUrl} alt="UPI QR Code" width={200} height={200} className="rounded-lg" />
                            </div>
                        </div>
                        <div className="text-center mb-4">
                            <div className="text-2xl font-bold text-[var(--primary-deeper)]">₹{PREMIUM_PRICE_INR}</div>
                            <div className="text-[10px] text-[var(--text-secondary)] mt-1 font-mono">{UPI_ID}</div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setStep("info")} className="flex-1 btn-outline py-2.5 text-sm">← Back</button>
                            <button onClick={() => setStep("verify")} className="flex-1 btn-primary py-2.5 text-sm">I&apos;ve Paid ✓</button>
                        </div>
                    </div>
                )}

                {step === "verify" && (
                    <div>
                        <div className="text-center mb-4">
                            <h2 className="text-lg font-bold">Enter Transaction ID</h2>
                            <p className="text-xs text-[var(--text-secondary)] mt-1">Found in your UPI app&apos;s history</p>
                        </div>
                        <input
                            type="text"
                            value={transactionId}
                            onChange={(e) => setTransactionId(e.target.value)}
                            placeholder="e.g., 432012345678"
                            className="input-field mb-4"
                        />
                        <div className="flex gap-2">
                            <button onClick={() => setStep("pay")} className="flex-1 btn-outline py-2.5 text-sm">← Back</button>
                            <button
                                onClick={() => { if (transactionId.trim().length >= 6) { upgradeToPremium(); setStep("done"); } }}
                                disabled={transactionId.trim().length < 6}
                                className="flex-1 btn-primary py-2.5 text-sm"
                            >
                                Activate ✅
                            </button>
                        </div>
                    </div>
                )}

                {step === "done" && (
                    <div className="text-center py-4">
                        <div className="text-5xl mb-3">🎉</div>
                        <h2 className="text-xl font-bold shimmer">You&apos;re Premium!</h2>
                        <p className="text-sm text-[var(--text-secondary)] mt-2">
                            <strong className="text-[var(--text-primary)]">300 analyses/day</strong> for 30 days
                        </p>
                        <button onClick={onClose} className="btn-primary mt-5 w-full py-3">Start Analyzing 🚀</button>
                    </div>
                )}
            </div>
        </div>
    );
}
