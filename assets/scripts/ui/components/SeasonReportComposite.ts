// @spec-source docs/cross-reference-index.md
/**
 * SeasonReportComposite — 季結戰報彈窗（PROG-2-0963）
 *
 * 畫面規格：ui-spec/screens/season-report-screen.json。
 * 列資料與文字由 SeasonReportPanel 純邏輯產生；這裡只負責 mount、套文字與關閉。
 *
 * Unity 對照：像一個 Popup Prefab 的 Controller，資料由 Presenter 算好，這裡只 label.text = ... 並綁按鈕。
 */
import { _decorator, Button, Layout, ScrollView, UITransform } from 'cc';
import { CompositePanel } from '../core/CompositePanel';
import type { UITemplateBinder } from '../core/UITemplateBinder';
import {
    buildSeasonReportPanelRows,
    buildSeasonReportPanelTexts,
    SEASON_REPORT_ACTIONS_LABEL_PATH,
    SEASON_REPORT_EMPTY_HINT_PATH,
    SEASON_REPORT_HALL_LABEL_PATH,
    SEASON_REPORT_PANEL_ROWS,
    SEASON_REPORT_POPULATION_LABEL_PATH,
    SEASON_REPORT_VOICES_LABEL_PATH,
    seasonReportLabelHeight,
} from '../../core/systems/SeasonReportPanel';
import type { SeasonReportSection } from '../../core/systems/SeasonReportSections';
import type { QuarterlyBattleReportRow } from '../../core/systems/RetireReviewCopy';

const { ccclass } = _decorator;

const SCREEN_ID = 'season-report-screen';

export interface SeasonReportOpenPayload {
    /** 季結後的季節字串，例如「第 2 年 春季」；由呼叫端用 seasonText 算好 */
    seasonLabel: string;
    /** 季結 payload 的 quarterlyReports */
    reports: readonly QuarterlyBattleReportRow[];
    /** 本季大廳任務結算的逐筆文字（payload.hallMissionReport.lines）；沒有時不顯示該區塊 */
    hallMissionLines?: readonly string[];
    /** 下一官職會開什麼的預告一行（PROG-2-9151）；沒有時不顯示 */
    rankPreviewLine?: string;
    /** 本季行動／人口與民心／武將心聲區段（SeasonReportSections 組好；沒內容的區段不在陣列內） */
    sections?: readonly SeasonReportSection[];
    onRequestClose?: () => void;
}

const SCROLL_CONTENT_PATH = 'DialogCard/ScrollView/ScrollContent';
/** 文字區段標籤：有字就依字數撐高、沒字就隱藏（標籤是 CLAMP，不撐高會截字） */
const TEXT_SECTION_PATHS = [
    SEASON_REPORT_EMPTY_HINT_PATH,
    SEASON_REPORT_ACTIONS_LABEL_PATH,
    SEASON_REPORT_POPULATION_LABEL_PATH,
    SEASON_REPORT_VOICES_LABEL_PATH,
    SEASON_REPORT_HALL_LABEL_PATH,
] as const;

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
        this.node.setSiblingIndex(this.node.parent ? this.node.parent.children.length - 1 : 0);
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
        const hallLines = payload.hallMissionLines ?? [];
        const sections = payload.sections ?? [];
        const texts = buildSeasonReportPanelTexts(payload.seasonLabel, payload.reports, hallLines, payload.rankPreviewLine ?? '', sections);
        const binder = this._templateBinder;
        binder?.setTextsByPath(texts);
        if (!binder) return;
        for (const path of TEXT_SECTION_PATHS) {
            const node = binder.getNodeByPath(path);
            if (!node) continue;
            const text = texts[path] ?? '';
            node.active = text.length > 0;
            const transform = node.getComponent(UITransform);
            if (transform && text.length > 0) transform.setContentSize(transform.width, seasonReportLabelHeight(text));
        }
        // 精力行只列達標者：沒有的列整列隱藏，不留「—」占位
        const visibleRows = buildSeasonReportPanelRows(payload.reports).length;
        for (let i = 0; i < SEASON_REPORT_PANEL_ROWS; i += 1) {
            const row = binder.getNodeByPath(`${SCROLL_CONTENT_PATH}/Row${i}`);
            if (row) row.active = i < visibleRows;
        }
        // 內容變多時由 ScrollView 捲動；重排讓內容高度跟著可見子節點
        binder.getNodeByPath(SCROLL_CONTENT_PATH)?.getComponent(Layout)?.updateLayout(true);
        binder.getNodeByPath('DialogCard/ScrollView')?.getComponent(ScrollView)?.scrollToTop(0);
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
