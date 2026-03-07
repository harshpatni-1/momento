"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type UserTier = "free" | "premium";

export type User = {
    email: string;
    name: string;
    tier: UserTier;
    premiumExpiry?: string;
    emailVerified: boolean;
};

type AuthContextType = {
    user: User | null;
    loginWithOTP: (email: string, name: string) => void;
    logout: () => void;
    upgradeToPremium: () => void;
    isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const saved = localStorage.getItem("visiontask_current_user");
        if (saved) {
            const parsed = JSON.parse(saved) as User;
            // Check premium expiry
            if (parsed.tier === "premium" && parsed.premiumExpiry) {
                if (new Date(parsed.premiumExpiry) < new Date()) {
                    parsed.tier = "free";
                    delete parsed.premiumExpiry;
                }
            }
            setUser(parsed);
            localStorage.setItem("visiontask_current_user", JSON.stringify(parsed));
        }
    }, []);

    const loginWithOTP = (email: string, name: string) => {
        const newUser: User = { email, name, tier: "free", emailVerified: true };
        // Check if returning user, preserve their tier
        const users = JSON.parse(localStorage.getItem("visiontask_users") || "{}");
        if (users[email]) {
            newUser.tier = users[email].tier || "free";
            newUser.premiumExpiry = users[email].premiumExpiry;
            newUser.name = name || users[email].name;
        }
        users[email] = { name: newUser.name, tier: newUser.tier, premiumExpiry: newUser.premiumExpiry };
        localStorage.setItem("visiontask_users", JSON.stringify(users));
        setUser(newUser);
        localStorage.setItem("visiontask_current_user", JSON.stringify(newUser));
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem("visiontask_current_user");
    };

    const upgradeToPremium = () => {
        if (!user) return;
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 30);
        const updated: User = { ...user, tier: "premium", premiumExpiry: expiry.toISOString() };
        setUser(updated);
        localStorage.setItem("visiontask_current_user", JSON.stringify(updated));
        const users = JSON.parse(localStorage.getItem("visiontask_users") || "{}");
        if (users[user.email]) {
            users[user.email].tier = "premium";
            users[user.email].premiumExpiry = expiry.toISOString();
            localStorage.setItem("visiontask_users", JSON.stringify(users));
        }
    };

    if (!mounted) return null;

    return (
        <AuthContext.Provider value={{ user, loginWithOTP, logout, upgradeToPremium, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
}
