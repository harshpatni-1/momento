import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./components/AuthProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Momento — Screenshot to Task List",
  description:
    "Upload any screenshot and get an instant, actionable task list. Powered by a 2-agent AI system with vision and planning capabilities.",
  keywords: [
    "AI assistant",
    "screenshot to task",
    "task list",
    "recipe helper",
    "terminal error debugger",
    "course builder",
  ],
  openGraph: {
    title: "Momento — Screenshot to Task List",
    description:
      "Upload any screenshot and get an instant, actionable task list.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light" style={{ colorScheme: "light" }}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
