// @spec-source → 家族子嗣與血統總規格書 (doc_spec_1241) 3.2／3.4 家族銀兩；共用框架總綱 (doc_spec_1182) §5.5；PROG-2-9591
/**
 * SilverWalletPort — 家族銀兩幣別（silver）掛進 wallet.* 命令的權威錢包。
 *
 * 銀兩＝家族貨幣（家業、婚嫁、養子嗣、學府），與金（國家公庫）、轉蛋貨幣（靈玉、召喚券…）永遠分開：
 * 銀兩餘額存在家族登記表的存檔欄位 familyState.silver，不進轉蛋錢包存檔。
 * 本類別只做「路由」：幣別是 silver 就走家族帳本，其餘一律轉給原本的轉蛋錢包權威，不複製任何錢包邏輯。
 *
 * Unity 對照：像一個 CurrencyRouter，依幣別 id 決定交給哪一個錢包。純邏輯，不 import cc。
 */
import { ApiError } from '../../../shared/api/ApiErrors';
import type { WalletAuthority } from './WalletCommands';

export const SILVER_CURRENCY = 'silver';

/** 家族銀兩帳本（單機由 GameSession 提供；連線時由伺服器取代） */
export interface SilverLedger {
    silverBalance(): number;
    /** 不足回 false 且不扣；扣成功由帳本負責落盤 */
    spendSilver(amount: number): boolean;
    creditSilver(amount: number): void;
}

export class SilverRoutedWallet implements WalletAuthority {
    public constructor(private readonly _base: WalletAuthority | null, private readonly _silver: SilverLedger) {}

    private _requireBase(): WalletAuthority {
        if (!this._base) throw new ApiError('WALLET_UNAVAILABLE', '錢包尚未就緒');
        return this._base;
    }

    public balance(currency: string): number {
        return currency === SILVER_CURRENCY ? this._silver.silverBalance() : this._requireBase().balance(currency);
    }

    public spend(currency: string, amount: number): boolean {
        return currency === SILVER_CURRENCY ? this._silver.spendSilver(amount) : this._requireBase().spend(currency, amount);
    }

    public credit(currency: string, amount: number): void {
        if (currency === SILVER_CURRENCY) { this._silver.creditSilver(amount); return; }
        const base = this._requireBase();
        if (!base.credit) throw new ApiError('WALLET_UNAVAILABLE', '此錢包不接受入帳');
        base.credit(currency, amount);
    }

    public snapshot(): Record<string, number> {
        return { ...(this._base ? this._base.snapshot() : {}), [SILVER_CURRENCY]: this._silver.silverBalance() };
    }
}
