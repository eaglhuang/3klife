/**
 * GeneralDetailRecordChild
 *
 * UCUF ChildPanel — 戰績 Tab（Record，PROG-2-0081）。
 * 對應 fragment: gd-tab-record.json
 * dataSource: 'config'（名冊武將的 battleRecord，舊存檔沒有時顯示「尚未出征」）
 *
 * Unity 對照：只做 label.text = presenter 輸出；文字組合在純邏輯 buildBattleRecordTabText。
 */
import { Button, Label } from 'cc';
import type { Node } from 'cc';
import { ChildPanelBase } from '../../core/ChildPanelBase';
import type { UISkinResolver } from '../../core/UISkinResolver';
import type { UITemplateBinder } from '../../core/UITemplateBinder';
import type { GeneralConfig } from '../../../core/models/GeneralUnit';
import type { BattleRecord } from '../../../core/systems/BattleRoster';
import { buildBattleRecordTabText } from '../../../core/systems/BattleRecordStats';
import { pvpSeasonIdOf } from '../../../core/systems/BattleSeasonStats';
import { services } from '../../../core/managers/ServiceLoader';
import { UIID } from '../../../core/config/UIConfig';
import type { LobbyLeaderboardOpenPayload } from '../LobbyLeaderboardComposite';
import { UCUFLogger, LogCategory } from '../../../core/utils/UCUFLogger';

type RecordCarrier = GeneralConfig & { battleRecord?: BattleRecord };

export class GeneralDetailRecordChild extends ChildPanelBase {
    override dataSource = 'config';
    private static readonly ROOT_PATH = 'TabRecordContent';

    private _lCareer!:    Label;
    private _lWinRate!:   Label;
    private _lStats!:     Label;
    private _lMilestone!: Label;
    private _lRetire!:    Label;

    _lastData: RecordCarrier | null = null;

    constructor(hostNode: Node, skinResolver: UISkinResolver, binder: UITemplateBinder) {
        super(hostNode, skinResolver, binder);
    }

    async onMount(_spec: Record<string, unknown>): Promise<void> {
        const h = this.hostNode;
        this._lCareer    = this._label(h, 'SummaryCard/CareerValue');
        this._lWinRate   = this._label(h, 'SummaryCard/WinRateValue');
        this._lStats     = this._label(h, 'StatsCard/StatsValue');
        this._lMilestone = this._label(h, 'MilestoneCard/MilestoneValue');
        this._lRetire    = this._label(h, 'RetireCard/RetireValue');
        this._bindLeaderboardButton();
        if (this._lastData) this.onDataUpdate(this._lastData);
    }

    onDataUpdate(data: unknown): void {
        this._lastData = data as RecordCarrier;
        const text = buildBattleRecordTabText(this._lastData?.battleRecord, this._currentSeasonId());
        this._set(this._lCareer, `${text.career}\n${text.season}`);
        this._set(this._lWinRate, text.winRate);
        this._set(this._lStats, text.stats);
        this._set(this._lMilestone, text.milestones);
        this._set(this._lRetire, text.retire);
    }

    protected override _refreshLabels(): void {
        if (this._lastData) this.onDataUpdate(this._lastData);
    }

    validateDataFormat(data: unknown): string | null {
        if (!data || typeof data !== 'object') return 'data must be a GeneralConfig object';
        return null;
    }

    private _label(root: Node, path: string): Label {
        const fullPath = `${GeneralDetailRecordChild.ROOT_PATH}/${path}`;
        const label = root.getChildByPath(fullPath)?.getComponent(Label);
        if (!label) {
            UCUFLogger.error(LogCategory.LIFECYCLE, `[RecordChild] 必要 Label 缺失 ${fullPath}`);
            throw new Error(`[RecordChild] 必要 Label 缺失 ${fullPath}`);
        }
        return label;
    }

    /** 目前 PvP 賽季 ID；services 尚未就緒（預覽／單獨掛載）時回傳 undefined，本賽季行顯示「—」 */
    private _currentSeasonId(): string | undefined {
        try {
            return pvpSeasonIdOf(services().session.gameTime.totalSeasonsElapsed);
        } catch {
            return undefined;
        }
    }

    /** 戰績分頁底部的「全軍戰績排行榜」入口（PROG-2-0960）；按鈕不存在時略過，不影響分頁其他內容 */
    private _bindLeaderboardButton(): void {
        const button: Button | null = this.binder.getButton('btnLeaderboard');
        if (!button) return;
        button.node.on(Button.EventType.CLICK, this._onLeaderboardClick, this);
    }

    private _onLeaderboardClick(): void {
        const payload: LobbyLeaderboardOpenPayload = { roster: services().session.roster, metric: 'damage' };
        void services().ui.open(UIID.LobbyLeaderboard, payload);
    }

    private _set(label: Label | null, text: string): void {
        if (label) label.string = text;
    }
}
