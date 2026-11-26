// @spec-source → 武將心智提案 §2.6 主動請求與信箱（PROG-2-9150 MIND-2）
/**
 * 武將信箱面板（程式碼建節點，不走 UCUF 畫面規格）：右上角「信箱 n」入口＋半透明全螢幕面板，
 * 一列一封信（誰・種類、內容、按鈕或武將反應句）。資料與動作全由 host 回呼提供，面板不碰 GameSession。
 * Unity 對照：像一個 RuntimePanel（code-first UI），Presenter 是 LobbyScene 傳進來的 host 回呼。
 */
import { BlockInputEvents, Button, Color, Graphics, HorizontalTextAlignment, Label, Node, UITransform, VerticalTextAlignment, Widget } from 'cc';
import type { MindRequest, MindResolveResult } from '../../../core/mind/MindTypes';
import { buildMindRequestRows, mindBadgeText, type MindRequestRowView } from './MindRequestView';
import type { SeasonDigestNote } from '../../../core/systems/SeasonDigest';
import { buildDigestRows, type DigestTextLookup, type SeasonDigestRowView } from './SeasonDigestView';

export interface MindRequestPanelHost {
    mailbox: () => MindRequest[];
    nameOf: (generalId: string) => string;
    markRead: (id: string) => void;
    resolve: (id: string, accept: boolean) => Promise<MindResolveResult>;
    /** 面板建好或重畫後，讓外面把節點拉到最上層 */
    bringToFront?: (node: Node) => void;
    /** 季報紀要（首年前幾季併進信箱的純資訊報表，PROG-2-10068）；沒給就沒有紀要列 */
    digest?: () => SeasonDigestNote[];
    /** 紀要文字查表（i18n）；沒給用 zh-TW 預設 */
    lookup?: DigestTextLookup;
    /** 該紀要對應的市井奇遇是否還能抉擇（決定要不要出「去看看」） */
    encounterOpen?: (note: SeasonDigestNote) => boolean;
    /** 開信箱面板即算看過：紅點熄滅 */
    markDigestRead?: (id: string) => void;
    /** 「知道了」：把紀要移出信箱 */
    dismissDigest?: (id: string) => void;
    /** 「去看看」：宿主開三國季報；回傳後面板會收起，避免疊在季報上 */
    openDigest?: (id: string) => void;
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

/** 程式碼建的節點預設不在 UI 相機的圖層上，要整串跟著父節點的圖層才畫得出來 */
function applyLayer(node: Node, layer: number): void {
    node.layer = layer;
    for (const child of node.children) applyLayer(child, layer);
}

export class MindRequestPanel {
    public readonly entry: Node;
    public readonly panel: Node;
    private readonly _badge: Label;
    /** 未讀紅點（有待回應請求或未讀紀要時亮） */
    private readonly _dot: Node;
    private readonly _list: Node;
    private _open = false;
    private _busy = false;
    /** 剛回應的那封信：重畫時排到最上面，讓玩家看到武將的反應句 */
    private _lastAnswered = '';
    private _layer = 0;

    public constructor(private readonly _host: MindRequestPanelHost, parent: Node) {
        this.entry = new Node('BtnMindMailbox');
        parent.addChild(this.entry);
        this.entry.addComponent(UITransform).setContentSize(150, 56);
        fillRect(this.entry, 150, 56, new Color(120, 70, 30, 230));
        this._badge = makeLabel(this.entry, 'Text', '信箱', 28, new Color(255, 240, 200, 255), 150, 56, 0, 0, HorizontalTextAlignment.CENTER);
        this._dot = new Node('UnreadDot');
        this.entry.addChild(this._dot);
        this._dot.setPosition(66, 22, 0);
        this._dot.addComponent(UITransform).setContentSize(22, 22);
        const dotGraphics = this._dot.addComponent(Graphics);
        dotGraphics.fillColor = new Color(235, 50, 40, 255);
        dotGraphics.circle(0, 0, 11);
        dotGraphics.fill();
        this._dot.active = false;
        const widget = this.entry.addComponent(Widget);
        // 放右下角空白處（PROG-2-9953）：貼底欄右側、推進一季鈕（右下角 200x84）的左邊，右上角被內政／人脈面板蓋住點不到
        widget.isAlignBottom = true; widget.isAlignRight = true; widget.bottom = 38; widget.right = 250;
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
        this._layer = parent.layer;
        applyLayer(this.entry, this._layer);
        applyLayer(this.panel, this._layer);
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
        this._lastAnswered = '';
        this.panel.active = false;
        this.refresh();
    }

    public toggle(): void {
        if (this._open) this.close(); else this.open();
    }

    /** 換季、讀檔、回應之後重畫：徽章數字、紅點與列表 */
    public refresh(): void {
        const all = this._host.mailbox();
        const requests = this._lastAnswered ? [...all.filter((r) => r.id === this._lastAnswered), ...all.filter((r) => r.id !== this._lastAnswered)] : all;
        const notes = this._host.digest?.() ?? [];
        const pending = all.filter((r) => r.status === 'PENDING').length;
        const unreadNotes = notes.filter((n) => !n.read).length;
        this._badge.string = mindBadgeText(pending + unreadNotes);
        this._dot.active = pending + unreadNotes > 0;
        const show = requests.length > 0 || notes.length > 0;
        if (show && !this.entry.active) this._host.bringToFront?.(this.entry);
        this.entry.active = show;
        if (!this._open) return;
        // 待回應的請求優先；紀要最多佔 2 列，剩下的列給請求
        const noteRows = buildDigestRows(notes, this._host.lookup, this._host.encounterOpen).slice(0, Math.min(2, MAX_ROWS));
        const shownRequests = requests.slice(0, MAX_ROWS - noteRows.length);
        for (const r of shownRequests) if (r.status === 'PENDING' && !r.read) this._host.markRead(r.id);
        for (const row of noteRows) if (row.unread) this._host.markDigestRead?.(row.id);
        const rows = buildMindRequestRows(shownRequests, this._host.nameOf);
        this._list.removeAllChildren();
        rows.forEach((row, i) => this._drawRow(row, i));
        noteRows.forEach((row, i) => this._drawNoteRow(row, rows.length + i));
        applyLayer(this._list, this._layer);
        // 剛標已讀：紅點與徽章對齊
        const left = (this._host.digest?.() ?? []).filter((n) => !n.read).length;
        this._badge.string = mindBadgeText(pending + left);
        this._dot.active = pending + left > 0;
    }

    /** 紀要列：左側文字、右側「去看看」「知道了」直排（版面用相對列高，不寫死像素位置） */
    private _drawNoteRow(row: SeasonDigestRowView, index: number): void {
        const y = (ROW_H * MAX_ROWS) / 2 - ROW_H * (index + 0.5);
        const node = new Node(`DigestRow-${index}`);
        this._list.addChild(node);
        node.setPosition(0, y, 0);
        node.addComponent(UITransform).setContentSize(PANEL_W - 40, ROW_H - 10);
        fillRect(node, PANEL_W - 40, ROW_H - 10, new Color(44, 58, 70, 255));
        const rowW = PANEL_W - 40;
        const bodyW = rowW - 200;
        makeLabel(node, 'Head', `${row.kindLabel}${row.unread ? '　●' : ''}`, 24, new Color(150, 210, 240, 255), 400, 30, -rowW / 2 + 220, ROW_H / 2 - 22);
        makeLabel(node, 'Body', row.text, 22, new Color(245, 240, 230, 255), bodyW, 96, -rowW / 2 + 20 + bodyW / 2, -8);
        const btnX = rowW / 2 - 85;
        let btnY = row.canOpen ? 24 : 0;
        if (row.canOpen) {
            makeButton(node, `BtnDigestOpen-${index}`, row.openLabel, 140, 44, btnX, btnY, new Color(60, 120, 70, 255), () => { this._host.openDigest?.(row.id); });
            btnY = -30;
        }
        makeButton(node, `BtnDigestAck-${index}`, row.ackLabel, 140, 44, btnX, btnY, new Color(90, 80, 70, 255), () => { this._host.dismissDigest?.(row.id); this.refresh(); });
    }

    private _drawRow(row: MindRequestRowView, index: number): void {
        const y = (ROW_H * MAX_ROWS) / 2 - ROW_H * (index + 0.5);
        const node = new Node(`MindRow-${index}`);
        this._list.addChild(node);
        node.setPosition(0, y, 0);
        node.addComponent(UITransform).setContentSize(PANEL_W - 40, ROW_H - 10);
        fillRect(node, PANEL_W - 40, ROW_H - 10, row.pending ? new Color(86, 62, 40, 255) : new Color(62, 50, 40, 255));
        const head = row.major ? `${row.kindLabel}（重大）` : row.kindLabel;
        makeLabel(node, 'Head', `${head}　${row.statusLabel}`, 26, row.major ? new Color(255, 200, 90, 255) : new Color(230, 210, 170, 255), 700, 34, -60, ROW_H / 2 - 22);
        makeLabel(node, 'Body', row.text, 24, new Color(245, 240, 230, 255), PANEL_W - 80, 56, 0, 6);
        if (row.pending) {
            row.buttons.forEach((b, bi) => {
                makeButton(node, `BtnMindReply-${index}-${b.accept ? 'yes' : 'no'}`, b.label, 120, 44, (PANEL_W - 40) / 2 - 80 - bi * 140, -ROW_H / 2 + 28,
                    b.accept ? new Color(60, 120, 70, 255) : new Color(130, 60, 50, 255), () => { void this._answer(row.id, b.accept); });
            });
        } else if (row.reply) {
            makeLabel(node, 'Reply', `「${row.reply}」`, 24, new Color(180, 230, 190, 255), PANEL_W - 80, 40, 0, -ROW_H / 2 + 26);
        }
    }

    private async _answer(id: string, accept: boolean): Promise<void> {
        if (this._busy) return;
        this._busy = true;
        try {
            const result = await this._host.resolve(id, accept);
            if (result.ok) this._lastAnswered = id;
        } finally {
            this._busy = false;
            this.refresh();
        }
    }
}
