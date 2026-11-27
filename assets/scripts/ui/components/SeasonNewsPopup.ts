// @spec-source → 每季小報規格書 (doc_spec_1345)；PROG-2-10150
/**
 * SeasonNewsPopup — 季末《本季大事記》小報（View 層）。
 *
 * - 內容由 SeasonNews 純邏輯備好：三行頭條＋一位武將的吐槽（頭像／對話框重用 PopupGeneralSpeaker）。
 * - 全程式建構、只建一次：節點掛在宿主（Canvas）底下，之後每次顯示只換文字與頭像，關閉時隱藏不銷毀（物件重用）。
 * - 版面一律用「小報底板尺寸的比例」；底板大小取可視尺寸的比例，宿主尺寸變了（SIZE_CHANGED）自動重排，不寫死座標。
 * - 點任意處收起；show() 的 Promise 在收起時完成，呼叫端接著排下一個彈窗（換季彈窗佇列，見規格 §5）。
 *
 * Unity 對照：像一個掛在 Canvas 上、RectTransform 全用 anchor 比例的 NewspaperPanel prefab，Show() 回傳 awaitable。
 */
import { Color, Graphics, Label, Node, Tween, tween, UITransform, Vec3, Widget } from 'cc';
import { services } from '../../core/managers/ServiceLoader';
import { formatSeasonNewsHeadline, type SeasonNewsHeadline } from '../../core/systems/SeasonNews';
import { hidePopupSpeaker, showPopupSpeaker, type PopupSpeakerPlacement } from '../core/PopupGeneralSpeaker';

/** 小報底板佔可視尺寸的比例 */
export const SEASON_NEWS_PAPER_RATIO = { width: 0.62, height: 0.78 } as const;
/** 頭條各行中心高度（底板高度比例，0＝底、1＝頂） */
const HEADLINE_Y = [0.68, 0.54, 0.40] as const;
const SPEAKER_SLOT = 'news';
const SPEAKER_PLACEMENT: PopupSpeakerPlacement = {
    avatarX: 0.12, avatarY: 0.17, avatarSize: 0.22,
    bubble: { x: 0.58, y: 0.17, width: 0.7, height: 0.2 },
};

const SHADE = new Color(0, 0, 0, 150);
const PAPER_FILL = new Color(238, 224, 190, 255);
const PAPER_BORDER = new Color(96, 66, 30, 255);
const INK = new Color(48, 34, 20, 255);
const INK_SOFT = new Color(112, 88, 54, 255);
const ACCENT = new Color(168, 48, 36, 255);

export interface SeasonNewsView {
    headlines: readonly SeasonNewsHeadline[];
    /** 第幾期（換季後的 totalSeasonsElapsed） */
    issueNo: number;
    /** 剛結束那一季的名稱，例如「第 1 年春」 */
    seasonLabel: string;
    /** 吐槽者；null 就不畫頭像與對話框 */
    roasterId: string | null;
    roastLine: string;
}

type StopEvent = { propagationStopped?: boolean };

interface PlacedLabel {
    node: Node;
    label: Label;
    /** 中心點與寬度（底板比例）、字級（底板高度比例） */
    fx: number;
    fy: number;
    fw: number;
    fh: number;
    size: number;
}

export class SeasonNewsPopup {
    private _root: Node | null = null;
    private _paper!: Node;
    private _paperGraphics!: Graphics;
    private _shade!: Graphics;
    private _rules!: Graphics;
    private _masthead!: PlacedLabel;
    private _edition!: PlacedLabel;
    private _hint!: PlacedLabel;
    private _rows: PlacedLabel[] = [];
    private _resolve: (() => void) | null = null;
    private _host: Node | null = null;

    get active(): boolean { return !!this._root?.isValid && this._root.active; }

    /** 掛在 host（一般傳 Canvas 節點）最上層顯示；同時只會有一張，重複呼叫會先收起前一張 */
    show(host: Node, view: Readonly<SeasonNewsView>): Promise<void> {
        this.dismiss();
        const root = this._ensureBuilt(host);
        const t = (key: string, ...args: string[]) => services().i18n.t(key, ...args);
        this._masthead.label.string = t('ui.seasonNews.title');
        this._edition.label.string = t('ui.seasonNews.edition', String(view.issueNo), view.seasonLabel);
        this._hint.label.string = t('ui.seasonNews.hint');
        this._rows.forEach((row, i) => {
            const headline = view.headlines[i];
            row.node.active = !!headline;
            row.label.string = headline ? `◆ ${formatSeasonNewsHeadline(headline, t)}` : '';
        });
        root.active = true;
        root.setSiblingIndex(host.children.length - 1);
        this._layout();
        if (view.roasterId) {
            showPopupSpeaker(this._paper, SPEAKER_SLOT, { generalId: view.roasterId, line: view.roastLine }, SPEAKER_PLACEMENT);
        } else {
            hidePopupSpeaker(this._paper, SPEAKER_SLOT);
        }
        // 進場：小報由小放大，一次性
        Tween.stopAllByTarget(this._paper);
        this._paper.setScale(new Vec3(0.86, 0.86, 1));
        tween(this._paper).to(0.22, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' }).start();
        return new Promise<void>((resolve) => { this._resolve = resolve; });
    }

    /** 收起（不銷毀節點，下次重用）並完成 show() 的 Promise */
    dismiss(): void {
        if (this._paper?.isValid) Tween.stopAllByTarget(this._paper);
        if (this._root?.isValid) this._root.active = false;
        const done = this._resolve;
        this._resolve = null;
        done?.();
    }

    /** 場景離開時真正銷毀 */
    dispose(): void {
        this.dismiss();
        if (this._host?.isValid) this._host.off(Node.EventType.SIZE_CHANGED, this._layout, this);
        if (this._root?.isValid) this._root.destroy();
        this._root = null;
        this._host = null;
    }

    private _ensureBuilt(host: Node): Node {
        if (this._root?.isValid && this._host === host) return this._root;
        if (this._root) this.dispose();
        const layer = host.layer;
        const root = new Node('SeasonNewsPopup');
        root.layer = layer;
        root.addComponent(UITransform);
        // 吃掉點擊並收起：遮罩與底板都一樣，避免點穿到大廳
        root.on(Node.EventType.TOUCH_END, (event?: StopEvent) => { if (event) event.propagationStopped = true; this.dismiss(); });
        const widget = root.addComponent(Widget);
        widget.isAlignLeft = widget.isAlignRight = widget.isAlignTop = widget.isAlignBottom = true;
        widget.left = widget.right = widget.top = widget.bottom = 0;

        const shadeNode = this._child(root, 'Shade');
        this._shade = shadeNode.addComponent(Graphics);

        const paper = this._child(root, 'Paper');
        this._paper = paper;
        this._paperGraphics = paper.addComponent(Graphics);
        this._rules = this._child(paper, 'Rules').addComponent(Graphics);

        this._masthead = this._placed(paper, 'Masthead', 0.5, 0.9, 0.9, 0.13, 0.085, INK, Label.HorizontalAlign.CENTER);
        this._edition = this._placed(paper, 'Edition', 0.5, 0.815, 0.9, 0.06, 0.036, INK_SOFT, Label.HorizontalAlign.CENTER);
        this._rows = HEADLINE_Y.map((fy, i) => this._placed(paper, `Headline${i + 1}`, 0.5, fy, 0.86, 0.12, 0.044, INK, Label.HorizontalAlign.LEFT));
        this._hint = this._placed(paper, 'Hint', 0.5, 0.035, 0.9, 0.05, 0.034, INK_SOFT, Label.HorizontalAlign.CENTER);

        host.addChild(root);
        host.on(Node.EventType.SIZE_CHANGED, this._layout, this);
        this._root = root;
        this._host = host;
        return root;
    }

    private _child(parent: Node, name: string): Node {
        const node = new Node(name);
        node.layer = parent.layer;
        node.addComponent(UITransform);
        parent.addChild(node);
        return node;
    }

    private _placed(parent: Node, name: string, fx: number, fy: number, fw: number, fh: number, size: number, color: Color, align: number): PlacedLabel {
        const node = this._child(parent, name);
        const label = node.addComponent(Label);
        label.color = color;
        label.overflow = Label.Overflow.SHRINK;
        label.enableWrapText = true;
        label.horizontalAlign = align;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        const font = services().i18n.getFont('body');
        if (font) label.font = font;
        return { node, label, fx, fy, fw, fh, size };
    }

    /** 依宿主可視尺寸重排：底板取比例大小，子節點全部用底板尺寸的比例定位 */
    private _layout(): void {
        if (!this._root?.isValid || !this._host?.isValid) return;
        const hostSize = this._host.getComponent(UITransform)?.contentSize;
        if (!hostSize || hostSize.width <= 0 || hostSize.height <= 0) return;
        const w = Math.round(hostSize.width * SEASON_NEWS_PAPER_RATIO.width);
        const h = Math.round(hostSize.height * SEASON_NEWS_PAPER_RATIO.height);

        this._root.getComponent(UITransform)!.setContentSize(hostSize.width, hostSize.height);
        this._shade.clear();
        this._shade.fillColor = SHADE;
        this._shade.rect(-hostSize.width / 2, -hostSize.height / 2, hostSize.width, hostSize.height);
        this._shade.fill();

        this._paper.getComponent(UITransform)!.setContentSize(w, h);
        this._paperGraphics.clear();
        this._paperGraphics.fillColor = PAPER_FILL;
        this._paperGraphics.strokeColor = PAPER_BORDER;
        this._paperGraphics.lineWidth = Math.max(3, Math.round(h * 0.006));
        this._paperGraphics.roundRect(-w / 2, -h / 2, w, h, Math.round(h * 0.02));
        this._paperGraphics.fill();
        this._paperGraphics.stroke();

        // 報頭下方一粗一細兩條分隔線
        const at = (fx: number, fy: number): [number, number] => [(fx - 0.5) * w, (fy - 0.5) * h];
        this._rules.clear();
        this._rules.strokeColor = ACCENT;
        this._rules.lineWidth = Math.max(3, Math.round(h * 0.007));
        const [lx0, ly0] = at(0.05, 0.775);
        const [lx1] = at(0.95, 0.775);
        this._rules.moveTo(lx0, ly0);
        this._rules.lineTo(lx1, ly0);
        this._rules.stroke();
        this._rules.lineWidth = Math.max(1, Math.round(h * 0.002));
        const [, ly1] = at(0.05, 0.765);
        this._rules.moveTo(lx0, ly1);
        this._rules.lineTo(lx1, ly1);
        this._rules.stroke();

        for (const item of [this._masthead, this._edition, this._hint, ...this._rows]) {
            const [x, y] = at(item.fx, item.fy);
            item.node.setPosition(x, y, 0);
            item.node.getComponent(UITransform)!.setContentSize(Math.round(item.fw * w), Math.round(item.fh * h));
            item.label.fontSize = Math.max(14, Math.round(item.size * h));
            item.label.lineHeight = Math.round(item.label.fontSize * 1.3);
        }
    }
}
