import { _decorator, Color, Component, Label, Node, UITransform } from 'cc';
import { year1BarFillWidth, type Year1GoalsPanelView } from '../core/Year1GoalsController';
import type { ThemeService } from '../core/ThemeService';
import type { PanelTranslate } from './BondingAndEpithetPanel';

const { ccclass, property } = _decorator;

/** 軌道寬度還沒排版出來時（Widget 尚未生效）的墊底寬度，依 year1-goals-main.json 的 760 寬面板推算 */
const FALLBACK_TRACK_WIDTH = 490;

/**
 * 大廳「首年目標 X/6」進度條（PROG-2-10062）
 * - 版面由 UCUF 畫面規格（year1-goals-screen）管理，節點由宿主依 id 綁進來；本元件只負責填文字、填色寬度與按鈕顯示。
 * - 顏色走 settle.text.heading / value 與 settle.button.gold token（經 setServices 注入 ThemeService；沒給就用墊底色）。
 * - 只重用既有節點、不建立新節點，省手機記憶體。
 */
@ccclass('Year1GoalsPanel')
export class Year1GoalsPanel extends Component {
    @property(Label)
    public progressLabel: Label | null = null;

    @property(Label)
    public hintLabel: Label | null = null;

    @property(Node)
    public barTrack: Node | null = null;

    @property(Node)
    public barFill: Node | null = null;

    @property(Node)
    public nextButton: Node | null = null;

    private _t: PanelTranslate = (key) => key;
    private _theme: ThemeService | null = null;
    private _last: Year1GoalsPanelView | null = null;

    public setServices(t: PanelTranslate, theme: ThemeService | null): void {
        this._t = t;
        this._theme = theme;
        this.applyThemeTokens();
        if (this._last) this.refresh(this._last);
    }

    protected onLoad(): void {
        this.applyThemeTokens();
    }

    public applyThemeTokens(): void {
        const token = (key: string, fallback: string): string => this._theme?.token<string>(key) ?? fallback;
        if (this.progressLabel) this.progressLabel.color = new Color().fromHEX(token('settle.text.heading', '#8A4B12'));
        if (this.hintLabel) this.hintLabel.color = new Color().fromHEX(token('settle.text.value', '#3B2410'));
    }

    /** 套用 view：文字、填色寬度、按鈕；沒有導向功能或該年已過就隱藏按鈕／整塊 */
    public refresh(view: Year1GoalsPanelView): void {
        this._last = view;
        this.node.active = view.visible;
        if (!view.visible) return;
        if (this.progressLabel) this.progressLabel.string = view.progressText;
        if (this.hintLabel) this.hintLabel.string = view.hintText;
        if (this.nextButton) this.nextButton.active = view.nextAction !== null;
        this.applyBar(view.ratio);
    }

    /** 軌道寬度取實際排版後的 UITransform；填色貼左，寬度＝軌道×完成比例 */
    public applyBar(ratio: number): void {
        const fill = this.barFill;
        if (!fill) return;
        const trackWidth = this.barTrack?.getComponent(UITransform)?.width || FALLBACK_TRACK_WIDTH;
        const width = year1BarFillWidth(trackWidth, ratio);
        fill.active = width > 0;
        const transform = fill.getComponent(UITransform);
        if (transform && width > 0) transform.width = width;
    }
}
