// @spec-source → 武將人物介面規格書 (doc_ui_0012)；戰法詳情子視窗（PROG-2-技頁戰法詳情）
/**
 * DetailSubWindow — 通用詳情子視窗（標題、類型、內文；點遮罩或 × 關閉）。
 *
 * - 不綁任何業務資料：戰法、奧義、裝備、狀態圖示都可以傳入同樣的三段文字使用。
 * - 手機記憶體優先：同一個實例只建一次節點，之後只換文字與顯示狀態，不重複 new 節點。
 * - 不載入圖檔：遮罩與面板用 Graphics 畫出，避免多佔圖集。
 *
 * Unity 對照：像一個可重用的 Dialog Prefab，Open 時填資料、Close 時 SetActive(false)。
 */
import { Color, Graphics, Label, Node, UITransform } from 'cc';

export interface DetailSubWindowContent {
    title: string;
    kindLabel: string;
    body: string;
}

const PANEL_W = 560;
const PANEL_H = 640;
const PADDING = 28;
const CLOSE_SIZE = 56;
const MASK_COLOR = new Color(0, 0, 0, 160);
const PANEL_COLOR = new Color(30, 26, 20, 245);
const BORDER_COLOR = new Color(200, 160, 80, 255);
const TITLE_COLOR = new Color(240, 200, 110, 255);
const KIND_COLOR = new Color(190, 180, 160, 255);
const BODY_COLOR = new Color(235, 230, 220, 255);

export class DetailSubWindow {
    private _root: Node | null = null;
    private _titleLabel: Label | null = null;
    private _kindLabel: Label | null = null;
    private _bodyLabel: Label | null = null;

    /** @param host 要掛載子視窗的父節點（通常是 Canvas），子視窗會蓋在最上層 */
    constructor(private readonly _host: Node) {}

    get isOpen(): boolean {
        return this._root?.active === true;
    }

    open(content: DetailSubWindowContent): void {
        this._ensureBuilt();
        if (!this._root || !this._titleLabel || !this._kindLabel || !this._bodyLabel) return;
        this._titleLabel.string = content.title;
        this._kindLabel.string = content.kindLabel;
        this._bodyLabel.string = content.body;
        this._root.active = true;
        this._root.setSiblingIndex(this._host.children.length);
    }

    close(): void {
        if (this._root) this._root.active = false;
    }

    /** 銷毀節點；子視窗關閉後不再使用時呼叫（例如子面板 onUnmount）。 */
    destroy(): void {
        this._root?.destroy();
        this._root = null;
        this._titleLabel = null;
        this._kindLabel = null;
        this._bodyLabel = null;
    }

    private _ensureBuilt(): void {
        if (this._root) return;
        const hostSize = this._host.getComponent(UITransform);
        const width = hostSize?.width ?? PANEL_W;
        const height = hostSize?.height ?? PANEL_H;

        const root = this._newNode('DetailSubWindow', this._host, width, height);
        this._root = root;

        // 遮罩：全螢幕半透明黑底，點擊即關閉
        const mask = this._newNode('DetailMask', root, width, height);
        this._drawRect(mask, width, height, MASK_COLOR, null);
        mask.on(Node.EventType.TOUCH_END, () => this.close(), this);

        // 面板：兄弟節點、位於遮罩之上，點面板不會冒泡到遮罩
        const panel = this._newNode('DetailPanel', root, PANEL_W, PANEL_H);
        this._drawRect(panel, PANEL_W, PANEL_H, PANEL_COLOR, BORDER_COLOR);
        panel.on(Node.EventType.TOUCH_END, () => { /* 吃掉點擊，不關閉 */ }, this);

        const halfW = PANEL_W / 2;
        const halfH = PANEL_H / 2;
        this._titleLabel = this._addLabel(panel, 'DetailTitle', PANEL_W - PADDING * 2 - CLOSE_SIZE, 48, 34, TITLE_COLOR, 'center', 0, halfH - 52);
        this._kindLabel = this._addLabel(panel, 'DetailKind', PANEL_W - PADDING * 2, 30, 22, KIND_COLOR, 'center', 0, halfH - 100);
        this._bodyLabel = this._addLabel(panel, 'DetailBody', PANEL_W - PADDING * 2, PANEL_H - 200, 24, BODY_COLOR, 'left', 0, halfH - 130, true);

        // 關閉鈕：用觸控事件而非 Button，免依賴 Sprite 轉場
        const close = this._newNode('DetailClose', panel, CLOSE_SIZE, CLOSE_SIZE);
        close.setPosition(halfW - PADDING - CLOSE_SIZE / 2, halfH - PADDING - CLOSE_SIZE / 2, 0);
        // Cocos 新建 Label 預設文字是 "label"，這裡必須明確設成關閉符號
        this._addLabel(close, 'DetailCloseLabel', CLOSE_SIZE, CLOSE_SIZE, 40, TITLE_COLOR, 'center', 0, 0).string = '×';
        close.on(Node.EventType.TOUCH_END, () => this.close(), this);

        root.active = false;
    }

    private _newNode(name: string, parent: Node, width: number, height: number): Node {
        const node = new Node(name);
        node.layer = parent.layer;
        node.parent = parent;
        node.addComponent(UITransform).setContentSize(width, height);
        return node;
    }

    private _drawRect(node: Node, width: number, height: number, fill: Color, border: Color | null): void {
        const g = node.addComponent(Graphics);
        g.fillColor = fill;
        g.roundRect(-width / 2, -height / 2, width, height, 16);
        g.fill();
        if (border) {
            g.strokeColor = border;
            g.lineWidth = 3;
            g.roundRect(-width / 2, -height / 2, width, height, 16);
            g.stroke();
        }
    }

    private _addLabel(
        parent: Node,
        name: string,
        width: number,
        height: number,
        fontSize: number,
        color: Color,
        align: 'left' | 'center',
        x: number,
        y: number,
        multiline = false,
    ): Label {
        const node = this._newNode(name, parent, width, height);
        node.setPosition(x, y, 0);
        // 多行內文從上緣往下長，錨點放在頂端，內容變長時不會蓋到標題
        if (multiline) node.getComponent(UITransform)?.setAnchorPoint(0.5, 1);
        const label = node.addComponent(Label);
        label.fontSize = fontSize;
        label.lineHeight = fontSize + 10;
        label.color = color;
        label.horizontalAlign = align === 'left' ? Label.HorizontalAlign.LEFT : Label.HorizontalAlign.CENTER;
        label.verticalAlign = multiline ? Label.VerticalAlign.TOP : Label.VerticalAlign.CENTER;
        label.overflow = multiline ? Label.Overflow.RESIZE_HEIGHT : Label.Overflow.SHRINK;
        label.cacheMode = Label.CacheMode.NONE;
        return label;
    }
}
