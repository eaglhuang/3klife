// @spec-source → 大廳系統規格書 doc_spec_0002 E-6；UI-2-0149（UI-2-0123 子項）：幕府大廳另開入口
/**
 * LobbyHallScreenBinder — 把 lobby-hall-screen 的 runtime 行為接到已建好的畫面上。
 *
 * - 以 _ucufId 找返回鈕與底部五鈕，點擊轉成注入的動作（畫面轉出的是 panel，不是 Button，所以直接聽 TOUCH_END）。
 * - 依季節序號與當地小時解析主題（HallTheme），交給 LobbyHallThemeApplier／LobbyHallThemeNodeView 套到節點。
 * - 在畫面根節點下加一層季節粒子（HallSeasonFxLayer），換季時重撒。
 * LobbyScene 只負責掛 host、載設定檔、把動作接到既有流程。
 * Unity 對照：像掛在大廳 Canvas 上的 Presenter，持有主題綁定器與粒子層，按鈕事件往外拋。
 */
import { Node, UITransform } from 'cc';
import { HallThemeConfig, resolveHallTheme } from '../../core/systems/HallTheme';
import type { HallSeason, HallSeasonFxConfig } from '../../core/systems/HallSeasonFx';
import { HallSeasonFxLayer } from '../components/HallSeasonFxLayer';
import { LobbyHallThemeApplier } from './LobbyHallThemeApplier';
import { LobbyHallThemeNodeView } from './LobbyHallThemeNodeView';
import { findUcufNode } from './UcufNodeLookup';

export type LobbyHallDockId = 'sortie' | 'generals' | 'domestic' | 'training' | 'shop';

export const LOBBY_HALL_DOCK_IDS: readonly LobbyHallDockId[] = ['sortie', 'generals', 'domestic', 'training', 'shop'];

export interface LobbyHallScreenDeps {
    readonly themeConfig: HallThemeConfig | null;
    readonly fxConfig: HallSeasonFxConfig | null;
    readonly onBack: () => void;
    readonly onDock: (id: LobbyHallDockId) => void;
}

export class LobbyHallScreenBinder {
    private readonly _applier: LobbyHallThemeApplier;
    private _fx: HallSeasonFxLayer | null = null;
    private _fxSeason: HallSeason | null = null;

    /** screenRoot：畫面根節點（layout root，例如 LobbyHallScreen）。 */
    constructor(private readonly _screenRoot: Node, private readonly _deps: LobbyHallScreenDeps) {
        this._applier = new LobbyHallThemeApplier(new LobbyHallThemeNodeView(_screenRoot));
        this._bindTap('lobby-hall-screen.back', () => _deps.onBack());
        for (const id of LOBBY_HALL_DOCK_IDS) this._bindTap(`lobby-hall-screen.dock-${id}`, () => _deps.onDock(id));
        if (_deps.fxConfig) this._fx = this._createFxLayer(_deps.fxConfig);
    }

    /** 依遊戲季節（1~4）與當地小時套主題；設定檔沒載到時不動畫面。 */
    refresh(seasonIndex: number, hour: number, festivalId: string | null = null): void {
        const config = this._deps.themeConfig;
        if (!config) return;
        const theme = resolveHallTheme({ seasonIndex, hour, festivalId }, config);
        this._applier.apply(theme);
        if (this._fx && theme.fxSeason !== this._fxSeason) {
            this._fxSeason = theme.fxSeason;
            this._fx.setSeason(theme.fxSeason);
        }
    }

    private _bindTap(ucufId: string, handler: () => void): void {
        const node = findUcufNode(this._screenRoot, ucufId);
        if (!node) return;
        node.off(Node.EventType.TOUCH_END);
        node.on(Node.EventType.TOUCH_END, handler);
    }

    private _createFxLayer(config: HallSeasonFxConfig): HallSeasonFxLayer {
        const node = new Node('HallSeasonFx');
        node.layer = this._screenRoot.layer;
        const rootSize = this._screenRoot.getComponent(UITransform);
        const transform = node.addComponent(UITransform);
        transform.setContentSize(rootSize?.width ?? config.canvas.width, rootSize?.height ?? config.canvas.height);
        node.parent = this._screenRoot;
        // 粒子在場景元素之上、頂欄與面板之下：放在沙盤群組後面
        const sandbox = findUcufNode(this._screenRoot, 'lobby-hall-screen.sandbox-group');
        if (sandbox && sandbox.parent) {
            node.parent = sandbox.parent;
            node.setSiblingIndex(sandbox.getSiblingIndex() + 1);
        }
        const layer = node.addComponent(HallSeasonFxLayer);
        layer.configure(config);
        return layer;
    }
}
