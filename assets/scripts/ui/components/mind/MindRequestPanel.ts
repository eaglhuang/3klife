// @spec-source → 武將心智提案 §2.6 主動請求與信箱（PROG-2-9150 MIND-2）
/**
 * 武將信箱面板（程式碼建節點，不走 UCUF 畫面規格）：右上角「信箱 n」入口＋半透明全螢幕面板，
 * 一列一封信（誰・種類、內容、按鈕或武將反應句）。資料與動作全由 host 回呼提供，面板不碰 GameSession。
 * Unity 對照：像一個 RuntimePanel（code-first UI），Presenter 是 LobbyScene 傳進來的 host 回呼。
 */
import { BlockInputEvents, Button, Color, Graphics, HorizontalTextAlignment, Label, Node, UITransform, VerticalTextAlignment, Widget } from 'cc';
import type { MindRequest, MindResolveResult } from '../../../core/mind/MindTypes';
import { buildMindRequestRows, mindBadgeText, type MindRequestRowView } from './MindRequestView';

export interface MindRequestPanelHost {
    mailbox: () => MindRequest[];
    nameOf: (generalId: string) => string;
    markRead: (id: string) => void;
    resolve: (id: string, accept: boolean) => Promise<MindResolveResult>;
    /** 面板建好或重畫後，讓外面把節點拉到最上層 */
    bringToFront?: (node: Node) => void;
}

const PANEL_W = 900;
const ROW_H = 150;
const MAX_ROWS = 5;

function makeLabel(parent: Node, name: string, text: string, size: number, color: Color, w: number, h: number, x: number, y: number, align = HorizontalTextAlignment.LEFT): Label {
    const node = new Node(name);
    parent.addChild(node);
    node.setPosition(x, y, 0);
    node.addComponent(UITransform).setContentSize(w, h);
    const label = node.addComponent(Label);
    label.string = text;
    label.fontSize = size;
    label.lineHeight = size + 6;
    label.color = color;
    label.horizontalAlign = align;
    label.verticalAlign = VerticalTextAlignment.CENTER;
    label.overflow = Label.Overflow.SHRINK;
    label.enableWrapText = true;
    return label;
}

function fillRect(node: Node, w: number, h: number, color: Color): void {
    const g = node.getComponent(Graphics) ?? node.addComponent(Graphics);
    g.clear();
    g.fillColor = color;
    g.rect(-w / 2, -h / 2, w, h);
    g.fill();
}

function makeButton(parent: Node, name: string, text: string, w: number, h: number, x: number, y: number, bg: Color, onClick: () => void): Node {
    const node = new Node(name);
    parent.addChild(node);
    node.setPosition(x, y, 0);
    node.addComponent(UITransform).setContentSize(w, h);
    fillRect(node, w, h, bg);
    makeLabel(node, 'Text', text, 26, new Color(255, 255, 255, 255), w, h, 0, 0, HorizontalTextAlignment.CENTER);
    node.addComponent(Button);
    node.on(Button.EventType.CLICK, onClick);
    return node;
}

export class MindRequestPanel {
    public readonly entry: Node;
    public readonly panel: Node;
    private readonly _badge: Label;
    private readonly _list: Node;
    private _open = false;
    private _busy = false;

    public constructor(private readonly _host: MindRequestPanelHost, parent: Node) {
        this.entry = new Node('BtnMindMailbox');
        parent.addChild(this.entry);
        this.entry.addComponent(UITransform).setContentSize(150, 56);
        fillRect(this.entry, 150, 56, new Color(120, 70, 30, 230));
        this._badge = makeLabel(this.entry, 'Text', '信箱', 28, new Color(255, 240, 200, 255), 150, 56, 0, 0, HorizontalTextAlignment.CENTER);
        const widget = this.entry.addComponent(Widget);
        widget.isAlignTop = true; widget.isAlignRight = true; widget.top = 150; widget.right = 24;
        this.entry.addComponent(Button);
        this.entry.on(Button.EventType.CLICK, () => { this.toggle(); });

        this.panel = new Node('MindMailboxPanel');
        parent.addChild(this.panel);
        this.panel.addComponent(UITransform).setContentSize(1920, 1080);
        const full = this.panel.addComponent(Widget);
        full.isAlignLeft = full.isAlignRight = full.isAlignTop = full.isAlignBottom = true;
        full.left = full.right = full.top = full.bottom = 0;
        this.panel.addComponent(BlockInputEvents);
        const dim = new Node('Dim');
        this.panel.addChild(dim);
        dim.addComponent(UITransform).setContentSize(1920, 1080);
        fillRect(dim, 1920, 1080, new Color(0, 0, 0, 170));
        const sheet = new Node('Sheet');
        this.panel.addChild(sheet);
        sheet.addComponent(UITransform).setContentSize(PANEL_W, ROW_H * MAX_ROWS + 110);
        fillRect(sheet, PANEL_W, ROW_H * MAX_ROWS + 110, new Color(48, 34, 24, 245));
        makeLabel(sheet, 'Title', '武將信箱', 36, new Color(255, 224, 160, 255), 400, 50, 0, (ROW_H * MAX_ROWS) / 2 + 30, HorizontalTextAlignment.CENTER);
        makeButton(sheet, 'BtnMindClose', '關閉', 120, 50, PANEL_W / 2 - 80, (ROW_H * MAX_ROWS) / 2 + 30, new Color(90, 60, 40, 255), () => { this.close(); });
        this._list = new Node('List');
        sheet.addChild(this._list);
        this.panel.active = false;
        this.refresh();
    }

    public get isOpen(): boolean { return this._open; }

    public open(): void {
        this._open = true;
        this.refresh();
        this.panel.active = true;
        this._host.bringToFront?.(this.entry);
        this._host.bringToFront?.(this.panel);
    }

    public close(): void {
        this._open = false;
        this.panel.active = false;
        this.refresh();
    }

    public toggle(): void {
        if (this._open) this.close(); else this.open();
    }

    /** 換季、讀檔、回應之後重畫：徽章數字與列表 */
    public refresh(): void {
        const requests = this._host.mailbox();
        const pending = requests.filter((r) => r.status === 'PENDING').length;
        this._badge.string = mindBadgeText(pending);
        this.entry.active = requests.length > 0;
        if (!this._open) return;
        for (const r of requests.slice(0, MAX_ROWS)) if (r.status === 'PENDING' && !r.read) this._host.markRead(r.id);
        const rows = buildMindRequestRows(requests.slice(0, MAX_ROWS), this._host.nameOf);
        this._list.removeAllChildren();
        rows.forEach((row, i) => this._drawRow(row, i));
    }

    private _drawRow(row: MindRequestRowView, index: number): void {
        const y = (ROW_H * MAX_ROWS) / 2 - ROW_H * (index + 0.5);
        const node = new Node(`MindRow-${index}`);
        this._list.addChild(node);
        node.setPosition(0, y, 0);
        node.addComponent(UITransform).setContentSize(PANEL_W - 40, ROW_H - 10);
        fillRect(node, PANEL_W - 40, ROW_H - 10, row.pending ? new Color(86, 62, 40, 255) : new Color(62, 50, 40, 255));
        const head = row.major ? `${row.kindLabel}（重大）` : row.kindLabel;
        makeLabel(node, 'Head', `${head}　${row.statusLabel}`, 26, row.major ? new Color(255, 200, 90, 255) : new Color(230, 210, 170, 255), 700, 34, -60, ROW_H / 2 - 28);
        makeLabel(node, 'Body', row.text, 24, new Color(245, 240, 230, 255), PANEL_W - 80, 60, 0, 8);
        if (row.pending) {
            row.buttons.forEach((b, bi) => {
                makeButton(node, `BtnMindReply-${index}-${b.accept ? 'yes' : 'no'}`, b.label, 120, 44, (PANEL_W - 40) / 2 - 80 - bi * 140, -ROW_H / 2 + 30,
                    b.accept ? new Color(60, 120, 70, 255) : new Color(130, 60, 50, 255), () => { void this._answer(row.id, b.accept); });
            });
        } else if (row.reply) {
            makeLabel(node, 'Reply', `「${row.reply}」`, 24, new Color(180, 230, 190, 255), PANEL_W - 80, 40, 0, -ROW_H / 2 + 30);
        }
    }

    private async _answer(id: string, accept: boolean): Promise<void> {
        if (this._busy) return;
        this._busy = true;
        try {
            await this._host.resolve(id, accept);
        } finally {
            this._busy = false;
            this.refresh();
        }
    }
}
