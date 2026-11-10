// @spec-source → 三國季報動態合成與市井奇遇微抉擇狀態機規格書.md (doc_spec_1171)；PROG-2-2203（LOOP-03）
/**
 * SeasonChroniclePopupController — 《三國季報》彈窗：天下大勢、世家風雲、市井奇遇二選一。
 *
 * 宿主只在換季後與換日首登時呼叫 open()（戰後回大廳不呼叫，規格 §三-2）。開窗即標記已讀（紅點熄滅）。
 * 奇遇抉擇前「收起季報」不可按，抉擇後選項按鈕隱藏、顯示結果；付不起時只提示、可改選放棄。
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
});

export function seasonChronicleView(state: Readonly<SeasonChronicleState>, seasonLabel: string, resultLine: string | null): SeasonChronicleView {
    const def = cityEncounterDef(state.encounterId);
    const chosen = state.encounterChoice;
    const pending = def !== undefined && chosen === null;
    const [a, b] = def ? def.options : [undefined, undefined];
    const chosenOption = def && chosen !== null ? def.options[chosen] : undefined;
    const gossip = state.gossip.length > 0 ? state.gossip : [CHRONICLE_HEADINGS.noGossip];
    return {
        texts: {
            chronicleTitle: `${CHRONICLE_HEADINGS.title}${seasonLabel}`,
            chronicleTrend: `${CHRONICLE_HEADINGS.trend}${state.trend}`,
            chronicleGossip: `${CHRONICLE_HEADINGS.gossip}\n${gossip.join('\n')}`,
            encounterTitle: def ? `${CHRONICLE_HEADINGS.encounter}${def.title}` : CHRONICLE_HEADINGS.encounter,
            encounterDesc: def?.desc ?? '',
            encounterNote: pending
                ? `${a?.label}：${a?.note}　／　${b?.label}：${b?.note}`
                : resultLine ?? (chosenOption ? `${CHRONICLE_HEADINGS.chosenPrefix}${chosenOption.label}，${chosenOption.note}` : ''),
            encounterOptionALabel: a?.label ?? '',
            encounterOptionBLabel: b?.label ?? '',
        },
        actives: { btnEncounterA: pending, btnEncounterB: pending },
        enabled: { btnEncounterA: pending, btnEncounterB: pending, btnCloseChronicle: !pending },
    };
}

export type CityEncounterResolveResult = { ok: true; line: string } | { ok: false; reason: 'none' | 'shortfall' | 'no-target'; resource?: string };

export interface SeasonChroniclePopupDeps<H extends MentorHoldingsHostLike> {
    mountHost(bindings: MentorHoldingsButtonBinding[]): Promise<H>;
    apply(host: H, view: SeasonChronicleView): void;
    state(): SeasonChronicleState;
    seasonLabel(): string;
    markRead(): void;
    resolve(optionIndex: 0 | 1): Promise<CityEncounterResolveResult>;
    toast(message: string): void;
}

export class SeasonChroniclePopupController<H extends MentorHoldingsHostLike> {
    private _host: H | null = null;
    private _busy = false;
    private _resultLine: string | null = null;

    constructor(private readonly _deps: SeasonChroniclePopupDeps<H>) {}

    public async mount(): Promise<void> {
        this._host = await this._deps.mountHost([
            { buttonId: 'btnEncounterA', handler: () => { void this.respond(0); } },
            { buttonId: 'btnEncounterB', handler: () => { void this.respond(1); } },
            { buttonId: 'btnCloseChronicle', handler: () => { this.close(); } },
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
        this._render();
        this._host.node.active = true;
        this._deps.markRead();
        return true;
    }

    /** 奇遇還沒抉擇時不收起 */
    public close(): void {
        if (!this._host) return;
        const state = this._deps.state();
        if (state.encounterId !== null && state.encounterChoice === null) return;
        this._host.node.active = false;
    }

    public async respond(optionIndex: 0 | 1): Promise<void> {
        if (this._busy || !this.isOpen) return;
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
        this._deps.apply(this._host, seasonChronicleView(this._deps.state(), this._deps.seasonLabel(), this._resultLine));
    }
}
