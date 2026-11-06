// @spec-source → 祠堂聲望與家族福祉 (doc_spec_0310) §3；PROG-2-1958
/**
 * ClanShrineController — 祠堂聲望畫面
 *
 * 開窗時向宿主取聲望與供奉狀態並刷新；領取供奉走宿主注入的 claim（GameSession.claimShrineOffering）；
 * 聲望變動時刷新並在升階時提示。掛載、套 view 與提示都由宿主注入。
 */
import { CLAN_PRESTIGE_TIER_NAMES } from '../../core/systems/GenerationalLegacy';
import { clanShrineView, type ClanShrineView } from './ClanShrineView';
import type { MentorHoldingsButtonBinding, MentorHoldingsHostLike } from './MentorHoldingsController';

export interface ClanShrineDeps<H extends MentorHoldingsHostLike> {
    mountHost(bindings: MentorHoldingsButtonBinding[]): Promise<H>;
    apply(host: H, view: ClanShrineView): void;
    prestige(): number;
    tier(): number;
    canClaim(epochMs: number): boolean;
    /** 即 GameSession.claimShrineOffering；回傳領到的補元散數，0 表示不符資格 */
    claim(epochMs: number): Promise<number>;
    offeringPills: number;
    now(): number;
    toast(message: string): void;
}

export class ClanShrineController<H extends MentorHoldingsHostLike> {
    private _host: H | null = null;

    constructor(private readonly _deps: ClanShrineDeps<H>) {}

    public async mount(): Promise<void> {
        this._host = await this._deps.mountHost([
            { buttonId: 'btnCloseShrine', handler: () => this.setOpen(false) },
            { buttonId: 'btnClaimShrine', handler: () => { void this.claim(); } },
        ]);
        this.setOpen(false);
    }

    public get host(): H | null {
        return this._host;
    }

    public setOpen(open: boolean): void {
        if (open) this.refresh();
        if (this._host) this._host.node.active = open;
    }

    public refresh(): void {
        if (!this._host) return;
        this._deps.apply(this._host, clanShrineView({
            prestige: this._deps.prestige(),
            tier: this._deps.tier(),
            canClaim: this._deps.canClaim(this._deps.now()),
            offeringPills: this._deps.offeringPills,
        }));
    }

    /** 領今天的供奉；不符資格時只提示 */
    public async claim(): Promise<number> {
        const got = await this._deps.claim(this._deps.now());
        this._deps.toast(got > 0 ? `祠堂供奉：獲得補元散 ×${got}` : '今天沒有可領的祠堂供奉');
        this.refresh();
        return got;
    }

    /** ClanPrestigeChanged：升階時提示新階層稱號，畫面開著就跟著刷新 */
    public onPrestigeChanged(payload: { tier: number; tierUp: boolean }): void {
        if (payload.tierUp) {
            const name = CLAN_PRESTIGE_TIER_NAMES[Math.min(CLAN_PRESTIGE_TIER_NAMES.length, Math.max(1, payload.tier)) - 1];
            this._deps.toast(`祠堂升階：Lv.${payload.tier}「${name}」`);
        }
        if (this._host?.node.active) this.refresh();
    }
}
