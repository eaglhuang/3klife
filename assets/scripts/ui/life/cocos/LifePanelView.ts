// @spec-source → QSOC-01 第 4.2、4.4 節（常駐地圖鈕、時段徽章、切換面板）；PROG-2-10214
/**
 * LifePanelView — ScenePanelController 的 Cocos 畫面端
 *
 * 純邏輯與版面矩形全在 ScenePanelController／life-ui-layout.json（錨點＋相對比例，含直式覆蓋）；
 * 這裡只負責把矩形畫成節點：
 *  - 左下常駐地圖鈕、右上時段徽章；
 *  - 底部抽屜：四個分頁（地圖、最近、收藏、找人）、列表、回大廳鈕、找人搜尋框；
 *  - 列表列走固定大小的節點池（上限 = 當下可見列數＋1），翻頁／換分頁只改內容，不新增節點；
 *  - 文字全走 i18n key（t 由外部注入）。
 * 滑動／滾輪捲動列表；長按場景列＝收藏。
 */
import { Color, EditBox, EventMouse, EventTouch, Label, Node, UITransform } from 'cc';
import type { PanelRow, ScenePanelController, ScenePanelView } from '../ScenePanelController';
import type { Rect } from '../ScenePanelController';
import type { SceneSwitchResult } from '../SceneSwitchService';
import { fitLabel, makeBox, makeLabel, newUiNode, placeBox, setBoxColor } from './LifeUiKit';

export type Translate = (key: string, ...args: string[]) => string;

interface RowNode {
    root: Node;
    bg: Node;
    title: Label;
    sub: Label;
    right: Label;
    row: PanelRow | null;
    synthetic: 'backToAreas' | null;
    downAt: number;
    downY: number;
    dragged: boolean;
}

const C_PANEL = new Color(28, 32, 44, 244);
const C_ROW = new Color(54, 62, 84, 255);
const C_ROW_CUR = new Color(92, 78, 40, 255);
const C_TAB = new Color(40, 46, 64, 255);
const C_TAB_ON = new Color(200, 150, 60, 255);
const C_FAB = new Color(214, 160, 60, 255);
const C_BADGE = new Color(20, 24, 36, 220);
const C_BACK = new Color(150, 70, 60, 255);
const C_SCRIM = new Color(0, 0, 0, 110);
const C_TEXT = new Color(255, 255, 255, 255);
const C_SUB = new Color(190, 200, 220, 255);
const LONG_PRESS_MS = 500;
const DRAG_PX = 12;

export interface LifePanelHooks {
    t: Translate;
    /** 切換場景成功後（面板已收起）通知外層換畫面 */
    onSwitched: (result: SceneSwitchResult) => void;
}

export class LifePanelView {
    private readonly fab: Node;
    private readonly fabLabel: Label;
    private readonly badge: Node;
    private readonly badgeLabel: Label;
    private readonly scrim: Node;
    private readonly drawer: Node;
    private readonly tabNodes: Array<{ root: Node; label: Label }> = [];
    private readonly backBtn: Node;
    private readonly backLabel: Label;
    private readonly searchBox: Node;
    private readonly searchEdit: EditBox;
    private readonly searchPlaceholder: Label;
    private readonly searchText: Label;
    private readonly emptyLabel: Label;
    private readonly rowPool: RowNode[] = [];
    private readonly listArea: Node;
    private w = 0;
    private h = 0;
    private scroll = 0;
    private lastTab = '';
    private lastArea: string | null = null;
    private wheelAcc = 0;
    private lastView: ScenePanelView | null = null;

    public constructor(
        private readonly root: Node,
        private readonly ctrl: ScenePanelController,
        private readonly hooks: LifePanelHooks,
    ) {
        this.scrim = makeBox(root, 'LifeScrim', C_SCRIM);
        this.scrim.on(Node.EventType.TOUCH_END, () => { this.ctrl.close(); this.refresh(); });

        this.drawer = makeBox(root, 'LifeDrawer', C_PANEL);
        this.drawer.on(Node.EventType.TOUCH_START, (e: EventTouch) => e.propagationStopped = true);
        this.drawer.on(Node.EventType.TOUCH_END, (e: EventTouch) => e.propagationStopped = true);

        for (let i = 0; i < 4; i++) {
            const tab = makeBox(this.drawer, `Tab${i}`, C_TAB);
            const label = makeLabel(tab, 'Text', 24, C_TEXT);
            this.tabNodes.push({ root: tab, label });
            tab.on(Node.EventType.TOUCH_END, () => {
                const id = this.ctrl.getView().tabs[i]?.id;
                if (id) { this.ctrl.setTab(id); this.scroll = 0; this.refresh(); }
            });
        }

        this.backBtn = makeBox(this.drawer, 'BackToLobby', C_BACK);
        this.backLabel = makeLabel(this.backBtn, 'Text', 24, C_TEXT);
        this.backBtn.on(Node.EventType.TOUCH_END, () => { this.ctrl.backToLobby(); });

        this.searchBox = makeBox(this.drawer, 'SearchBox', new Color(12, 14, 22, 255));
        const ph = makeLabel(this.searchBox, 'Placeholder', 22, new Color(150, 160, 180, 255), 'left');
        const tx = makeLabel(this.searchBox, 'Text', 22, C_TEXT, 'left');
        tx.string = '';
        this.searchPlaceholder = ph;
        this.searchText = tx;
        this.searchEdit = this.searchBox.addComponent(EditBox);
        this.searchEdit.textLabel = tx;
        this.searchEdit.placeholderLabel = ph;
        this.searchEdit.maxLength = 12;
        this.searchBox.on(EditBox.EventType.TEXT_CHANGED, (eb: EditBox) => {
            this.ctrl.setQuery(eb.string);
            this.scroll = 0;
            this.refresh();
        });

        this.listArea = newUiNode('LifeList', this.drawer);
        this.emptyLabel = makeLabel(this.drawer, 'Empty', 26, C_SUB);

        this.fab = makeBox(root, 'LifeMapFab', C_FAB);
        this.fabLabel = makeLabel(this.fab, 'Text', 26, new Color(40, 24, 8, 255));
        this.fab.on(Node.EventType.TOUCH_END, () => { this.ctrl.toggle(); this.refresh(); });

        this.badge = makeBox(root, 'LifeSlotBadge', C_BADGE);
        this.badgeLabel = makeLabel(this.badge, 'Text', 26, C_TEXT);

        this.root.on(Node.EventType.MOUSE_WHEEL, this.onWheel, this);
        this.drawer.on(Node.EventType.MOUSE_WHEEL, this.onWheel, this);
    }

    /** 目前列表節點池大小（驗收：反覆切換分頁不增長） */
    public get rowNodeCount(): number { return this.rowPool.length; }
    public get shownRowCount(): number { return this.rowPool.filter((r) => r.root.active).length; }
    public get isOpen(): boolean { return this.ctrl.isOpen; }
    public get view(): ScenePanelView | null { return this.lastView; }

    public setSize(w: number, h: number): void {
        this.w = w;
        this.h = h;
        this.ctrl.setViewport(w, h);
        this.refresh();
    }

    private ox(): number { return -this.w / 2; }
    private oy(): number { return -this.h / 2; }

    private rowAt(i: number): RowNode {
        while (this.rowPool.length <= i) this.rowPool.push(this.createRow(this.rowPool.length));
        return this.rowPool[i];
    }

    private createRow(idx: number): RowNode {
        const root = newUiNode(`Row${idx}`, this.listArea);
        const bg = makeBox(root, 'Bg', C_ROW);
        const title = makeLabel(bg, 'Title', 26, C_TEXT, 'left');
        const sub = makeLabel(bg, 'Sub', 20, C_SUB, 'left');
        const right = makeLabel(bg, 'Right', 20, new Color(255, 214, 120, 255), 'right');
        const rn: RowNode = { root, bg, title, sub, right, row: null, synthetic: null, downAt: 0, downY: 0, dragged: false };
        bg.on(Node.EventType.TOUCH_START, (e: EventTouch) => { rn.downAt = Date.now(); rn.downY = e.getUILocation().y; rn.dragged = false; });
        bg.on(Node.EventType.TOUCH_MOVE, (e: EventTouch) => {
            const dy = e.getUILocation().y - rn.downY;
            if (Math.abs(dy) > DRAG_PX) rn.dragged = true;
            if (rn.dragged) {
                const rowH = this.lastView?.layout.rowHeight ?? 56;
                const steps = Math.trunc(dy / rowH);
                if (steps !== 0) { this.scrollBy(-steps); rn.downY += steps * rowH; }
            }
        });
        bg.on(Node.EventType.TOUCH_END, () => this.onRowTap(rn));
        return rn;
    }

    private onRowTap(rn: RowNode): void {
        if (rn.dragged) return;
        if (rn.synthetic === 'backToAreas') {
            this.ctrl.backToAreas();
            this.scroll = 0;
            this.refresh();
            return;
        }
        const row = rn.row;
        if (!row) return;
        if (Date.now() - rn.downAt >= LONG_PRESS_MS && row.favoritable) {
            this.ctrl.longPressRow(row);
            this.refresh();
            return;
        }
        const result = this.ctrl.tapRow(row);
        if (result && result.ok) this.hooks.onSwitched(result);
        this.scroll = 0;
        this.refresh();
    }

    private onWheel(e: EventMouse): void {
        this.wheelAcc += e.getScrollY();
        if (Math.abs(this.wheelAcc) >= 60) {
            this.scrollBy(this.wheelAcc > 0 ? -1 : 1);
            this.wheelAcc = 0;
        }
    }

    private scrollBy(rows: number): void {
        this.scroll += rows;
        this.refresh();
    }

    /** 重畫：只改節點內容與位置，不新增節點（列池依可見列數長大後固定） */
    public refresh(): void {
        if (this.w <= 0) return;
        const t = this.hooks.t;
        const view = this.ctrl.getView();
        this.lastView = view;
        const L = view.layout;
        const ox = this.ox();
        const oy = this.oy();

        // 常駐地圖鈕、時段徽章
        this.place(this.fab, L.mapFab);
        fitLabel(this.fabLabel, L.mapFab.w, L.mapFab.h, 4);
        this.fabLabel.string = t('life.panel.mapButton');
        this.place(this.badge, L.slotBadge);
        fitLabel(this.badgeLabel, L.slotBadge.w, L.slotBadge.h, 6);
        this.badgeLabel.string = t('life.panel.slotBadge', t(view.seasonKey), t(view.slotKey));

        // 抽屜
        const open = view.open;
        this.scrim.active = open;
        this.drawer.active = open;
        this.fab.active = !open; // 抽屜開著時地圖鈕會蓋住第一個分頁，先收起
        placeBox(this.scrim, ox, oy, this.w, this.h);
        if (!open) return;
        this.place(this.drawer, L.scenePanel);

        // 分頁
        const tabW = L.tabBar.w / view.tabs.length;
        view.tabs.forEach((tab, i) => {
            const n = this.tabNodes[i];
            placeBox(n.root, L.tabBar.x + tabW * i + 2, L.tabBar.y + 2, tabW - 4, L.tabBar.h - 4);
            setBoxColor(n.root, tab.selected ? C_TAB_ON : C_TAB);
            fitLabel(n.label, tabW - 4, L.tabBar.h - 4, 4);
            n.label.string = t(tab.labelKey);
        });

        // 回大廳
        placeBox(this.backBtn, L.backToLobby.x, L.backToLobby.y, L.backToLobby.w, L.backToLobby.h);
        fitLabel(this.backLabel, L.backToLobby.w, L.backToLobby.h, 6);
        this.backLabel.string = t('life.panel.backToLobby');

        // 找人搜尋框
        this.searchBox.active = view.showSearch;
        if (view.showSearch) {
            placeBox(this.searchBox, L.searchBox.x, L.searchBox.y, L.searchBox.w, L.searchBox.h);
            fitLabel(this.searchPlaceholder, L.searchBox.w, L.searchBox.h, 12);
            fitLabel(this.searchText, L.searchBox.w, L.searchBox.h, 12);
            this.searchEdit.placeholder = t('life.panel.find.placeholder');
            this.searchPlaceholder.string = t('life.panel.find.placeholder');
        }

        // 列表
        if (view.tab !== this.lastTab || view.selectedAreaNameKey !== this.lastArea) {
            this.scroll = 0;
            this.lastTab = view.tab;
            this.lastArea = view.selectedAreaNameKey;
        }
        this.layoutRows(view, t);
    }

    private layoutRows(view: ScenePanelView, t: Translate): void {
        const L = view.layout;
        const list = L.list;
        const cols = Math.max(1, view.gridColumns);
        const rowH = L.rowHeight;
        // 「回到分區」做成列表最前面的一列（直式分頁在上方，沒有多的頂部位置）
        const items: Array<{ row: PanelRow | null; synthetic: 'backToAreas' | null }> = [];
        if (view.canBackToAreas) items.push({ row: null, synthetic: 'backToAreas' });
        for (const r of view.rows) items.push({ row: r, synthetic: null });

        const visRows = Math.max(1, L.visibleRows);
        const perPage = visRows * cols;
        const maxScroll = Math.max(0, Math.ceil(items.length / cols) - visRows);
        this.scroll = Math.max(0, Math.min(maxScroll, this.scroll));
        const startIdx = this.scroll * cols;
        const count = Math.min(perPage, Math.max(0, items.length - startIdx));

        this.emptyLabel.node.active = items.length === 0 && view.emptyKey !== null;
        if (this.emptyLabel.node.active) {
            this.emptyLabel.node.setPosition(list.x, list.y + list.h / 2 - 20, 0);
            this.emptyLabel.node.getComponent(UITransform)!.setContentSize(list.w, 40);
            this.emptyLabel.string = t(view.emptyKey!);
        }

        const cellW = list.w / cols;
        for (let i = 0; i < Math.max(count, this.rowPool.length); i++) {
            if (i >= count) {
                if (i < this.rowPool.length) this.rowPool[i].root.active = false;
                continue;
            }
            const rn = this.rowAt(i);
            const item = items[startIdx + i];
            rn.root.active = true;
            rn.row = item.row;
            rn.synthetic = item.synthetic;
            const col = i % cols;
            const rowIdx = Math.floor(i / cols);
            const rx = list.x + col * cellW;
            const ry = list.y + list.h - (rowIdx + 1) * rowH;
            rn.root.setPosition(rx, ry, 0);
            rn.root.getComponent(UITransform)!.setContentSize(cellW, rowH);
            placeBox(rn.bg, 2, 2, cellW - 4, rowH - 4);
            const inner = cellW - 4;
            const row = item.row;
            let title: string;
            let sub = '';
            let right = '';
            let current = false;
            if (!row) {
                title = t('life.panel.backToAreas');
            } else {
                title = row.titleText ?? t(row.titleKey, ...row.titleArgKeys.map((k) => t(k)));
                if (row.subtitleKey) {
                    const args = [...(row.subtitleArgKeys ?? []).map((k) => t(k)), ...(row.subtitleRaw ?? [])];
                    sub = t(row.subtitleKey, ...args);
                }
                const marks: string[] = [];
                if (row.badges.includes('favorite')) marks.push('★');
                if (row.badges.includes('friend')) marks.push(t('life.panel.find.friendBoost'));
                if (row.badges.includes('underConstruction')) marks.push(t('life.scene.underConstruction'));
                if (row.badges.includes('current')) { marks.push(t('life.panel.current')); current = true; }
                right = marks.join(' ');
            }
            setBoxColor(rn.bg, current ? C_ROW_CUR : C_ROW);
            const hasSub = sub !== '';
            const rightW = right ? Math.min(inner * 0.45, 260) : 0;
            fitLabel(rn.title, inner - rightW, hasSub ? rowH * 0.58 : rowH, 14);
            rn.title.node.setPosition(14, hasSub ? rowH * 0.4 : 0, 0);
            rn.title.string = title;
            rn.sub.node.active = hasSub;
            if (hasSub) {
                fitLabel(rn.sub, inner - rightW, rowH * 0.4, 14);
                rn.sub.node.setPosition(14, 2, 0);
                rn.sub.string = sub;
            }
            rn.right.node.active = right !== '';
            if (right) {
                rn.right.node.setPosition(inner - rightW - 12, 0, 0);
                rn.right.node.getComponent(UITransform)!.setContentSize(rightW, rowH - 4);
                rn.right.string = right;
            }
        }
    }

    private place(n: Node, r: Rect): void {
        placeBox(n, r.x + this.ox(), r.y + this.oy(), r.w, r.h);
    }
}
