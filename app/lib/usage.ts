const USAGE_KEY = "visiontask_usage";
const DAILY_FREE_LIMIT = 5;
const DAILY_PREMIUM_LIMIT = 300;

type UsageData = {
    date: string; // YYYY-MM-DD
    count: number;
};

function getToday(): string {
    return new Date().toISOString().split("T")[0];
}

function getUsageData(): UsageData {
    if (typeof window === "undefined") return { date: getToday(), count: 0 };
    const raw = localStorage.getItem(USAGE_KEY);
    if (!raw) return { date: getToday(), count: 0 };
    const data: UsageData = JSON.parse(raw);
    // Reset if it's a new day
    if (data.date !== getToday()) {
        return { date: getToday(), count: 0 };
    }
    return data;
}

function saveUsageData(data: UsageData) {
    localStorage.setItem(USAGE_KEY, JSON.stringify(data));
}

export function getUsageCount(): number {
    return getUsageData().count;
}

export function getLimit(tier: "free" | "premium"): number {
    return tier === "premium" ? DAILY_PREMIUM_LIMIT : DAILY_FREE_LIMIT;
}

export function getRemainingUses(tier: "free" | "premium"): number {
    const used = getUsageCount();
    const limit = getLimit(tier);
    return Math.max(0, limit - used);
}

export function canUse(tier: "free" | "premium"): boolean {
    return getRemainingUses(tier) > 0;
}

export function incrementUsage(): void {
    const data = getUsageData();
    data.count += 1;
    saveUsageData(data);
}

export function getResetTime(): string {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const diff = tomorrow.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
}
