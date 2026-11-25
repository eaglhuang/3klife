// @spec-source → 轉蛋系統.md (doc_spec_0042)；PROG-2-1429 依建檔紀錄補標出處
/**
 * GachaWalletRules — 轉蛋扣款規則（純邏輯，不依賴 cc）
 *
 * 正式模式：餘額不足直接拒絕；開發模式（devAutoTopUp）才會自動補款，方便預覽。
 *
 * Unity 對照：像 Shop.TryPurchase()，回傳是否成功，而不是偷偷改玩家錢包。
 */
/** gems＝靈玉（付費）、tickets＝召喚券、bronze＝銅錢符（免費，僅常設池）、oracle＝求籤令（定向道具，不是池幣）、mentorTickets＝連線券（教官池抽卡貨幣，第一版不販售，只由免費來源取得）、scorePoints＝積分（教官卡滿星溢出轉化，PROG-2-1095） */
export type WalletCurrencyKey = 'gems' | 'gold' | 'tickets' | 'bronze' | 'oracle' | 'mentorTickets' | 'scorePoints';

export const CURRENCY_LABELS: Record<WalletCurrencyKey, string> = {
    gems: '靈玉',
    gold: '黃金',
    tickets: '召喚券',
    bronze: '銅錢符',
    oracle: '求籤令',
    mentorTickets: '連線券',
    scorePoints: '積分',
};

/** 新檔的起始錢包（原為 LocalGachaService 私有常數，數值不變）；存檔為 null 時的入帳基底 */
export const STARTER_GACHA_WALLET: Readonly<Record<WalletCurrencyKey, number>> = {
    /** 開局靈玉 1500＝剛好一次限定池十連（tenCost 1500）；原 1280 差 220，新玩家第一次十連買不起（PROG-2-9994，總PM 11/25 裁決） */
    gems: 1500,
    /** 正式開局黃金 1000（規格 CP-01；PROG-2-9149）；原 128,450 只留在 QA_STARTER_GACHA_WALLET */
    gold: 1000,
    tickets: 12,
    /** 開局送一次十連份的銅錢符（1500），規格十連漲到 1500 後新玩家仍抽得起（PROG-2-1094） */
    bronze: 1500,
    oracle: 0,
    /** 開局禮包送 10 張連線券，讓第一次修業前能抽一次十連的教官池（SUP-10／PROG-2-9243；第一版連線券不販售，開局禮包是免費來源之一，doc_spec_1264 §16） */
    mentorTickets: 10,
    scorePoints: 0,
};

/** QA／測試種子錢包：黃金 128,450（舊開局值）；只有開啟 QA 開關（localStorage ucuf.qa.rich-wallet）或測試明確引用時才使用，正式開局一律用 STARTER_GACHA_WALLET */
export const QA_STARTER_GACHA_WALLET: Readonly<Record<WalletCurrencyKey, number>> = Object.freeze({
    ...STARTER_GACHA_WALLET,
    gold: 128450,
});

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
