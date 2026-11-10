// @spec-source → 開場首戰五路教學戰流程控制器與提示浮窗狀態機規格書；PROG-2-2212 第一版
import { EVENT_NAMES, Faction, SP_PER_KILL } from '../../core/config/Constants';
import { FirstBattleOperationGuide } from '../../core/systems/FirstBattleOperationGuide';
import { SkillSourceType } from '../../shared/SkillRuntimeContract';
export class BattleTutorialHint {
    private readonly _guide = new FirstBattleOperationGuide();
    private readonly _unsubscribes: Array<() => void> = [];
    constructor(events: { on(name: string, handler: (data: any) => void): () => void },
        private readonly _showToast: (message: string) => void,
        private readonly _showGuide?: (hint: { message: string; target: string } | null) => void,
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
        const base = this._guide.hint;
        const sp = this._spStatus?.();
        const hint = base && this._guide.step === 'ultimate'
            ? { ...base, message: `${base.message} 每擊殺 +${SP_PER_KILL}；${sp ? `目前 ${sp.current}/${sp.max}，本將消耗 ${sp.max} SP。` : '消耗值依HUD的本將SP上限。'}` } : base;
        this._showGuide?.(hint);
        if (hint && !this._showGuide) this._showToast(hint.message);
    }
    dispose(): void {
        for (const unsubscribe of this._unsubscribes.splice(0)) unsubscribe();
        this._showGuide?.(null);
    }
}
