// @spec-source docs/cross-reference-index.md
/**
 * LobbyLeaderboardComposite — 戰績排行榜彈窗（PROG-2-0960）
 *
 * 畫面規格：ui-spec/screens/lobby-leaderboard-screen.json（PROG-2-0959）。
 * 列資料與文字由 BattleLeaderboardView 純邏輯產生；這裡只負責 mount、套文字、切換指標與關閉。
 *
 * Unity 對照：像一個 Popup Prefab 的 Controller，資料由 Presenter 算好，這裡只 label.text = ... 並綁按鈕。
 */
import { _decorator, Button } from 'cc';
import { CompositePanel } from '../core/CompositePanel';
import type { UITemplateBinder } from '../core/UITemplateBinder';
import {
    buildLeaderboardPanelTexts,
    buildLeaderboardRows,
    LEADERBOARD_PANEL_ROWS,
    type LeaderboardMetric,
} from '../../core/systems/BattleLeaderboardView';
import type { LeaderboardSource } from '../../core/systems/BattleLeaderboard';

const { ccclass } = _decorator;

const SCREEN_ID = 'lobby-leaderboard-screen';

export interface LobbyLeaderboardOpenPayload {
    /** 名冊武將（含戰績欄位）；由呼叫端從 GameSession.roster 取得 */
    roster: readonly (LeaderboardSource & { name?: string })[];
    /** 開啟時的排序指標，預設傷害 */
    metric?: LeaderboardMetric;
    onRequestClose?: () => void;
}

const METRIC_BUTTON_IDS: Readonly<Record<LeaderboardMetric, string>> = {
    damage: 'metricDamage',
    kills: 'metricKills',
    guardian: 'metricGuardian',
};

@ccclass('LobbyLeaderboardComposite')
export class LobbyLeaderboardComposite extends CompositePanel {
    public onRequestClose: (() => void) | null = null;

    private _templateBinder: UITemplateBinder | null = null;
    private _roster: readonly (LeaderboardSource & { name?: string })[] = [];
    private _metric: LeaderboardMetric = 'damage';
    private _isMounted = false;

    public async show(payload?: LobbyLeaderboardOpenPayload): Promise<void> {
        if (!this._isMounted) {
            await this.mount(SCREEN_ID);
            this._isMounted = true;
        }

        this._roster = payload?.roster ?? [];
        this._metric = payload?.metric ?? 'damage';
        this.onRequestClose = payload?.onRequestClose ?? null;

        this._applyTexts();
        this.node.active = true;
    }

    public hide(): void {
        this.node.active = false;
    }

    protected override _onAfterBuildReady(binder: UITemplateBinder): void {
        this._templateBinder = binder;

        for (const id of ['overlayMask', 'btnClose']) {
            this._bindClick(id, () => this._close());
        }
        for (const metric of Object.keys(METRIC_BUTTON_IDS) as LeaderboardMetric[]) {
            this._bindClick(METRIC_BUTTON_IDS[metric], () => this._setMetric(metric));
        }
    }

    private _setMetric(metric: LeaderboardMetric): void {
        if (metric === this._metric) return;
        this._metric = metric;
        this._applyTexts();
    }

    private _applyTexts(): void {
        const rows = buildLeaderboardRows(this._roster, this._metric, LEADERBOARD_PANEL_ROWS);
        this._templateBinder?.setTextsByPath(buildLeaderboardPanelTexts(rows, this._metric));
    }

    private _close(): void {
        if (this.onRequestClose) {
            this.onRequestClose();
            return;
        }
        this.hide();
    }

    private _bindClick(id: string, handler: () => void): void {
        const button: Button | null = this._templateBinder?.getButton(id) ?? null;
        if (!button) return;
        button.node.on(Button.EventType.CLICK, handler, this);
    }
}
