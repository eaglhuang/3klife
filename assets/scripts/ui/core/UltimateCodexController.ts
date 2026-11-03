// @spec-source → 見 docs/cross-reference-index.md
/**
 * UltimateCodexController — 奧義圖鑑（PROG-2-1633 自 LobbyScene 拆出；原 ULT-16）
 *
 * 列出已解鎖奧義；列資料由 buildUltimateCodex 組出。大廳入口待定，目前只有開關。
 */
import { buildUltimateCodex, type UltimateCodexGeneral } from '../../core/systems/UltimateUpgrade';
import { buildUltimateCodexTexts, withUltimateCodexFallback, type UltimateCodexTextLookup } from './UltimateCodexTexts';
import type { MentorHoldingsButtonBinding, MentorHoldingsHostLike } from './MentorHoldingsController';

export interface UltimateCodexDeps<H extends MentorHoldingsHostLike> {
    mountHost(bindings: MentorHoldingsButtonBinding[]): Promise<H>;
    generals(): readonly UltimateCodexGeneral[];
    lookup: UltimateCodexTextLookup;
    bringToFront(host: H): void;
}

export class UltimateCodexController<H extends MentorHoldingsHostLike> {
    private _host: H | null = null;

    constructor(private readonly _deps: UltimateCodexDeps<H>) {}

    public async mount(): Promise<void> {
        this._host = await this._deps.mountHost([
            { buttonId: 'btnCloseUltimateCodex', handler: () => this.close() },
        ]);
    }

    public open(): void {
        const host = this._host;
        if (!host || !host.binder) return;
        const lookup = withUltimateCodexFallback(this._deps.lookup);
        host.binder.setTexts(buildUltimateCodexTexts(buildUltimateCodex(this._deps.generals()), lookup));
        host.node.active = true;
        this._deps.bringToFront(host);
    }

    public close(): void {
        if (this._host) this._host.node.active = false;
    }
}
