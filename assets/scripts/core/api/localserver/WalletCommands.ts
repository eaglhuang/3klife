// @spec-source → 共用框架總綱規格書 (doc_spec_1182) §5.5 庫存／貨幣由權威端算、§5.9 P0 錢包遷移；PROG-2-9201
/**
 * WalletCommands — 錢包命令（wallet.spend／wallet.balance）在本機 adapter 的處理器。
 *
 * 餘額與扣款只在權威端（WalletAuthority port）發生；玩法程式只送「扣多少、為什麼」，
 * 不足回 E301 且不扣。現階段 amount 由呼叫端提供（價格尚未進商店框架）；
 * 價格權威化隨 shop.buy 命令遷移（見卡 PROG-2-9201 notes 的剩餘清單）。
 */
import { WALLET_CURRENCIES, type WalletBalanceResult, type WalletSpendResult } from '../../../shared/api/ApiCommands';
import { ApiError } from '../../../shared/api/ApiErrors';
import type { LocalApiAdapter } from './LocalApiAdapter';

/** 權威錢包 port：單機由 LocalGachaService 實作（GachaWalletPort），連線時由伺服器取代 */
export interface WalletAuthority {
    balance(currency: string): number;
    /** 餘額不足回 false 且不扣；扣成功時由 port 負責持久化 */
    spend(currency: string, amount: number): boolean;
    snapshot(): Record<string, number>;
    /** 入帳（物品庫存溢出折金等系統來源）；沒實作代表此權威不接受入帳，呼叫端須先預檢 */
    credit?(currency: string, amount: number): void;
}

export function registerWalletCommands(adapter: LocalApiAdapter, getWallet: () => WalletAuthority | null): void {
    const requireWallet = (): WalletAuthority => {
        const wallet = getWallet();
        if (!wallet) throw new ApiError('WALLET_UNAVAILABLE', '錢包尚未就緒');
        return wallet;
    };

    adapter.register('wallet.spend', (args) => {
        const currency = args.currency;
        const amount = args.amount;
        if (typeof currency !== 'string' || WALLET_CURRENCIES.indexOf(currency) < 0) throw new ApiError('CURRENCY_UNKNOWN', `未知幣別 ${String(currency)}`);
        if (typeof amount !== 'number' || !Number.isInteger(amount) || amount <= 0) throw new ApiError('INVALID_SCHEMA', 'amount 必須是正整數');
        if (typeof args.reason !== 'string' || args.reason.length === 0) throw new ApiError('INVALID_SCHEMA', 'reason 不可為空');
        const wallet = requireWallet();
        if (!wallet.spend(currency, amount)) {
            throw new ApiError('INSUFFICIENT_BALANCE', `${currency} 不足：需要 ${amount}，目前 ${wallet.balance(currency)}`);
        }
        const balance = wallet.balance(currency);
        const result: WalletSpendResult = { currency, spent: amount, balance };
        return {
            result,
            delta: [{ path: currency === 'silver' ? '/family/silver' : `/gachaWallet/${currency}`, op: 'replace', value: balance }],
            events: [{ evt: 'inventory.changed', data: { currency, balance, reason: args.reason } }],
        };
    });

    adapter.register('wallet.balance', (args) => {
        const wallet = requireWallet();
        const all = wallet.snapshot();
        if (args.currency === undefined) return { result: all as WalletBalanceResult };
        const currency = args.currency;
        if (typeof currency !== 'string' || WALLET_CURRENCIES.indexOf(currency) < 0) throw new ApiError('CURRENCY_UNKNOWN', `未知幣別 ${String(currency)}`);
        return { result: { [currency]: all[currency] ?? 0 } as WalletBalanceResult };
    });
}
