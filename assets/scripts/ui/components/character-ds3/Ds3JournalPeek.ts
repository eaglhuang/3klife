// @spec-source → 武將人物介面規格補遺_2026-04-14 (doc_ui_0014) §3 武將動態日誌氣泡；WBS HUM-06（PROG-2-2075）
/**
 * Ds3JournalPeek — 人物頁日誌氣泡（掛在 host 上，排在左側動作欄「武將日誌」那一列的右邊）。
 *
 * character_v3 版面沒有氣泡的位置，和 Ds3SideActions 一樣由程式建立；點氣泡開完整日誌。
 */
import { Button, Color, Graphics, Label, Node, UITransform } from 'cc';

const BUBBLE = { x: -567, y: 380, width: 520, height: 40, radius: 12 };
const FILL_COLOR = new Color(30, 24, 16, 220);
const BORDER_COLOR = new Color(214, 184, 120, 180);
const TEXT_COLOR = new Color(240, 228, 200, 255);
const FONT_SIZE = 18;

export interface Ds3JournalPeek {
    button: Button;
    label: Label;
}

/** 取得（或建立）日誌氣泡 */
export function ensureDs3JournalPeek(host: Node, name: string): Ds3JournalPeek {
    const existing = host.getChildByName(name);
    const existingButton = existing?.getComponent(Button);
    const existingLabel = existing?.getChildByName('Label')?.getComponent(Label);
    if (existingButton && existingLabel) return { button: existingButton, label: existingLabel };

    const node = new Node(name);
    node.layer = host.layer;
    node.parent = host;
    node.setPosition(BUBBLE.x, BUBBLE.y, 0);
    node.addComponent(UITransform).setContentSize(BUBBLE.width, BUBBLE.height);

    const graphics = node.addComponent(Graphics);
    graphics.fillColor = FILL_COLOR;
    graphics.strokeColor = BORDER_COLOR;
    graphics.lineWidth = 2;
    graphics.roundRect(-BUBBLE.width / 2, -BUBBLE.height / 2, BUBBLE.width, BUBBLE.height, BUBBLE.radius);
    graphics.fill();
    graphics.stroke();

    const labelNode = new Node('Label');
    labelNode.layer = host.layer;
    labelNode.parent = node;
    labelNode.addComponent(UITransform).setContentSize(BUBBLE.width - 24, BUBBLE.height);
    const label = labelNode.addComponent(Label);
    label.fontSize = FONT_SIZE;
    label.lineHeight = BUBBLE.height;
    label.color = TEXT_COLOR;
    label.horizontalAlign = Label.HorizontalAlign.LEFT;
    label.verticalAlign = Label.VerticalAlign.CENTER;
    label.overflow = Label.Overflow.SHRINK;

    return { button: node.addComponent(Button), label };
}
