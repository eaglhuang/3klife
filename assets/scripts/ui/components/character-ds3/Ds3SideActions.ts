// @spec-source → 武將人物介面規格書.md (doc_ui_0012)；UI-2-0167
/**
 * Ds3SideActions — 人物頁立繪左側的動作按鈕。
 *
 * character_v3 版面沒有武將日誌、寄宿戰魂、版本圖鑑的位置，這些入口掛在 host 上，
 * 排在「傳」徽章下方；這一欄不隨分頁切換，也不會壓到右欄內容。
 */
import { Button, Color, Graphics, Label, Node, UIOpacity, UITransform } from 'cc';

const COLUMN = { x: -887, firstY: 380, stepY: -52, width: 104, height: 40, radius: 8 };
const FILL_COLOR = new Color(18, 26, 24, 230);
const BORDER_COLOR = new Color(134, 225, 165, 160);
const TEXT_COLOR = new Color(226, 240, 230, 255);
const FONT_SIZE = 18;
const DISABLED_OPACITY = 110;
const ENABLED_OPACITY = 255;

/** 取得（或建立）左側動作按鈕；index 決定由上往下第幾格 */
export function ensureDs3SideAction(host: Node, name: string, text: string, index: number): Button {
    const existing = host.getChildByName(name)?.getComponent(Button);
    if (existing) return existing;

    const node = new Node(name);
    node.layer = host.layer;
    node.parent = host;
    node.setPosition(COLUMN.x, COLUMN.firstY + COLUMN.stepY * index, 0);
    node.addComponent(UITransform).setContentSize(COLUMN.width, COLUMN.height);
    node.addComponent(UIOpacity);

    const graphics = node.addComponent(Graphics);
    graphics.fillColor = FILL_COLOR;
    graphics.strokeColor = BORDER_COLOR;
    graphics.lineWidth = 2;
    graphics.roundRect(-COLUMN.width / 2, -COLUMN.height / 2, COLUMN.width, COLUMN.height, COLUMN.radius);
    graphics.fill();
    graphics.stroke();

    const labelNode = new Node('Label');
    labelNode.layer = host.layer;
    labelNode.parent = node;
    labelNode.addComponent(UITransform).setContentSize(COLUMN.width, COLUMN.height);
    const label = labelNode.addComponent(Label);
    label.fontSize = FONT_SIZE;
    label.lineHeight = COLUMN.height;
    label.color = TEXT_COLOR;
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER;
    label.string = text;

    return node.addComponent(Button);
}

/** 不可點時要看得出來：這顆按鈕沒有轉場貼圖，用透明度表示 */
export function setDs3SideActionEnabled(button: Button, enabled: boolean): void {
    button.interactable = enabled;
    const opacity = button.node.getComponent(UIOpacity);
    if (opacity) opacity.opacity = enabled ? ENABLED_OPACITY : DISABLED_OPACITY;
}
