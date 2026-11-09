// @spec-source → 大廳季度推進時間發動機與武將性格事件狀態機規格書.md (doc_spec_1169) §二-2；PROG-2-2201（LOOP-01）
/**
 * SeasonEventPopupController — 換季武將性格事件彈窗（二選一）。
 *
 * 宿主在換季後、讀檔後呼叫 tryOpen()：本季有待回應的事件就開窗。選項付不起時只提示、窗不關；
 * 回應成功後若本季還有下一起事件就直接換上，沒有就關窗。
 */
import { seasonEventDef, seasonEventDesc, type SeasonEventInstance } from '../../core/systems/SeasonPersonalityEvents';
import type { MentorHoldingsButtonBinding, MentorHoldingsHostLike } from './MentorHoldingsController';

export interface SeasonEventView {
    texts: Record<string, string>;
    actives: Record<string, boolean>;
    enabled: Record<string, boolean>;
}

export function seasonEventView(instance: SeasonEventInstance): SeasonEventView {
    const def = seasonEventDef(instance.eventId);
    const [a, b] = def ? def.options : [undefined, undefined];
    return {
        texts: {
            eventTitle: def ? `【${def.title}】${instance.generalName}` : instance.generalName,
            eventDesc: seasonEventDesc(instance),
            eventNoteA: a ? `${a.label}：${a.note}` : '',
            eventNoteB: b ? `${b.label}：${b.note}` : '',
            eventOptionALabel: a?.label ?? '',
            eventOptionBLabel: b?.label ?? '',
        },
        actives: {},
        enabled: { btnEventOptionA: true, btnEventOptionB: true },
    };
}

export type SeasonEventResolveResult = { ok: true; line: string } | { ok: false; reason: 'none' | 'shortfall'; resource?: string };

export interface SeasonEventPopupDeps<H extends MentorHoldingsHostLike> {
    mountHost(bindings: MentorHoldingsButtonBinding[]): Promise<H>;
    apply(host: H, view: SeasonEventView): void;
    /** 本季下一起待回應事件；沒有時為 null */
    next(): SeasonEventInstance | null;
    resolve(optionIndex: 0 | 1): Promise<SeasonEventResolveResult>;
    toast(message: string): void;
}

export class SeasonEventPopupController<H extends MentorHoldingsHostLike> {
    private _host: H | null = null;
    private _busy = false;

    constructor(private readonly _deps: SeasonEventPopupDeps<H>) {}

    public async mount(): Promise<void> {
        this._host = await this._deps.mountHost([
            { buttonId: 'btnEventOptionA', handler: () => { void this.respond(0); } },
            { buttonId: 'btnEventOptionB', handler: () => { void this.respond(1); } },
        ]);
        if (this._host) this._host.node.active = false;
    }

    public get host(): H | null {
        return this._host;
    }

    /**
     * 與本季待回應事件同步：有就開窗（已開著則換成目前那一起）並回傳 true，沒有就關窗。
     * 快進連推多季時舊事件已作廢，結束後呼叫一次即可對齊。
     */
    public tryOpen(): boolean {
        if (!this._host || this._busy) return false;
        if (this._show(this._deps.next())) return true;
        this._host.node.active = false;
        return false;
    }

    /** 回應目前事件；處理中再點不重複結算 */
    public async respond(optionIndex: 0 | 1): Promise<void> {
        if (this._busy || !this._host?.node.active) return;
        this._busy = true;
        try {
            const result = await this._deps.resolve(optionIndex);
            if (!result.ok && result.reason === 'shortfall') {
                this._deps.toast(`${result.resource ?? '資源'}不足，無法執行`);
                return;
            }
            if (result.ok) this._deps.toast(result.line);
            if (!this._show(this._deps.next()) && this._host) this._host.node.active = false;
        } finally {
            this._busy = false;
        }
    }

    private _show(instance: SeasonEventInstance | null): boolean {
        if (!instance || !this._host) return false;
        this._deps.apply(this._host, seasonEventView(instance));
        this._host.node.active = true;
        return true;
    }
}
