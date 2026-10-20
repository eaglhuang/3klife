import type { GeneralConfig } from '../../core/models/GeneralUnit';
import { GENERAL_STATUS_DEAD, RETIREMENT_AGE } from '../../core/systems/GeneralAging';
import { GENERAL_STATUS_UNVEILED, UNVEILING_AGE } from '../../core/systems/Unveiling';

type RetirementGeneral = GeneralConfig & { isMentorCard?: boolean };
export interface RetirementFlowDeps {
    /** Must return the owned session roster, never the template catalogue. */
    roster(): GeneralConfig[];
    retireGeneral(id: string, options?: { catalystChildId?: string }): Promise<unknown>;
}
export type RetirementOutcome = 'confirmation-required' | 'retired' | 'unavailable' | 'busy' | 'failed';

/** Player-driven retirement; delegates card creation and saving to GameSession. */
export class RetirementFlowController {
    private _selectedId: string | null = null;
    private _catalystChildId: string | null = null;
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
        try {
            if (child) await this._deps.retireGeneral(target.id, { catalystChildId: child.id });
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
