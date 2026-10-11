/**
 * GachaWalletRules — 轉蛋扣款規則（純邏輯，不依賴 cc）
 *
 * 正式模式：餘額不足直接拒絕；開發模式（devAutoTopUp）才會自動補款，方便預覽。
 *
 * Unity 對照：像 Shop.TryPurchase()，回傳是否成功，而不是偷偷改玩家錢包。
 */
export type WalletCurrencyKey = 'gems' | 'gold' | 'tickets';

export const CURRENCY_LABELS: Record<WalletCurrencyKey, string> = {
    gems: '玉',
    gold: '金幣',
    tickets: '召喚券',
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
