// @spec-source → 戰場軍勢糧草常駐顯示與出牌不足提示規格書.md (doc_spec_1341) §5.2；PROG-2-10104
/**
 * DeployShortSheet — 出牌不足說明面板：標題＋一句話、需要／現有／缺口表、從哪扣、怎麼補、按鈕。
 *
 * 只負責「畫出來」：文字全由呼叫端用 i18n 組好傳入（本檔不寫死中文，也不判斷資源），
 * 判定在 SortieDeployScripts.describeDeployShortfall / deployHowToFix。
 * 重用節點：整張面板只建一次，之後 show() 只改字與位置；長英文用 RESIZE_HEIGHT 換行，面板高度跟內容走。
 *
 * Unity 對照：像一個 Popup prefab，Presenter 傳 ViewModel 給它，它不碰遊戲資料。
 */
import { _decorator, Color, Component, Graphics, Label, Node, UITransform, Widget } from 'cc';

const { ccclass } = _decorator;

const NODE_NAME = 'DeployShortSheet';
const BASE_WIDTH = 800;
const WIDTH_RATIO = 0.56;
const PAD = 24;
const MAX_HOW = 5;
const MAX_BUTTONS = 4;

const COLOR_TITLE = new Color(255, 190, 90, 255);
const COLOR_TEXT = new Color(250, 240, 222, 255);
const COLOR_DIM = new Color(200, 186, 160, 255);
const COLOR_RED = new Color(240, 96, 84, 255);
const COLOR_GREEN = new Color(110, 214, 120, 255);
const COLOR_CELL = new Color(26, 18, 12, 255);

export interface DeploySheetRow {
    name: string;
    need: string;
    have: string;
    gap: string;
    /** 這一列夠付：現有與缺口標綠，否則標紅 */
    ok: boolean;
}

export interface DeploySheetButton {
    label: string;
    primary?: boolean;
    onClick: () => void;
}

export interface DeploySheetSpec {
    title: string;
    summary: string;
    headers: { need: string; have: string; gap: string };
    rows: DeploySheetRow[];
    source: string;
    how: string[];
    buttons: DeploySheetButton[];
}

interface Cell {
    bg: Node;
    labels: Label[];
}

function newLabel(parent: Node, name: string, size: number, color: Color, align: number): Label {
    const node = new Node(name);
    node.layer = parent.layer;
    parent.addChild(node);
    const ui = node.addComponent(UITransform);
    ui.setAnchorPoint(0, 1);
    ui.setContentSize(200, size + 6);
    const label = node.addComponent(Label);
    label.fontSize = size;
    label.lineHeight = size + 6;
    label.color = color;
    label.horizontalAlign = align;
    label.verticalAlign = Label.VerticalAlign.TOP;
    label.overflow = Label.Overflow.RESIZE_HEIGHT;
    label.enableWrapText = true;
    return label;
}

@ccclass('DeployShortSheet')
export class DeployShortSheet extends Component {
    /** 在 host 底下取得或建立說明面板（重複呼叫回同一個），預設隱藏 */
    public static mount(host: Node): DeployShortSheet {
        const existing = host.getChildByName(NODE_NAME);
        const old = existing?.isValid ? existing.getComponent(DeployShortSheet) : null;
        if (old) return old;
        const node = new Node(NODE_NAME);
        node.layer = host.layer;
        host.addChild(node);
        const comp = node.addComponent(DeployShortSheet);
        comp.build();
        return comp;
    }

    private bg: Graphics | null = null;
    private title: Label | null = null;
    private summary: Label | null = null;
    private headers: Label[] = [];
    private rows: Cell[] = [];
    private source: Label | null = null;
    private how: Label[] = [];
    private sep: Graphics | null = null;
    private buttons: { node: Node; bg: Graphics; label: Label }[] = [];
    private handlers: (() => void)[] = [];
    private wired = false;
    private lastSpec: DeploySheetSpec | null = null;

    public get visible(): boolean {
        return this.node.active;
    }

    private build(): void {
        const node = this.node;
        const ui = node.addComponent(UITransform);
        ui.setAnchorPoint(0.5, 1);
        const widget = node.addComponent(Widget);
        widget.isAlignTop = true;
        widget.isAlignHorizontalCenter = true;
        widget.top = 330;
        widget.horizontalCenter = 0;

        const bgNode = new Node('Bg');
        bgNode.layer = node.layer;
        node.addChild(bgNode);
        bgNode.addComponent(UITransform).setAnchorPoint(0.5, 1);
        this.bg = bgNode.addComponent(Graphics);

        this.title = newLabel(node, 'Title', 30, COLOR_TITLE, Label.HorizontalAlign.LEFT);
        this.title.isBold = true;
        this.summary = newLabel(node, 'Summary', 22, COLOR_TEXT, Label.HorizontalAlign.LEFT);
        for (let i = 0; i < 3; i++) this.headers.push(newLabel(node, `Head${i}`, 18, COLOR_DIM, Label.HorizontalAlign.LEFT));
        for (let r = 0; r < 2; r++) {
            const bgN = new Node(`RowBg${r}`);
            bgN.layer = node.layer;
            node.addChild(bgN);
            bgN.addComponent(UITransform).setAnchorPoint(0, 1);
            bgN.addComponent(Graphics);
            const labels: Label[] = [];
            for (let c = 0; c < 4; c++) labels.push(newLabel(node, `Row${r}_${c}`, 22, COLOR_TEXT, Label.HorizontalAlign.LEFT));
            this.rows.push({ bg: bgN, labels });
        }
        this.source = newLabel(node, 'Source', 18, COLOR_DIM, Label.HorizontalAlign.LEFT);
        const sepNode = new Node('Sep');
        sepNode.layer = node.layer;
        node.addChild(sepNode);
        sepNode.addComponent(UITransform).setAnchorPoint(0, 1);
        this.sep = sepNode.addComponent(Graphics);
        for (let i = 0; i < MAX_HOW; i++) this.how.push(newLabel(node, `How${i}`, 21, COLOR_TEXT, Label.HorizontalAlign.LEFT));
        for (let i = 0; i < MAX_BUTTONS; i++) {
            const bn = new Node(`Btn${i}`);
            bn.layer = node.layer;
            node.addChild(bn);
            bn.addComponent(UITransform).setAnchorPoint(0, 1);
            const bbg = bn.addComponent(Graphics);
            const label = newLabel(bn, 'Text', 22, COLOR_TEXT, Label.HorizontalAlign.CENTER);
            label.overflow = Label.Overflow.NONE;
            label.isBold = true;
            label.verticalAlign = Label.VerticalAlign.CENTER;
            label.node.getComponent(UITransform)!.setAnchorPoint(0.5, 0.5);
            bn.on(Node.EventType.TOUCH_END, () => this.handlers[i]?.(), this);
            this.buttons.push({ node: bn, bg: bbg, label });
        }
        node.active = false;
    }

    public hide(): void {
        this.node.active = false;
        this.lastSpec = null;
    }

    /** 目前顯示的面板內容（實跑檢查用）；沒開時 null */
    public current(): DeploySheetSpec | null {
        return this.node.active ? this.lastSpec : null;
    }

    public show(spec: DeploySheetSpec): void {
        if (!this.wired) {
            this.wired = true;
            this.node.on(Node.EventType.TOUCH_END, (ev: { propagationStopped: boolean }) => { ev.propagationStopped = true; });
        }
        this.lastSpec = spec;
        const host = this.node.parent?.getComponent(UITransform);
        const hostW = host?.width ?? 1920;
        const width = Math.min(BASE_WIDTH, Math.max(560, hostW * WIDTH_RATIO), hostW * 0.96);
        const inner = width - PAD * 2;
        this.node.getComponent(UITransform)!.setContentSize(width, 100);
        this.node.active = true;
        this.node.setSiblingIndex(this.node.parent!.children.length - 1);

        let y = -PAD + 4;
        const put = (label: Label, text: string, x: number, w: number): number => {
            label.node.active = true;
            label.string = text;
            label.node.getComponent(UITransform)!.setContentSize(w, 30);
            label.updateRenderData(true);
            label.node.setPosition(-width / 2 + x, y, 0);
            return label.node.getComponent(UITransform)!.height;
        };
        const hide = (labels: Label[], from: number): void => {
            for (let i = from; i < labels.length; i++) labels[i].node.active = false;
        };

        y -= put(this.title!, spec.title, PAD, inner) + 8;
        y -= put(this.summary!, spec.summary, PAD, inner) + 12;

        // 表格：名稱 34%、需要／現有／缺口各 22%
        const colX = [PAD + 12, PAD + inner * 0.36, PAD + inner * 0.58, PAD + inner * 0.8];
        const colW = [inner * 0.34, inner * 0.2, inner * 0.2, inner * 0.2];
        const heads = [spec.headers.need, spec.headers.have, spec.headers.gap];
        heads.forEach((text, i) => put(this.headers[i], text, colX[i + 1], colW[i + 1]));
        y -= this.headers[0].node.getComponent(UITransform)!.height + 4;
        this.rows.forEach((cell, r) => {
            const row = spec.rows[r];
            cell.bg.active = !!row;
            for (const l of cell.labels) l.node.active = !!row;
            if (!row) return;
            const cells = [row.name, row.need, row.have, row.gap];
            const rowH = 40;
            const g = cell.bg.getComponent(Graphics)!;
            g.clear();
            g.fillColor = COLOR_CELL;
            g.roundRect(0, -rowH, inner, rowH, 6);
            g.fill();
            cell.bg.setPosition(-width / 2 + PAD, y, 0);
            cells.forEach((text, c) => {
                const label = cell.labels[c];
                label.color = c < 2 ? COLOR_TEXT : (row.ok ? COLOR_GREEN : COLOR_RED);
                if (c === 2 && !row.ok) label.color = COLOR_RED;
                label.node.active = true;
                label.string = text;
                label.node.getComponent(UITransform)!.setContentSize(colW[c], 30);
                label.updateRenderData(true);
                label.node.setPosition(-width / 2 + colX[c], y - 8, 0);
            });
            y -= rowH + 6;
        });
        y -= 4;
        y -= put(this.source!, spec.source, PAD, inner) + 8;

        const sepG = this.sep!;
        sepG.clear();
        sepG.strokeColor = new Color(120, 96, 52, 200);
        sepG.lineWidth = 1;
        sepG.moveTo(0, 0);
        sepG.lineTo(inner, 0);
        sepG.stroke();
        this.sep!.node.setPosition(-width / 2 + PAD, y, 0);
        y -= 10;

        spec.how.slice(0, MAX_HOW).forEach((text, i) => {
            y -= put(this.how[i], `• ${text}`, PAD, inner) + 6;
        });
        hide(this.how, Math.min(spec.how.length, MAX_HOW));
        y -= 8;

        // 按鈕：由左排到右，放不下就換行
        const btns = spec.buttons.slice(0, MAX_BUTTONS);
        this.handlers = btns.map((b) => () => { b.onClick(); });
        let bx = 0;
        let rowTop = y;
        const bh = 48;
        btns.forEach((b, i) => {
            const view = this.buttons[i];
            view.node.active = true;
            view.label.string = b.label;
            view.label.color = b.primary ? new Color(40, 22, 6, 255) : COLOR_TEXT;
            view.label.updateRenderData(true);
            const bw = Math.min(inner, Math.max(120, view.label.node.getComponent(UITransform)!.width + 40));
            if (bx > 0 && bx + bw > inner) {
                bx = 0;
                rowTop -= bh + 10;
            }
            view.node.getComponent(UITransform)!.setContentSize(bw, bh);
            view.node.setPosition(-width / 2 + PAD + bx, rowTop, 0);
            view.label.node.setPosition(bw / 2, -bh / 2, 0);
            view.bg.clear();
            view.bg.fillColor = b.primary ? new Color(230, 184, 90, 255) : new Color(70, 48, 26, 255);
            view.bg.strokeColor = new Color(170, 134, 70, 255);
            view.bg.lineWidth = 2;
            view.bg.roundRect(0, -bh, bw, bh, 8);
            view.bg.fill();
            view.bg.stroke();
            bx += bw + 12;
        });
        for (let i = btns.length; i < this.buttons.length; i++) this.buttons[i].node.active = false;
        y = rowTop - bh - PAD + 6;

        const height = -y;
        this.node.getComponent(UITransform)!.setContentSize(width, height);
        const g = this.bg!;
        g.clear();
        g.fillColor = new Color(34, 24, 16, 244);
        g.strokeColor = new Color(238, 110, 96, 255);
        g.lineWidth = 3;
        g.roundRect(-width / 2, -height, width, height, 12);
        g.fill();
        g.stroke();
    }
}
