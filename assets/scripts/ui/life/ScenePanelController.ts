// @spec-source → Q版社會總規格書 QSOC-01 第 4.2、4.5 節（元件與版面資料檔）；PROG-2-10212
/**
 * ScenePanelController — 場景切換面板的狀態、版面計算與列表資料（純邏輯，不依賴 cc）
 *
 * 職責：
 *  1. 版面：讀 life-ui-layout.json，用「錨點＋相對比例」算出常駐地圖鈕、時段徽章、同行者列、底部抽屜與
 *     分頁／搜尋框／列表／回大廳鈕的矩形；螢幕高大於寬時套 portraitOverride（直式）。
 *  2. 狀態：抽屜開關、四分頁（地圖、最近、收藏、找人）、選中的區、搜尋字串。
 *  3. 列表資料：每列帶 i18n key（不寫死文字）、列高（≥ minPx）、點擊動作；View 只負責照著畫。
 * 不負責：節點與貼圖（View）、實際切場景（SceneSwitchService）、誰在哪（FindPersonResolver）。
 * 矩形座標：原點在螢幕左下、y 往上（和 Cocos UITransform 同向）。
 */
import layoutData from '../../../resources/data/life-ui-layout.json';
import type { SceneRegistry } from './SceneRegistry';
import type { SceneSwitchService, SceneSwitchResult } from './SceneSwitchService';
import type { FindPersonEntry, FindPersonResolver, FindResultView } from './FindPersonResolver';

// ───────────────────────────── 版面 ─────────────────────────────

export interface Rect { x: number; y: number; w: number; h: number }

export interface LifeUiComponentSpec {
    anchor: string;
    offset?: [number, number];
    sizeRel?: number;
    minPx?: number;
    widthRel?: number;
    heightRel?: number;
    mirrorable?: boolean;
    max?: number;
    tabs?: string[];
    tabsAt?: 'top' | 'bottom';
    radius?: number;
    collapsible?: boolean;
}

export interface LifeUiPartSpec { heightRel: number; minPx: number; widthRel?: number }

export interface LifeUiLayoutData {
    schema: string;
    components: Record<string, LifeUiComponentSpec>;
    panelParts: {
        tabBar: LifeUiPartSpec;
        searchBox: LifeUiPartSpec;
        row: LifeUiPartSpec;
        backToLobby: LifeUiPartSpec;
        padding: number;
    };
    map: { areaGridColumns: number };
    limits: { recentMax: number; favoritesMax: number; companionsMax: number };
    transition: { fadeOutSec: number; fadeInSec: number; maxTotalSec: number };
    portraitOverride?: Record<string, Partial<LifeUiComponentSpec>>;
}

export interface ResolvedLifeLayout {
    portrait: boolean;
    screen: Rect;
    mapFab: Rect;
    slotBadge: Rect;
    companions: Rect;
    scenePanel: Rect;
    /** 以下矩形都在面板座標（原點＝面板左下角） */
    tabBar: Rect;
    searchBox: Rect;
    list: Rect;
    backToLobby: Rect;
    rowHeight: number;
    visibleRows: number;
    tabsAt: 'top' | 'bottom';
}

const defaultLayout = (): LifeUiLayoutData => layoutData as unknown as LifeUiLayoutData;

function specFor(layout: LifeUiLayoutData, name: string, portrait: boolean): LifeUiComponentSpec {
    const base = layout.components[name];
    const override = portrait ? layout.portraitOverride?.[name] : undefined;
    return override ? { ...base, ...override } : base;
}

export interface ResolveOptions {
    /** 慣用右手玩家：常駐地圖鈕左右鏡像（QSOC-01 4.2） */
    mirror?: boolean;
    /** 找人分頁有搜尋框 */
    withSearch?: boolean;
}

export function resolveLifeUiLayout(
    viewW: number,
    viewH: number,
    layout: LifeUiLayoutData = defaultLayout(),
    options: ResolveOptions = {},
): ResolvedLifeLayout {
    const portrait = viewH > viewW;
    const shortSide = Math.min(viewW, viewH);
    const screen: Rect = { x: 0, y: 0, w: viewW, h: viewH };

    const fabSpec = specFor(layout, 'mapFab', portrait);
    const fabSize = Math.max(fabSpec.minPx ?? 0, (fabSpec.sizeRel ?? 0) * shortSide);
    const fabOff = fabSpec.offset ?? [0, 0];
    const fabX = fabOff[0] * viewW;
    const mapFab: Rect = {
        x: options.mirror && fabSpec.mirrorable ? viewW - fabX - fabSize : fabX,
        y: fabOff[1] * viewH,
        w: fabSize,
        h: fabSize,
    };

    const badgeSpec = specFor(layout, 'slotBadge', portrait);
    const badgeH = Math.max(badgeSpec.minPx ?? 0, (badgeSpec.sizeRel ?? 0) * shortSide);
    const badgeW = Math.max(badgeH * 1.6, (badgeSpec.widthRel ?? 0) * viewW);
    const badgeOff = badgeSpec.offset ?? [0, 0];
    const slotBadge: Rect = { x: viewW - badgeOff[0] * viewW - badgeW, y: viewH - badgeOff[1] * viewH - badgeH, w: badgeW, h: badgeH };

    const compSpec = specFor(layout, 'companions', portrait);
    const compSize = Math.max(compSpec.minPx ?? 0, (compSpec.sizeRel ?? 0) * shortSide);
    const compOff = compSpec.offset ?? [0, 0];
    const compMax = Math.min(compSpec.max ?? layout.limits.companionsMax, layout.limits.companionsMax);
    const companions: Rect = {
        x: compOff[0] * viewW,
        y: viewH - compOff[1] * viewH - compSize,
        w: compSize * compMax + (compMax - 1) * compSize * 0.15,
        h: compSize,
    };

    const panelSpec = specFor(layout, 'scenePanel', portrait);
    const panelH = (panelSpec.heightRel ?? 0.6) * viewH;
    const scenePanel: Rect = { x: 0, y: 0, w: viewW, h: panelH };
    const tabsAt = panelSpec.tabsAt ?? 'bottom';

    const parts = layout.panelParts;
    const pad = Math.max(8, parts.padding * shortSide);
    const px = (spec: LifeUiPartSpec): number => Math.max(spec.minPx, spec.heightRel * panelH);
    const tabH = px(parts.tabBar);
    const searchH = px(parts.searchBox);
    const backH = px(parts.backToLobby);
    const backW = Math.max(backH * 2, (parts.backToLobby.widthRel ?? 0.3) * viewW);
    const rowHeight = px(parts.row);
    const innerW = viewW - pad * 2;

    let tabBar: Rect;
    let backToLobby: Rect;
    let searchBox: Rect;
    let listTop: number;
    let listBottom: number;
    const withSearch = options.withSearch === true;

    if (tabsAt === 'bottom') {
        // 橫式：上排＝搜尋框（找人分頁）＋回大廳鈕，中間列表，最下面分頁（拇指最好按）
        tabBar = { x: 0, y: 0, w: viewW, h: tabH };
        const headerY = panelH - pad - backH;
        backToLobby = { x: viewW - pad - backW, y: headerY, w: backW, h: backH };
        searchBox = { x: pad, y: headerY, w: innerW - backW - pad, h: searchH };
        listTop = headerY - pad;
        listBottom = tabH + pad;
    } else {
        // 直式：最上面分頁，找人分頁的搜尋框在分頁下，最下排回大廳鈕
        tabBar = { x: 0, y: panelH - tabH, w: viewW, h: tabH };
        backToLobby = { x: viewW - pad - backW, y: pad, w: backW, h: backH };
        const searchTop = panelH - tabH - pad;
        searchBox = { x: pad, y: searchTop - searchH, w: innerW, h: searchH };
        listTop = withSearch ? searchBox.y - pad : searchTop;
        listBottom = backH + pad * 2;
    }
    const list: Rect = { x: pad, y: listBottom, w: innerW, h: Math.max(0, listTop - listBottom) };
    const visibleRows = Math.floor(list.h / rowHeight);
    return { portrait, screen, mapFab, slotBadge, companions, scenePanel, tabBar, searchBox, list, backToLobby, rowHeight, visibleRows, tabsAt };
}

// ───────────────────────────── 狀態與列表 ─────────────────────────────

export type PanelTab = 'map' | 'recent' | 'favorites' | 'find';
export const PANEL_TABS: readonly PanelTab[] = ['map', 'recent', 'favorites', 'find'];

export type PanelRowAction =
    | { type: 'openArea'; areaId: string }
    | { type: 'switch'; sceneId: string; slot?: number; focus?: 'center' | 'actor' | 'none'; focusGeneralId?: string }
    | { type: 'none' };

export type PanelRowBadge = 'underConstruction' | 'favorite' | 'current' | 'friend';

export interface PanelRow {
    id: string;
    kind: 'area' | 'enterArea' | 'scene' | 'recent' | 'favorite' | 'find';
    titleKey: string;
    /** 標題參數：每個都是要再翻譯的 i18n key */
    titleArgKeys: string[];
    /** find 列的名字（武將名資料，不是 key） */
    titleText?: string;
    subtitleKey?: string;
    /** 副標參數：要再翻譯的 i18n key */
    subtitleArgKeys?: string[];
    /** 副標參數：原樣字串（例如場景數） */
    subtitleRaw?: string[];
    badges: PanelRowBadge[];
    heightPx: number;
    action: PanelRowAction;
    /** 長按是否可切換收藏 */
    favoritable: boolean;
    find?: FindResultView;
}

export interface PanelTabView { id: PanelTab; labelKey: string; selected: boolean }

export interface ScenePanelView {
    open: boolean;
    tab: PanelTab;
    tabs: PanelTabView[];
    rows: PanelRow[];
    gridColumns: number;
    emptyKey: string | null;
    showSearch: boolean;
    query: string;
    selectedAreaNameKey: string | null;
    canBackToAreas: boolean;
    /** 時段徽章用：life.panel.slot.N／life.panel.season.N */
    slotKey: string;
    seasonKey: string;
    layout: ResolvedLifeLayout;
}

export interface ScenePanelPorts {
    registry: SceneRegistry;
    service: SceneSwitchService;
    resolver: FindPersonResolver;
    /** 找人名冊（WP3 接上前用假資料） */
    roster: () => readonly FindPersonEntry[];
    /** 玩家目前的人事情報 intel 值 */
    intel: () => number;
    onBackToLobby?: () => void;
    layout?: LifeUiLayoutData;
}

export class ScenePanelController {
    private _open = false;
    private _tab: PanelTab = 'map';
    private _areaId: string | null = null;
    private _query = '';
    private _slot = 1;
    private _season = 1;
    private _viewW = 1920;
    private _viewH = 1080;
    private _mirror = false;
    private readonly _layout: LifeUiLayoutData;

    public constructor(private readonly _ports: ScenePanelPorts) {
        this._layout = _ports.layout ?? defaultLayout();
    }

    public get isOpen(): boolean { return this._open; }
    public get tab(): PanelTab { return this._tab; }
    public get selectedAreaId(): string | null { return this._areaId; }

    public setViewport(w: number, h: number): void { this._viewW = w; this._viewH = h; }
    public setMirror(mirror: boolean): void { this._mirror = mirror; }
    /** 時段 0～6、季節 1～4（由生活時鐘提供） */
    public setClock(season: number, slot: number): void {
        this._season = Math.min(4, Math.max(1, Math.floor(season)));
        this._slot = Math.min(6, Math.max(0, Math.floor(slot)));
    }

    public open(): void { this._open = true; }
    public close(): void { this._open = false; }
    public toggle(): void { this._open = !this._open; }

    public setTab(tab: PanelTab): void {
        this._tab = tab;
        if (tab !== 'map') this._areaId = null;
    }

    public selectArea(areaId: string): void {
        if (this._ports.registry.getArea(areaId)) this._areaId = areaId;
    }

    public backToAreas(): void { this._areaId = null; }

    public setQuery(query: string): void { this._query = query; }

    public backToLobby(): void {
        this._open = false;
        this._ports.onBackToLobby?.();
    }

    /** 點列：開區、切場景（切完收起抽屜）。回傳切換結果，非切換動作回 null */
    public tapRow(row: PanelRow): SceneSwitchResult | null {
        const a = row.action;
        if (a.type === 'openArea') {
            this.selectArea(a.areaId);
            return null;
        }
        if (a.type === 'switch') {
            const result = this._ports.service.switchTo(a.sceneId, {
                slot: a.slot ?? this._slot,
                focus: a.focus,
                focusGeneralId: a.focusGeneralId,
            });
            if (result.ok) this._open = false;
            return result;
        }
        return null;
    }

    /** 長按場景列加入／移除收藏 */
    public longPressRow(row: PanelRow): 'added' | 'removed' | 'full' | 'unknown-scene' | null {
        if (!row.favoritable || row.action.type !== 'switch') return null;
        return this._ports.service.toggleFavorite(row.action.sceneId);
    }

    public getView(): ScenePanelView {
        const layout = resolveLifeUiLayout(this._viewW, this._viewH, this._layout, {
            mirror: this._mirror,
            withSearch: this._tab === 'find',
        });
        const rows = this._buildRows(layout.rowHeight);
        const area = this._areaId ? this._ports.registry.getArea(this._areaId) : undefined;
        let emptyKey: string | null = null;
        if (rows.length === 0) {
            if (this._tab === 'recent') emptyKey = 'life.panel.empty.recent';
            else if (this._tab === 'favorites') emptyKey = 'life.panel.empty.favorites';
            else if (this._tab === 'find') emptyKey = 'life.panel.find.noResult';
        }
        return {
            open: this._open,
            tab: this._tab,
            tabs: PANEL_TABS.map((id) => ({ id, labelKey: `life.panel.tab.${id}`, selected: id === this._tab })),
            rows,
            gridColumns: this._tab === 'map' && !this._areaId ? this._layout.map.areaGridColumns : 1,
            emptyKey,
            showSearch: this._tab === 'find',
            query: this._query,
            selectedAreaNameKey: area ? area.nameKey : null,
            canBackToAreas: this._tab === 'map' && this._areaId !== null,
            slotKey: `life.panel.slot.${this._slot}`,
            seasonKey: `life.panel.season.${this._season}`,
            layout,
        };
    }

    // ── 各分頁的列 ──

    private _buildRows(rowH: number): PanelRow[] {
        switch (this._tab) {
            case 'map': return this._areaId ? this._sceneRowsOfArea(this._areaId, rowH) : this._areaRows(rowH);
            case 'recent': return this._recentRows(rowH);
            case 'favorites': return this._favoriteRows(rowH);
            case 'find': return this._findRows(rowH);
        }
    }

    private _areaRows(rowH: number): PanelRow[] {
        return this._ports.registry.getAreas().map((area) => ({
            id: `area:${area.id}`,
            kind: 'area' as const,
            titleKey: area.nameKey,
            titleArgKeys: [],
            subtitleKey: 'life.panel.areaSceneCount',
            subtitleRaw: [String(area.sceneIds.length)],
            badges: [],
            heightPx: rowH,
            action: { type: 'openArea', areaId: area.id } as PanelRowAction,
            favoritable: false,
        }));
    }

    private _sceneRow(sceneId: string, rowH: number, kind: PanelRow['kind'], slot?: number): PanelRow | null {
        const scene = this._ports.registry.getScene(sceneId);
        if (!scene) return null;
        const badges: PanelRowBadge[] = [];
        if (this._ports.service.currentSceneId === sceneId) badges.push('current');
        if (this._ports.service.isFavorite(sceneId)) badges.push('favorite');
        if (!scene.hasArt) badges.push('underConstruction');
        const row: PanelRow = {
            id: `${kind}:${sceneId}`,
            kind,
            titleKey: scene.nameKey,
            titleArgKeys: [],
            badges,
            heightPx: rowH,
            action: { type: 'switch', sceneId },
            favoritable: true,
        };
        if (slot !== undefined) row.subtitleKey = `life.panel.slot.${slot}`;
        return row;
    }

    private _sceneRowsOfArea(areaId: string, rowH: number): PanelRow[] {
        const rows: PanelRow[] = [];
        const first = this._ports.registry.firstSceneOfArea(areaId);
        if (first) {
            rows.push({
                id: `enter:${areaId}`,
                kind: 'enterArea',
                titleKey: 'life.panel.enterArea',
                titleArgKeys: [],
                badges: [],
                heightPx: rowH,
                action: { type: 'switch', sceneId: first.id, focus: 'center' },
                favoritable: false,
            });
        }
        for (const scene of this._ports.registry.getScenesOfArea(areaId)) {
            const row = this._sceneRow(scene.id, rowH, 'scene');
            if (row) rows.push(row);
        }
        return rows;
    }

    private _recentRows(rowH: number): PanelRow[] {
        const rows: PanelRow[] = [];
        for (const r of this._ports.service.recent) {
            const row = this._sceneRow(r.sceneId, rowH, 'recent', r.slot);
            if (row) rows.push(row);
        }
        return rows;
    }

    private _favoriteRows(rowH: number): PanelRow[] {
        const rows: PanelRow[] = [];
        for (const id of this._ports.service.favorites) {
            const row = this._sceneRow(id, rowH, 'favorite');
            if (row) rows.push(row);
        }
        return rows;
    }

    private _findRows(rowH: number): PanelRow[] {
        const results = this._ports.resolver.search(this._ports.roster(), this._query, this._ports.intel());
        return results.map((r): PanelRow => {
            const jump = r.jump;
            return {
                id: `find:${r.generalId}`,
                kind: 'find',
                titleKey: '',
                titleArgKeys: [],
                titleText: r.name,
                subtitleKey: r.locationTextKey,
                subtitleArgKeys: r.locationArgKeys,
                badges: r.friendBoost ? ['friend'] : [],
                heightPx: rowH,
                action: jump
                    ? { type: 'switch', sceneId: jump.sceneId, focus: jump.focus, focusGeneralId: r.generalId }
                    : { type: 'none' },
                favoritable: false,
                find: r,
            };
        });
    }
}
