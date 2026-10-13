// @spec-source → 新手開場規格書.md 第三幕「戰鬥序列：教學提示浮窗」（PROG-2-0241，WBS OPEN-07）
/**
 * BattleTutorialHint — 首戰教學的提示浮窗（薄 View）
 *
 * 規則與順序都在 FirstBattleTutorialPresenter（純 TS）；這裡只訂閱戰場事件、
 * 把事件轉給 Presenter，並在提示改變時用既有的 toast 顯示文字。
 * Unity 對照：像一個只負責顯示的 TutorialHintPanel，邏輯由 TutorialManager 決定。
 *
 * 注意：Cocos 場景內的實機顯示尚未在編輯器驗證（需 Codex 實機驗收）。
 */
import { EVENT_NAMES, Faction } from '../../core/config/Constants';
import { FirstBattleTutorialPresenter, FIRST_BATTLE_HINT_TEXT } from '../../core/systems/FirstBattleTutorial';

type ShowToast = (message: string) => void;

export class BattleTutorialHint {
    private readonly _presenter = new FirstBattleTutorialPresenter();
    private readonly _unsubscribes: Array<() => void> = [];
    /** UnitMoved 不帶陣營，所以用部署時記下的我方單位 id 判斷 */
    private readonly _playerUnitIds = new Set<string>();

    constructor(events: { on(name: string, handler: (data: any) => void): () => void }, private readonly _showToast: ShowToast) {
        this._unsubscribes.push(
            events.on(EVENT_NAMES.UnitDeployed, (data: { unitId: string; faction: Faction }) => {
                const isPlayer = data.faction === Faction.Player;
                if (isPlayer) this._playerUnitIds.add(data.unitId);
                this._apply(this._presenter.onUnitDeployed(isPlayer));
            }),
            events.on(EVENT_NAMES.UnitMoved, (data: { unitId: string }) => {
                this._apply(this._presenter.onUnitMoved(this._playerUnitIds.has(data.unitId)));
            }),
            events.on(EVENT_NAMES.UnitDamaged, (data: { attackerFaction: Faction | null }) => {
                const attackerIsPlayer = data.attackerFaction === null ? null : data.attackerFaction === Faction.Player;
                this._apply(this._presenter.onUnitDamaged(attackerIsPlayer));
            }),
        );
        this._showCurrentHint();
    }

    dispose(): void {
        for (const unsubscribe of this._unsubscribes.splice(0)) unsubscribe();
    }

    private _apply(update: { changed: boolean; hint: { step: keyof typeof FIRST_BATTLE_HINT_TEXT } | null }): void {
        if (update.changed) this._showCurrentHint();
    }

    private _showCurrentHint(): void {
        const hint = this._presenter.hint;
        if (hint) this._showToast(FIRST_BATTLE_HINT_TEXT[hint.step]);
    }
}
