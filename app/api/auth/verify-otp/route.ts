import { NextResponse } from "next/server";
import crypto from "crypto";

const OTP_SECRET = process.env.OTP_SECRET || "visiontask-otp-secret-key-2024";
const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

function createOTPHash(email: string, otp: string, timestamp: number): string {
    return crypto
        .createHmac("sha256", OTP_SECRET)
        .update(`${email}:${otp}:${timestamp}`)
        .digest("hex");
}

export async function POST(req: Request) {
    try {
        const { email, otp, hash, timestamp } = await req.json();

        if (!email || !otp || !hash || !timestamp) {
            return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
        }

        // Check if OTP has expired
        if (Date.now() - timestamp > OTP_EXPIRY_MS) {
            return NextResponse.json({ error: "OTP has expired. Please request a new one." }, { status: 400 });
        }

        // Verify hash
        const expectedHash = createOTPHash(email, otp, timestamp);

        if (hash !== expectedHash) {
            return NextResponse.json({ error: "Invalid OTP. Please check and try again." }, { status: 400 });
        }

        return NextResponse.json({
            success: true,
            verified: true,
            email,
            message: "Email verified successfully!",
        });
    } catch (error) {
        console.error("Verify OTP error:", error);
        return NextResponse.json({ error: "Verification failed. Please try again." }, { status: 500 });
    }
}
