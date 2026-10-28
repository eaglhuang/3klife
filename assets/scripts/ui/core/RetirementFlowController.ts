// @spec-source → 武將壽命系統.md (doc_spec_0018)；PROG-2-1429 依建檔紀錄補標出處
import type { GeneralConfig } from '../../core/models/GeneralUnit';
import { GENERAL_STATUS_DEAD, RETIREMENT_AGE } from '../../core/systems/GeneralAging';
import { GENERAL_STATUS_UNVEILED, UNVEILING_AGE } from '../../core/systems/Unveiling';

type RetirementGeneral = GeneralConfig & { isMentorCard?: boolean; fatherId?: string; motherId?: string };
export interface RetirementFlowDeps {
    /** Must return the owned session roster, never the template catalogue. */
    roster(): GeneralConfig[];
    retireGeneral(id: string, options?: { catalystChildId?: string; heirChildId?: string }): Promise<unknown>;
}
export type RetirementOutcome = 'confirmation-required' | 'retired' | 'unavailable' | 'busy' | 'failed';

/** Player-driven retirement; delegates card creation and saving to GameSession. */
export class RetirementFlowController {
    private _selectedId: string | null = null;
    private _catalystChildId: string | null = null;
    private _heirChildId: string | null = null;
    private _confirmId: string | null = null;
    private _busy = false;
    private _notice = '';

    constructor(private readonly _deps: RetirementFlowDeps) {}

    candidates(): RetirementGeneral[] {
        return this._deps.roster().filter((g: RetirementGeneral) =>
            (g.age ?? 0) >= RETIREMENT_AGE && !g.isMentorCard
            && (g.status ?? '').toLowerCase() !== GENERAL_STATUS_DEAD);
    }

    /** 可當因子媒介的子嗣：0~UNVEILING_AGE 歲、尚未開獎、未死亡，且不是目前退役的武將。 */
    catalystChildren(): RetirementGeneral[] {
        const targetId = this.selected?.id;
        return this._deps.roster().filter((g: RetirementGeneral) =>
            g.id !== targetId
            && (g.age ?? 0) >= 0 && (g.age ?? 0) <= UNVEILING_AGE
            && g.status !== GENERAL_STATUS_UNVEILED
            && (g.status ?? '').toLowerCase() !== GENERAL_STATUS_DEAD);
    }

    /** 可接收裝備的子嗣：roster 上 fatherId／motherId 指向退役目標，且存活、非導師卡（與 GameSession 的驗證一致）。 */
    heirChildren(): RetirementGeneral[] {
        const target = this.selected;
        if (!target) return [];
        return this._deps.roster().filter((g: RetirementGeneral) =>
            g.id !== target.id
            && (g.fatherId === target.id || g.motherId === target.id)
            && !g.isMentorCard
            && (g.status ?? '').toLowerCase() !== GENERAL_STATUS_DEAD);
    }

    /** 目前選中的裝備接收子嗣；沒有選或已不合法時為 null。 */
    get heirChild(): RetirementGeneral | null {
        return this.heirChildren().find(g => g.id === this._heirChildId) ?? null;
    }

    /** 循環選擇裝備接收者：無 → 子嗣1 → … → 無。 */
    selectNextHeirChild(): void {
        if (this._busy) return;
        const children = this.heirChildren();
        const index = children.findIndex(g => g.id === this._heirChildId);
        this._heirChildId = index + 1 < children.length ? children[index + 1].id : null;
    }

    /** 目前選中的媒介子嗣；沒有選或已不合法時為 null。 */
    get catalystChild(): RetirementGeneral | null {
        return this.catalystChildren().find(g => g.id === this._catalystChildId) ?? null;
    }

    get selected(): RetirementGeneral | null {
        const candidates = this.candidates();
        const selected = candidates.find(g => g.id === this._selectedId) ?? candidates[0] ?? null;
        this._selectedId = selected?.id ?? null;
        return selected;
    }
    get busy(): boolean { return this._busy; }
    get notice(): string { return this._notice; }
    get confirming(): boolean { return !!this._confirmId && this._confirmId === this.selected?.id; }

    selectNext(): void {
        if (this._busy) return;
        const selected = this.selected;
        const candidates = this.candidates();
        const index = candidates.findIndex(g => g.id === selected?.id);
        this._selectedId = candidates.length ? candidates[(index + 1) % candidates.length].id : null;
        this._catalystChildId = null;
        this._heirChildId = null;
        this.cancel();
    }

    /** 循環選擇媒介：無 → 子嗣1 → … → 無。 */
    selectNextCatalystChild(): void {
        if (this._busy) return;
        const children = this.catalystChildren();
        const index = children.findIndex(g => g.id === this._catalystChildId);
        this._catalystChildId = index + 1 < children.length ? children[index + 1].id : null;
    }

    cancel(): void {
        if (this._busy) return;
        this._confirmId = null;
        this._notice = '';
    }

    async retire(): Promise<RetirementOutcome> {
        if (this._busy) return 'busy';
        const target = this.selected;
        if (!target) {
            this._confirmId = null;
            this._notice = '目前沒有可退役的武將';
            return 'unavailable';
        }
        if (this._confirmId !== target.id) {
            this._confirmId = target.id;
            this._notice = `${target.name} 將轉為教官，不能再出戰或結緣。再按一次確認退役。`;
            return 'confirmation-required';
        }
        this._busy = true;
        const child = this.catalystChild;
        const heir = this.heirChild;
        const options: { catalystChildId?: string; heirChildId?: string } = {};
        if (child) options.catalystChildId = child.id;
        if (heir) options.heirChildId = heir.id;
        try {
            if (child || heir) await this._deps.retireGeneral(target.id, options);
            else await this._deps.retireGeneral(target.id);
            this._notice = `${target.name} 已退役，教官卡已保存`;
            return 'retired';
        } catch (error) {
            this._notice = error instanceof Error ? error.message : '退役失敗，請稍後重試';
            return 'failed';
        } finally {
            this._busy = false;
            this._confirmId = null;
        }
    }
}
