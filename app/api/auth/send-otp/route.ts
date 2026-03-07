import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import crypto from "crypto";

const OTP_SECRET = process.env.OTP_SECRET || "visiontask-otp-secret-key-2024";

function generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function createOTPHash(email: string, otp: string, timestamp: number): string {
    return crypto
        .createHmac("sha256", OTP_SECRET)
        .update(`${email}:${otp}:${timestamp}`)
        .digest("hex");
}

export async function POST(req: Request) {
    try {
        const { email } = await req.json();

        if (!email || !/\S+@\S+\.\S+/.test(email)) {
            return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
        }

        const otp = generateOTP();
        const timestamp = Date.now();
        const hash = createOTPHash(email, otp, timestamp);

        const gmailUser = process.env.GMAIL_EMAIL;
        const gmailPass = process.env.GMAIL_APP_PASSWORD;

        // Require Gmail configuration strictly
        if (!gmailUser || !gmailPass || gmailUser === "your_gmail@gmail.com") {
            return NextResponse.json({ error: "Email SMTP configuration is missing. Please set GMAIL_EMAIL and GMAIL_APP_PASSWORD." }, { status: 500 });
        }

        try {
            const transporter = nodemailer.createTransport({
                service: "gmail",
                auth: {
                    user: gmailUser,
                    pass: gmailPass,
                },
            });

            const mailOptions = {
                from: `"Momento" <${gmailUser}>`,
                to: email,
                subject: `${otp} — Your Momento verification code`,
                html: `
                    <div style="font-family: -apple-system, sans-serif; max-width: 400px; margin: 0 auto; padding: 32px;">
                        <div style="text-align: center; margin-bottom: 24px;">
                            <h1 style="color: #7478C5; font-size: 24px; margin: 0;">Momento</h1>
                            <p style="color: #6B6B8A; font-size: 14px; margin-top: 4px;">Verification Code</p>
                        </div>
                        <div style="background: #EEEEFF; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                            <p style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #1A1A2E; margin: 0;">${otp}</p>
                        </div>
                        <p style="color: #6B6B8A; font-size: 13px; text-align: center;">
                            This code expires in 5 minutes.<br/>If you didn't request this, ignore this email.
                        </p>
                    </div>
                `,
            };

            await transporter.sendMail(mailOptions);
            console.log("Email sent successfully via Gmail!");

            return NextResponse.json({
                success: true,
                hash,
                timestamp,
                message: "OTP sent to your email!",
            });
        } catch (emailError: any) {
            console.error("Nodemailer error:", emailError);
            return NextResponse.json({ error: `Gmail delivery failed: ${emailError.message}` }, { status: 500 });
        }
    } catch (error) {
        console.error("Send OTP error:", error);
        return NextResponse.json({ error: "Failed to send OTP. Please try again." }, { status: 500 });
    }
}
