// @spec-source docs/cross-reference-index.md
/**
 * SeasonReportComposite — 季結戰報彈窗（PROG-2-0963）
 *
 * 畫面規格：ui-spec/screens/season-report-screen.json。
 * 列資料與文字由 SeasonReportPanel 純邏輯產生；這裡只負責 mount、套文字與關閉。
 *
 * Unity 對照：像一個 Popup Prefab 的 Controller，資料由 Presenter 算好，這裡只 label.text = ... 並綁按鈕。
 */
import { _decorator, Button } from 'cc';
import { CompositePanel } from '../core/CompositePanel';
import type { UITemplateBinder } from '../core/UITemplateBinder';
import { buildSeasonReportPanelTexts } from '../../core/systems/SeasonReportPanel';
import type { QuarterlyBattleReportRow } from '../../core/systems/RetireReviewCopy';

const { ccclass } = _decorator;

const SCREEN_ID = 'season-report-screen';

export interface SeasonReportOpenPayload {
    /** 季結後的季節字串，例如「第 2 年 春季」；由呼叫端用 seasonText 算好 */
    seasonLabel: string;
    /** 季結 payload 的 quarterlyReports */
    reports: readonly QuarterlyBattleReportRow[];
    onRequestClose?: () => void;
}

@ccclass('SeasonReportComposite')
export class SeasonReportComposite extends CompositePanel {
    public onRequestClose: (() => void) | null = null;

    private _templateBinder: UITemplateBinder | null = null;
    private _payload: SeasonReportOpenPayload | null = null;
    private _isMounted = false;

    public async show(payload?: SeasonReportOpenPayload): Promise<void> {
        if (!this._isMounted) {
            await this.mount(SCREEN_ID);
            this._isMounted = true;
        }

        this._payload = payload ?? { seasonLabel: '', reports: [] };
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
    }

    private _applyTexts(): void {
        const payload = this._payload;
        if (!payload) return;
        this._templateBinder?.setTextsByPath(buildSeasonReportPanelTexts(payload.seasonLabel, payload.reports));
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
