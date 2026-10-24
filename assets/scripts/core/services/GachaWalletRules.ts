/**
 * GachaWalletRules — 轉蛋扣款規則（純邏輯，不依賴 cc）
 *
 * 正式模式：餘額不足直接拒絕；開發模式（devAutoTopUp）才會自動補款，方便預覽。
 *
 * Unity 對照：像 Shop.TryPurchase()，回傳是否成功，而不是偷偷改玩家錢包。
 */
/** gems＝靈玉（付費）、tickets＝召喚券、bronze＝銅錢符（免費，僅常設池）、oracle＝求籤令（定向道具，不是池幣）、mentorTickets＝支援券（只用於支援卡池） */
export type WalletCurrencyKey = 'gems' | 'gold' | 'tickets' | 'bronze' | 'oracle' | 'mentorTickets';

export const CURRENCY_LABELS: Record<WalletCurrencyKey, string> = {
    gems: '靈玉',
    gold: '金幣',
    tickets: '召喚券',
    bronze: '銅錢符',
    oracle: '求籤令',
    mentorTickets: '支援券',
};

/** 新檔的起始錢包（原為 LocalGachaService 私有常數，數值不變）；存檔為 null 時的入帳基底 */
export const STARTER_GACHA_WALLET: Readonly<Record<WalletCurrencyKey, number>> = {
    gems: 1280,
    gold: 128450,
    tickets: 12,
    bronze: 0,
    oracle: 0,
    /** 開局送 5 張支援券，讓第一次培育能抽到教官（PROG-2-1085，使用者裁定 2026-10-24） */
    mentorTickets: 5,
};

export interface WalletCheckResult {
    ok: boolean;
    /** 需要補的差額（ok 時為 0） */
    shortfall: number;
    /** 開發模式補款後的新餘額；只有 devAutoTopUp 且不足時才有值 */
    toppedUpBalance?: number;
}

export function checkWalletBalance(
    balance: number,
    cost: number,
    devAutoTopUp: boolean,
    devTopUpBase = 0,
): WalletCheckResult {
    if (cost <= 0 || balance >= cost) {
        return { ok: true, shortfall: 0 };
    }
    const shortfall = cost - balance;
    if (devAutoTopUp) {
        return { ok: true, shortfall, toppedUpBalance: balance + shortfall + devTopUpBase };
    }
    return { ok: false, shortfall };
}

export function formatInsufficientMessage(key: WalletCurrencyKey, shortfall: number): string {
    return `${CURRENCY_LABELS[key]}不足，還差 ${shortfall}`;
}
