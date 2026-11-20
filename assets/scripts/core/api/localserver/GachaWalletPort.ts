// @spec-source → 共用框架總綱規格書 (doc_spec_1182) §5.2 本機 adapter 的伺服器側存檔；PROG-2-9201
/**
 * GachaWalletPort — 把既有的單機錢包權威（LocalGachaService）接成 WalletAuthority。
 *
 * LocalGachaService 已負責正規化、非負保護、寫進存檔並存檔；本 port 只轉接，不複製任何錢包邏輯。
 * 純邏輯（以結構型別接服務），不 import cc。
 */
import type { WalletAuthority } from './WalletCommands';

/** LocalGachaService 中本 port 用到的方法（結構型別，方便測試以假物件取代） */
export interface GachaWalletLike {
    getWalletSnapshot(): object;
    getCurrencyAmount(currencyKey: never): number;
    spendCurrency(currencyKey: never, amount: number): boolean;
}

export class GachaWalletPort implements WalletAuthority {
    public constructor(private readonly _service: GachaWalletLike) {}

    public balance(currency: string): number {
        return this._service.getCurrencyAmount(currency as never);
    }

    public spend(currency: string, amount: number): boolean {
        return this._service.spendCurrency(currency as never, amount);
    }

    public snapshot(): Record<string, number> {
        return { ...(this._service.getWalletSnapshot() as Record<string, number>) };
    }
}
