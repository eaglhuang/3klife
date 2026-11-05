// @spec-source → 血統樹14人UI規格書；character_v3 命分頁左區（bloodline-fullscreen）；UI-2-0168
/**
 * Ds3BloodlineTree — 人物頁命分頁的左區血統樹。
 *
 * 轉換器只抓預設分頁，命分頁才出現的左區不會進版面檔，所以在 host 上用程式建出節點；
 * 祖先資料、點擊與連線都交給既有的 BloodlineTreePanel，這裡只負責版型。
 *
 * Unity 對照：像一支 runtime 組 UI 的 Builder，節點命名照 BloodlineTreePanel 要求的 Prefab 結構。
 */
import { BlockInputEvents, Color, Graphics, Label, Node, UITransform } from 'cc';
import { treeCardNodeName } from '../../../core/systems/BloodlineTreeBinding';
import { BloodlineTreePanel } from '../../panels/BloodlineTreePanel';

export const DS3_BLOODLINE_TREE_NODE_NAME = 'Ds3BloodlineTree';

/** 左區佔畫面 0～1190 px；host 座標以畫面中心為原點，其餘座標相對左區中心 */
const REGION = { x: -365, width: 1190, height: 1080 };
const LABEL_COLUMN_X = -405;
const CARDS_CENTER_X = 115;
const TITLE = { text: '家族血統樹', y: 480, width: 640, height: 40, fontSize: 26, color: '#FFE088' };

const ROWS = [
    { row: 1, container: 'Gen1Container', count: 8, step: 115, y: 380, width: 108, height: 96, zh: '曾祖父母', sub: '(8人)', color: '#8C8575' },
    { row: 2, container: 'Gen2Container', count: 4, step: 230, y: 210, width: 170, height: 96, zh: '祖父母', sub: '(4人)', color: '#B0A880' },
    { row: 3, container: 'Gen3Container', count: 2, step: 460, y: 40, width: 210, height: 96, zh: '父母', sub: '(2人)', color: '#C8B87A' },
] as const;
const SUBJECT = { y: -150, width: 240, height: 120, sub: '(1人)', zh: '本代', color: '#FFE088' };
const LEGEND = {
    y: -490,
    step: 150,
    items: [
        { text: '藍·武力', color: '#6FA8FF' },
        { text: '粉·傳授', color: '#FF9BBA' },
        { text: '綠·戰法', color: '#86E1A5' },
        { text: '紫·運氣', color: '#C494FF' },
        { text: '白·靈獸', color: '#D0D0D0' },
        { text: '紅·體魄', color: '#FF8D6E' },
    ],
};

const BACKGROUND = new Color(20, 18, 16, 255);
const CARD_FILL = new Color(38, 32, 24, 255);
const CARD_BORDER = new Color(77, 70, 53, 255);
const SUBJECT_BORDER = new Color(255, 224, 136, 255);
const CARD_TEXT = new Color(232, 228, 220, 255);
const CARD_FONT_SIZE = 14;
const CARD_RADIUS = 10;

function addNode(parent: Node, name: string, x: number, y: number, width: number, height: number): Node {
    const node = new Node(name);
    node.layer = parent.layer;
    node.parent = parent;
    node.setPosition(x, y, 0);
    node.addComponent(UITransform).setContentSize(width, height);
    return node;
}

function addLabel(parent: Node, name: string, text: string, x: number, y: number, width: number, height: number, fontSize: number, color: Color): Label {
    const label = addNode(parent, name, x, y, width, height).addComponent(Label);
    label.overflow = Label.Overflow.CLAMP;
    label.enableWrapText = true;
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER;
    label.fontSize = fontSize;
    label.lineHeight = Math.round(fontSize * 1.3);
    label.color = color;
    label.string = text;
    return label;
}

function fillRoundRect(node: Node, width: number, height: number, fill: Color, border: Color): void {
    const graphics = node.addComponent(Graphics);
    graphics.fillColor = fill;
    graphics.strokeColor = border;
    graphics.lineWidth = 2;
    graphics.roundRect(-width / 2, -height / 2, width, height, CARD_RADIUS);
    graphics.fill();
    graphics.stroke();
}

function buildGenerationRow(root: Node, config: (typeof ROWS)[number]): void {
    addLabel(root, `GenLabel_${config.row}`, `${config.zh}\n${config.sub}`, LABEL_COLUMN_X, config.y, 90, 60, 15, new Color().fromHEX(config.color));
    const container = addNode(root, config.container, CARDS_CENTER_X, config.y, config.step * config.count, config.height);
    for (let i = 0; i < config.count; i++) {
        const x = (i - (config.count - 1) / 2) * config.step;
        const card = addNode(container, treeCardNodeName(config.row, i), x, 0, config.width, config.height);
        fillRoundRect(card, config.width, config.height, CARD_FILL, CARD_BORDER);
        addLabel(card, 'Txt', '—', 0, 0, config.width - 8, config.height - 8, CARD_FONT_SIZE, CARD_TEXT);
    }
}

function buildTree(host: Node): Node {
    const root = addNode(host, DS3_BLOODLINE_TREE_NODE_NAME, REGION.x, 0, REGION.width, REGION.height);
    root.addComponent(BlockInputEvents);
    const background = root.addComponent(Graphics);
    background.fillColor = BACKGROUND;
    background.rect(-REGION.width / 2, -REGION.height / 2, REGION.width, REGION.height);
    background.fill();

    addLabel(root, 'TreeTitle', TITLE.text, CARDS_CENTER_X, TITLE.y, TITLE.width, TITLE.height, TITLE.fontSize, new Color().fromHEX(TITLE.color));
    addNode(root, 'LineGraphics', 0, 0, REGION.width, REGION.height);
    ROWS.forEach((config) => buildGenerationRow(root, config));

    addLabel(root, 'GenLabel_Subject', `${SUBJECT.zh}\n${SUBJECT.sub}`, LABEL_COLUMN_X, SUBJECT.y, 90, 60, 15, new Color().fromHEX(SUBJECT.color));
    const subject = addNode(root, 'TargetPortrait', CARDS_CENTER_X, SUBJECT.y, SUBJECT.width, SUBJECT.height);
    fillRoundRect(subject, SUBJECT.width, SUBJECT.height, CARD_FILL, SUBJECT_BORDER);
    addLabel(subject, 'Txt', '', 0, 0, SUBJECT.width - 12, SUBJECT.height - 12, 28, new Color().fromHEX(SUBJECT.color));

    LEGEND.items.forEach((item, i) => {
        const x = CARDS_CENTER_X + (i - (LEGEND.items.length - 1) / 2) * LEGEND.step;
        addLabel(root, `Legend_${i}`, `● ${item.text}`, x, LEGEND.y, LEGEND.step, 24, 14, new Color().fromHEX(item.color));
    });

    const panel = root.addComponent(BloodlineTreePanel);
    panel.gen1Container = root.getChildByName('Gen1Container');
    panel.gen2Container = root.getChildByName('Gen2Container');
    panel.gen3Container = root.getChildByName('Gen3Container');
    return root;
}

/** 取得（或建立）血統樹面板，並填入本代姓名與家族門第 */
export function ensureDs3BloodlineTree(host: Node, subjectName: string, clanTierName: string): BloodlineTreePanel {
    const root = host.getChildByName(DS3_BLOODLINE_TREE_NODE_NAME) ?? buildTree(host);
    const subjectLabel = root.getChildByName('TargetPortrait')?.getChildByName('Txt')?.getComponent(Label);
    if (subjectLabel) subjectLabel.string = subjectName;
    const titleLabel = root.getChildByName('TreeTitle')?.getComponent(Label);
    if (titleLabel) titleLabel.string = `${TITLE.text}｜門第：${clanTierName}`;
    return root.getComponent(BloodlineTreePanel) as BloodlineTreePanel;
}
