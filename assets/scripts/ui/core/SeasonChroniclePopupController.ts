// @spec-source → 三國季報動態合成與市井奇遇微抉擇狀態機規格書.md (doc_spec_1171)；PROG-2-2203（LOOP-03）
/**
 * SeasonChroniclePopupController — 《三國季報》彈窗：天下大勢、世家風雲、市井奇遇二選一。
 *
 * 宿主只在換季後與換日首登時呼叫 open()（戰後回大廳不呼叫，規格 §三-2）。開窗即標記已讀（紅點熄滅）。
 * 奇遇抉擇前「收起季報」不可按，抉擇後選項按鈕隱藏、顯示結果；付不起時只提示、可改選放棄。
 * 歷史卷軸（PROG-2-2206）：「往期」「較新」在本季與往期之間翻頁；往期只能看，不能抉擇；
 * 本季奇遇未抉擇時仍可翻閱往期，但收起季報前必須回到本季完成抉擇；翻頁不扣款、不改奇遇狀態。
 */
import { cityEncounterDef, type SeasonChronicleState } from '../../core/systems/SeasonChronicle';
import type { MentorHoldingsButtonBinding, MentorHoldingsHostLike } from './MentorHoldingsController';

export interface SeasonChronicleView {
    texts: Record<string, string>;
    actives: Record<string, boolean>;
    enabled: Record<string, boolean>;
}

export const CHRONICLE_HEADINGS = Object.freeze({
    title: '《三國季報》',
    trend: '【天下大勢】',
    gossip: '【世家風雲】',
    encounter: '【市井奇遇】',
    chosenPrefix: '已抉擇：',
    noGossip: '府中一切如常，並無新鮮軼事。',
    archivePrefix: '【往期】',
    expired: '未及抉擇，機緣已逝。',
    prev: '往期',
    next: '較新',
});

export interface ChroniclePaging {
    /** 0 為本季，n 為往期第 n 筆 */
    page: number;
    /** 往期筆數 */
    archived: number;
    /** 本季奇遇尚未抉擇（翻到往期時仍不能收起季報） */
    currentPending?: boolean;
}

export function seasonChronicleView(state: Readonly<SeasonChronicleState>, seasonLabel: string, resultLine: string | null, paging: ChroniclePaging = { page: 0, archived: 0 }): SeasonChronicleView {
    const def = cityEncounterDef(state.encounterId);
    const chosen = state.encounterChoice;
    const archivedPage = paging.page > 0;
    const pending = !archivedPage && def !== undefined && chosen === null;
    const expired = archivedPage && def !== undefined && chosen === null;
    const [a, b] = def ? def.options : [undefined, undefined];
    const chosenOption = def && chosen !== null ? def.options[chosen] : undefined;
    const gossip = state.gossip.length > 0 ? state.gossip : [CHRONICLE_HEADINGS.noGossip];
    return {
        texts: {
            chronicleTitle: `${archivedPage ? CHRONICLE_HEADINGS.archivePrefix : ''}${CHRONICLE_HEADINGS.title}${seasonLabel}`,
            chronicleTrend: `${CHRONICLE_HEADINGS.trend}${state.trend}`,
            chronicleGossip: `${CHRONICLE_HEADINGS.gossip}\n${gossip.join('\n')}`,
            encounterTitle: def ? `${CHRONICLE_HEADINGS.encounter}${def.title}` : CHRONICLE_HEADINGS.encounter,
            encounterDesc: def?.desc ?? '',
            encounterNote: pending
                ? `${a?.label}：${a?.note}　／　${b?.label}：${b?.note}`
                : expired ? CHRONICLE_HEADINGS.expired
                : (!archivedPage ? resultLine : null) ?? (chosenOption ? `${CHRONICLE_HEADINGS.chosenPrefix}${chosenOption.label}，${chosenOption.note}` : ''),
            encounterOptionALabel: a?.label ?? '',
            encounterOptionBLabel: b?.label ?? '',
            chroniclePrevLabel: CHRONICLE_HEADINGS.prev,
            chronicleNextLabel: CHRONICLE_HEADINGS.next,
        },
        actives: { btnEncounterA: pending, btnEncounterB: pending, btnChroniclePrev: paging.archived > 0, btnChronicleNext: paging.archived > 0 },
        enabled: {
            btnEncounterA: pending,
            btnEncounterB: pending,
            btnCloseChronicle: !pending && paging.currentPending !== true,
            btnChroniclePrev: paging.page < paging.archived,
            btnChronicleNext: paging.page > 0,
        },
    };
}

export type CityEncounterResolveResult = { ok: true; line: string } | { ok: false; reason: 'none' | 'shortfall' | 'no-target'; resource?: string };

export interface SeasonChroniclePopupDeps<H extends MentorHoldingsHostLike> {
    mountHost(bindings: MentorHoldingsButtonBinding[]): Promise<H>;
    apply(host: H, view: SeasonChronicleView): void;
    state(): SeasonChronicleState;
    /** 歷史卷軸，新的在前（PROG-2-2206） */
    archive(): SeasonChronicleState[];
    /** 該季（totalSeasonsElapsed）的年份季節文字 */
    seasonLabel(season: number): string;
    markRead(): void;
    resolve(optionIndex: 0 | 1): Promise<CityEncounterResolveResult>;
    toast(message: string): void;
}

export class SeasonChroniclePopupController<H extends MentorHoldingsHostLike> {
    private _host: H | null = null;
    private _busy = false;
    private _resultLine: string | null = null;
    private _page = 0;

    constructor(private readonly _deps: SeasonChroniclePopupDeps<H>) {}

    public async mount(): Promise<void> {
        this._host = await this._deps.mountHost([
            { buttonId: 'btnEncounterA', handler: () => { void this.respond(0); } },
            { buttonId: 'btnEncounterB', handler: () => { void this.respond(1); } },
            { buttonId: 'btnCloseChronicle', handler: () => { this.close(); } },
            { buttonId: 'btnChroniclePrev', handler: () => { this.turnPage(1); } },
            { buttonId: 'btnChronicleNext', handler: () => { this.turnPage(-1); } },
        ]);
        if (this._host) this._host.node.active = false;
    }

    public get host(): H | null {
        return this._host;
    }

    public get isOpen(): boolean {
        return this._host?.node.active === true;
    }

    /** 開窗並標記已讀；本季沒有季報時不開，回傳 false */
    public open(): boolean {
        if (!this._host) return false;
        if (this._deps.state().season < 0) return false;
        this._resultLine = null;
        this._page = 0;
        this._render();
        this._host.node.active = true;
        this._deps.markRead();
        return true;
    }

    /** 目前頁碼：0 為本季，n 為往期第 n 筆 */
    public get page(): number {
        return this._page;
    }

    /** 翻頁：+1 往更早，-1 往較新；只換顯示頁，不動季報與奇遇狀態 */
    public turnPage(delta: 1 | -1): void {
        if (!this.isOpen) return;
        const next = Math.max(0, Math.min(this._deps.archive().length, this._page + delta));
        if (next === this._page) return;
        this._page = next;
        this._render();
    }

    /** 奇遇還沒抉擇時不收起 */
    public close(): void {
        if (!this._host) return;
        const state = this._deps.state();
        if (state.encounterId !== null && state.encounterChoice === null) return;
        this._host.node.active = false;
    }

    public async respond(optionIndex: 0 | 1): Promise<void> {
        if (this._busy || !this.isOpen || this._page !== 0) return;
        this._busy = true;
        try {
            const result = await this._deps.resolve(optionIndex);
            if (!result.ok) {
                if (result.reason === 'shortfall') this._deps.toast(`${result.resource ?? '資源'}不足，無法執行`);
                else if (result.reason === 'no-target') this._deps.toast('府中無將可受此機緣');
                return;
            }
            this._resultLine = result.line;
            this._deps.toast(result.line);
            this._render();
        } finally {
            this._busy = false;
        }
    }

    private _render(): void {
        if (!this._host) return;
        const archive = this._deps.archive();
        if (this._page > archive.length) this._page = archive.length;
        const current = this._deps.state();
        const state = this._page === 0 ? current : archive[this._page - 1];
        const currentPending = current.encounterId !== null && current.encounterChoice === null;
        this._deps.apply(this._host, seasonChronicleView(state, this._deps.seasonLabel(state.season), this._resultLine, { page: this._page, archived: archive.length, currentPending }));
    }
}
