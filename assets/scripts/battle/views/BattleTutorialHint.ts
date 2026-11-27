// @spec-source → 開場首戰五路教學戰流程控制器與提示浮窗狀態機規格書；PROG-2-2212 第一版
import { EVENT_NAMES, Faction, SP_PER_KILL } from '../../core/config/Constants';
import { FirstBattleOperationGuide, type OperationHint } from '../../core/systems/FirstBattleOperationGuide';
import { SkillSourceType } from '../../shared/SkillRuntimeContract';
/** 放招講完（④ 勝負）後，提示自己收掉的秒數：放完即消失、不霸佔畫面（PROG-2-10136） */
export const TUTORIAL_HINT_AUTO_DISMISS_MS = 10000;

export class BattleTutorialHint {
    private readonly _guide = new FirstBattleOperationGuide();
    private _dismissTimer: ReturnType<typeof setTimeout> | null = null;
    private readonly _unsubscribes: Array<() => void> = [];
    constructor(events: { on(name: string, handler: (data: any) => void): () => void },
        private readonly _showToast: (message: string) => void,
        private readonly _showGuide?: (hint: OperationHint | null) => void,
        private readonly _spStatus?: () => { current: number; max: number }) {
        const advance = (event: Parameters<FirstBattleOperationGuide['advance']>[0]): void => {
            if (this._guide.advance(event)) this._showCurrent();
        };
        this._unsubscribes.push(
            events.on(EVENT_NAMES.UnitDeployed, d => { if (d.faction === Faction.Player) advance('deployed'); }),
            events.on(EVENT_NAMES.GeneralSpChanged, d => {
                if (d.faction !== Faction.Player) return;
                if (d.maxSp > 0 && d.sp >= d.maxSp) advance('sp-ready');
                if (this._guide.step === 'ultimate') this._showCurrent();
            }),
            events.on('first-battle-guide-next', () => advance('next')),
            events.on('first-battle-guide-previous', () => advance('previous')),
            events.on('first-battle-guide-skip', () => advance('skip')),
            events.on(EVENT_NAMES.GeneralSkillUsed, d => { if (d.faction === Faction.Player && d.sourceType === SkillSourceType.Ultimate) advance('ultimate-used'); }),
            events.on(EVENT_NAMES.TurnPhaseChanged, d => {
                if (d.turn >= 8) advance('turn-stalemate');
                else if (d.turn > 1) advance('turn-ended');
            }),
            events.on(EVENT_NAMES.BattleEnded, () => advance('ended')),
        );
        this._showCurrent();
    }
    private _showCurrent(): void {
        // 講到「勝負」就開始倒數自動收起；換頁或跳過會清掉
        if (this._dismissTimer) { clearTimeout(this._dismissTimer); this._dismissTimer = null; }
        if (this._guide.step === 'victory') {
            this._dismissTimer = setTimeout(() => { this._dismissTimer = null; if (this._guide.advance('won')) this._showCurrent(); }, TUTORIAL_HINT_AUTO_DISMISS_MS);
        }
        const base = this._guide.hint;
        const sp = this._spStatus?.();
        const hint: OperationHint | null = base && this._guide.step === 'ultimate'
            ? {
                ...base,
                message: `${base.message} 每擊殺 +${SP_PER_KILL}；${sp ? `目前 ${sp.current}/${sp.max}，本將消耗 ${sp.max} SP。` : '消耗值依HUD的本將SP上限。'}`,
                suffixKey: sp ? 'battle.guide.step.ultimateSp' : 'battle.guide.step.ultimateNoSp',
                suffixArgs: sp ? [String(SP_PER_KILL), String(sp.current), String(sp.max)] : [String(SP_PER_KILL)],
            } : base;
        this._showGuide?.(hint);
        if (hint && !this._showGuide) this._showToast(hint.message);
    }
    dispose(): void {
        if (this._dismissTimer) { clearTimeout(this._dismissTimer); this._dismissTimer = null; }
        for (const unsubscribe of this._unsubscribes.splice(0)) unsubscribe();
        this._showGuide?.(null);
    }
}
