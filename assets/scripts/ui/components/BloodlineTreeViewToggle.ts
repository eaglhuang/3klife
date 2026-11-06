// @spec-source → 血統理論系統.md §E #6「簡化/專家 UI 切換：預設顯示父母 2 代，點擊展開 14 人全圖」；11/06 裁決 #3；PROG-2-1899
/**
 * BloodlineTreeViewToggle — 血統樹「展開全圖／收合」切換鈕（人物頁命分頁與武將詳情血脈頁共用）。
 *
 * - 建立時把面板切到規格預設的簡化模式；沒有掛切換鈕的血統樹（大廳結緣畫面）維持專家模式。
 * - 家族階段只開放父母時，兩種模式畫面相同，按鈕隱藏。
 *
 * Unity 對照：像一個 runtime 生成的 Toggle Button，點擊時呼叫面板的 SetViewMode。
 */
import { Button, Color, Graphics, Label, Node, UITransform } from 'cc';
import {
    BLOODLINE_TREE_SPEC_DEFAULT_MODE,
    BLOODLINE_TREE_TOGGLE_LABEL,
    bloodlineTreeToggleAvailable,
} from '../../core/systems/BloodlineTreeViewMode';
import type { BloodlineTreePanel } from '../panels/BloodlineTreePanel';

export const BLOODLINE_VIEW_TOGGLE_NODE = 'ViewModeToggle';

export const BLOODLINE_VIEW_TOGGLE_SIZE = { width: 120, height: 36 } as const;
const FONT_SIZE = 16;
const RADIUS = 10;
const FILL = new Color(38, 32, 24, 255);
const BORDER = new Color(255, 224, 136, 255);
const TEXT = new Color(255, 224, 136, 255);

/** 依面板目前模式與家族階段更新按鈕文字與顯示 */
export function refreshBloodlineViewToggle(toggle: Node, panel: BloodlineTreePanel): void {
    toggle.active = bloodlineTreeToggleAvailable(panel.milestoneStage);
    const label = toggle.getChildByName('Txt')?.getComponent(Label);
    if (label) label.string = BLOODLINE_TREE_TOGGLE_LABEL[panel.viewMode];
}

/**
 * 在 parent 下建立切換鈕（已存在則沿用），並把面板切到簡化模式。
 * onChanged：模式切換後的額外刷新（例如世代標題）。
 */
export function ensureBloodlineViewToggle(
    parent: Node,
    panel: BloodlineTreePanel,
    x: number,
    y: number,
    onChanged?: () => void,
): Node {
    const existing = parent.getChildByName(BLOODLINE_VIEW_TOGGLE_NODE);
    if (existing) return existing;
    const { width, height } = BLOODLINE_VIEW_TOGGLE_SIZE;
    const toggle = new Node(BLOODLINE_VIEW_TOGGLE_NODE);
    toggle.layer = parent.layer;
    toggle.parent = parent;
    toggle.setPosition(x, y, 0);
    toggle.addComponent(UITransform).setContentSize(width, height);
    const graphics = toggle.addComponent(Graphics);
    graphics.fillColor = FILL;
    graphics.strokeColor = BORDER;
    graphics.lineWidth = 2;
    graphics.roundRect(-width / 2, -height / 2, width, height, RADIUS);
    graphics.fill();
    graphics.stroke();

    const text = new Node('Txt');
    text.layer = parent.layer;
    text.parent = toggle;
    text.addComponent(UITransform).setContentSize(width - 8, height - 4);
    const label = text.addComponent(Label);
    label.fontSize = FONT_SIZE;
    label.lineHeight = Math.round(FONT_SIZE * 1.3);
    label.color = TEXT;
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER;
    label.overflow = Label.Overflow.SHRINK;

    toggle.addComponent(Button);
    toggle.on(Button.EventType.CLICK, () => {
        panel.toggleViewMode();
        refreshBloodlineViewToggle(toggle, panel);
        onChanged?.();
    });
    panel.setViewMode(BLOODLINE_TREE_SPEC_DEFAULT_MODE);
    refreshBloodlineViewToggle(toggle, panel);
    return toggle;
}
