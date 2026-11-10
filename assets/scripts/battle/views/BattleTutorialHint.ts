// @spec-source → 開場首戰五路教學戰流程控制器與提示浮窗狀態機規格書；PROG-2-2212 第一版
import { EVENT_NAMES, Faction } from '../../core/config/Constants';
import { FirstBattleOperationGuide } from '../../core/systems/FirstBattleOperationGuide';
import { SkillSourceType } from '../../shared/SkillRuntimeContract';
export class BattleTutorialHint {
    private readonly _guide = new FirstBattleOperationGuide();
    private readonly _unsubscribes: Array<() => void> = [];
    constructor(events: { on(name: string, handler: (data: any) => void): () => void },
        private readonly _showToast: (message: string) => void,
        private readonly _showGuide?: (hint: { message: string; target: string } | null) => void) {
        const advance = (event: Parameters<FirstBattleOperationGuide['advance']>[0]): void => {
            if (this._guide.advance(event)) this._showCurrent();
        };
        this._unsubscribes.push(
            events.on(EVENT_NAMES.UnitDeployed, d => { if (d.faction === Faction.Player) advance('deployed'); }),
            events.on(EVENT_NAMES.GeneralSpChanged, d => { if (d.faction === Faction.Player && d.maxSp > 0 && d.sp >= d.maxSp) advance('sp-ready'); }),
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
        const hint = this._guide.hint;
        this._showGuide?.(hint);
        if (hint) this._showToast(hint.message);
    }
    dispose(): void {
        for (const unsubscribe of this._unsubscribes.splice(0)) unsubscribe();
        this._showGuide?.(null);
    }
}
