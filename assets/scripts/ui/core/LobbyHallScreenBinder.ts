// @spec-source → 大廳系統規格書 doc_spec_0002 E-6；UI-2-0149（UI-2-0123 子項）：幕府大廳另開入口
/**
 * LobbyHallScreenBinder — 把 lobby-hall-screen 的 runtime 行為接到已建好的畫面上。
 *
 * - 以 _ucufId 找返回鈕、底部五鈕與場景面板（任務牆、祭壇、世家，UI-2-0152），點擊轉成注入的動作
 *   （畫面轉出的是 panel，不是 Button，所以直接聽 TOUCH_END）。
 * - 依季節序號與當地小時解析主題（HallTheme），交給 LobbyHallThemeApplier／LobbyHallThemeNodeView 套到節點。
 * - 在畫面根節點下加一層季節粒子（HallSeasonFxLayer），換季時重撒。
 * - 沙盤群組之後、粒子之下加一層 Q 版武將人群（HallStageCrowd＋LobbyHallStageController，UI-2-0150），
 *   開啟期間每隔 STAGE_TICK_SEC 秒 tick 一次（點位本身 60 秒才輪換）。
 * - 以 sandbox 為勢力圖視窗、map-ping 為事件標記掛 HallMapTurnPlayer，換季時播聚焦序列（UI-2-0151）。
 * LobbyScene 只負責掛 host、載設定檔、把動作接到既有流程。
 * Unity 對照：像掛在大廳 Canvas 上的 Presenter，持有主題綁定器與粒子層，按鈕事件往外拋。
 */
import { Label, Node, UITransform } from 'cc';
import type { HallMapLayout, HallMapTurnStep } from '../../core/systems/HallMapFocusPlanner';
import { HallThemeConfig, resolveHallTheme } from '../../core/systems/HallTheme';
import type { HallSeason, HallSeasonFxConfig } from '../../core/systems/HallSeasonFx';
import type { HallStageCast } from '../../core/systems/HallStageDirector';
import { LOBBY_HALL_WALL_PIN_TEXT, type LobbyHallWallView } from '../../core/systems/LobbyHallWallView';
import type { LobbyHallAltarView } from './LobbyHallAltarView';
import type { HallStageDecor } from '../../core/systems/HallStageCrowdPose';
import type { HallStageLayout } from '../../core/systems/HallStagePlanner';
import { HallMapTurnPlayer } from '../components/HallMapTurnPlayer';
import { HallSeasonFxLayer } from '../components/HallSeasonFxLayer';
import { HallStageCrowd } from '../components/HallStageCrowd';
import { LobbyHallStageController } from './LobbyHallStageController';
import { LobbyHallThemeApplier } from './LobbyHallThemeApplier';
import { LobbyHallThemeNodeView } from './LobbyHallThemeNodeView';
import { findUcufNode } from './UcufNodeLookup';

export type LobbyHallDockId = 'sortie' | 'generals' | 'domestic' | 'training' | 'shop';

export const LOBBY_HALL_DOCK_IDS: readonly LobbyHallDockId[] = ['sortie', 'generals', 'domestic', 'training', 'shop'];

/** 場景面板：設計稿 data-ucuf-id 的後綴 */
export type LobbyHallPanelId = 'wall-left' | 'wall-right' | 'altar' | 'clan';

export const LOBBY_HALL_PANEL_IDS: readonly LobbyHallPanelId[] = ['wall-left', 'wall-right', 'altar', 'clan'];

/** 人群 tick 間隔（秒）；點位 60 秒才輪換，這裡只是檢查頻率 */
export const STAGE_TICK_SEC = 5;

export interface LobbyHallStageDepsInput {
    readonly layout: HallStageLayout;
    readonly decor: HallStageDecor;
    readonly refreshSpots: (nowSec: number) => void;
    readonly cast: () => HallStageCast;
    readonly nowSec: () => number;
}

export interface LobbyHallScreenDeps {
    readonly themeConfig: HallThemeConfig | null;
    readonly fxConfig: HallSeasonFxConfig | null;
    readonly onBack: () => void;
    readonly onDock: (id: LobbyHallDockId) => void;
    /** 場景面板點擊；未提供時面板不接點擊 */
    readonly onPanel?: (id: LobbyHallPanelId) => void;
    /** 人群設定；設定檔沒載到時為 null，不建人群層 */
    readonly stage?: LobbyHallStageDepsInput | null;
    /** 勢力圖三態版面；沒載到時為 null，不掛地圖播放 */
    readonly mapLayout?: HallMapLayout | null;
}

/** 節點本身或第一個子節點上的 Label 套字；找不到 Label 時不動 */
function setText(node: Node | undefined, text: string): void {
    if (!node) return;
    const label = node.getComponent(Label) ?? node.children[0]?.getComponent(Label) ?? null;
    if (label) label.string = text;
}

/** 綁定器自建、緊接在沙盤後面的圖層節點名稱 */
const LAYER_NAMES: readonly string[] = ['HallStageCrowd', 'HallSeasonFx'];

export class LobbyHallScreenBinder {
    private readonly _applier: LobbyHallThemeApplier;
    private _fx: HallSeasonFxLayer | null = null;
    private _fxSeason: HallSeason | null = null;
    private _crowd: HallStageCrowd | null = null;
    private _stage: LobbyHallStageController | null = null;
    private _map: HallMapTurnPlayer | null = null;
    private readonly _tickStage = (): void => {
        if (this._stage && this._deps.stage) this._stage.tick(this._deps.stage.nowSec());
    };

    /** screenRoot：畫面根節點（layout root，例如 LobbyHallScreen）。 */
    constructor(private readonly _screenRoot: Node, private readonly _deps: LobbyHallScreenDeps) {
        this._applier = new LobbyHallThemeApplier(new LobbyHallThemeNodeView(_screenRoot));
        this._bindTap('lobby-hall-screen.back', () => _deps.onBack());
        for (const id of LOBBY_HALL_DOCK_IDS) this._bindTap(`lobby-hall-screen.dock-${id}`, () => _deps.onDock(id));
        const onPanel = _deps.onPanel;
        if (onPanel) for (const id of LOBBY_HALL_PANEL_IDS) this._bindTap(`lobby-hall-screen.${id}`, () => onPanel(id));
        if (_deps.mapLayout) this._map = this._createMapPlayer(_deps.mapLayout);
        if (_deps.stage) this._createStage(_deps.stage);
        if (_deps.fxConfig) this._fx = this._createFxLayer(_deps.fxConfig);
    }

    /** 顯示或隱藏場景面板（例如家族系統未解鎖時隱藏世家） */
    setPanelVisible(id: LobbyHallPanelId, visible: boolean): void {
        const node = findUcufNode(this._screenRoot, `lobby-hall-screen.${id}`);
        if (node) node.active = visible;
    }

    /**
     * 祭壇面板套字（UI-2-0154）。依設計稿節點順序：第 1 個子節點是面板頭（巡次、下一巡），
     * 第 2 個是插槽列，每格依序為品名與狀態。
     */
    setAltar(view: LobbyHallAltarView): void {
        const altar = findUcufNode(this._screenRoot, 'lobby-hall-screen.altar');
        const [head, slotRow] = altar?.children ?? [];
        if (!head || !slotRow) return;
        setText(head.children[0], view.headText);
        setText(head.children[1], view.nextRoundText);
        slotRow.children.forEach((slotNode, i) => {
            const slot = view.slots[i];
            slotNode.active = !!slot;
            if (!slot) return;
            setText(slotNode.children[0], slot.title);
            setText(slotNode.children[1], slot.status);
        });
    }

    /**
     * 任務牆套字（UI-2-0153）。依設計稿節點順序：第 1 個子節點是牆頭（標題、計數），
     * 接著是任務列（標題、獎勵、難度徽章、可選的置頂標記），最後是頁尾；多的列隱藏。
     */
    setWall(id: 'wall-left' | 'wall-right', view: LobbyHallWallView): void {
        const wall = findUcufNode(this._screenRoot, `lobby-hall-screen.${id}`);
        if (!wall || wall.children.length < 2) return;
        const [head, ...rest] = wall.children;
        const rowNodes = rest.slice(0, rest.length - 1);
        setText(head.children[1], view.countText);
        rowNodes.forEach((rowNode, i) => {
            const row = view.rows[i];
            rowNode.active = !!row;
            if (!row) return;
            const pin = rowNode.children[3] ?? null;
            setText(rowNode.children[0], row.title);
            // 沒有置頂標記節點的列，把已接取併進獎勵那行
            setText(rowNode.children[1], row.pinned && !pin ? `${row.meta}（已接取）` : row.meta);
            setText(rowNode.children[2], row.difficulty);
            if (pin) {
                pin.active = row.pinned;
                if (row.pinned) setText(pin, LOBBY_HALL_WALL_PIN_TEXT);
            }
        });
    }

    /** 播放換季聚焦序列；沒有地圖播放器時不動 */
    playMapTurn(steps: readonly HallMapTurnStep[]): void {
        this._map?.playTurn(steps);
    }

    /** 開大廳時呼叫：立刻排站位並開始定時輪換 */
    openStage(): void {
        if (!this._stage || !this._crowd || !this._deps.stage) return;
        this._stage.open(this._deps.stage.nowSec());
        this._crowd.unschedule(this._tickStage);
        this._crowd.schedule(this._tickStage, STAGE_TICK_SEC);
    }

    /** 離開大廳時呼叫：停止輪換並清掉人群 */
    closeStage(): void {
        if (!this._stage || !this._crowd) return;
        this._crowd.unschedule(this._tickStage);
        this._stage.close();
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

    private _createMapPlayer(layout: HallMapLayout): HallMapTurnPlayer | null {
        const viewport = findUcufNode(this._screenRoot, 'lobby-hall-screen.sandbox');
        if (!viewport) return null;
        const ping = findUcufNode(this._screenRoot, 'lobby-hall-screen.map-ping');
        const labels = ping ? ping.children.map((c) => c.getComponent(Label)).filter((l): l is Label => !!l) : [];
        // 掛在沙盤的父節點：hidden 模式會關掉視窗節點，元件不能跟著停
        const player = (viewport.parent ?? this._screenRoot).addComponent(HallMapTurnPlayer);
        player.viewport = viewport;
        // 設計稿沙盤沒有內層地圖圖層，content 留空：只縮放視窗、落事件標記（暫定）
        player.content = null;
        player.ping = ping;
        player.pingGlyph = labels[0] ?? null;
        player.pingLabel = labels[1] ?? null;
        const rootSize = this._screenRoot.getComponent(UITransform);
        player.configure(layout, { width: rootSize?.width ?? 1920, height: rootSize?.height ?? 1080 });
        player.setMode('mini', true);
        return player;
    }

    private _createStage(input: LobbyHallStageDepsInput): void {
        const node = new Node('HallStageCrowd');
        node.layer = this._screenRoot.layer;
        const rootSize = this._screenRoot.getComponent(UITransform);
        node.addComponent(UITransform).setContentSize(rootSize?.width ?? input.layout.canvas.width, rootSize?.height ?? input.layout.canvas.height);
        this._insertAfterSandbox(node);
        const crowd = node.addComponent(HallStageCrowd);
        crowd.configure(input.decor);
        this._crowd = crowd;
        this._stage = new LobbyHallStageController(input.layout, {
            refreshSpots: input.refreshSpots,
            cast: input.cast,
            view: crowd,
        });
    }

    /** 放在沙盤群組後面（場景元素之上、頂欄與面板之下）；找不到沙盤時掛在根節點 */
    private _insertAfterSandbox(node: Node): void {
        const sandbox = findUcufNode(this._screenRoot, 'lobby-hall-screen.sandbox-group');
        const parent = sandbox?.parent ?? this._screenRoot;
        parent.addChild(node);
        if (sandbox && sandbox.parent) {
            // 人群、粒子依建立順序排在沙盤之後：後建者在上
            let index = sandbox.getSiblingIndex() + 1;
            while (index < parent.children.length - 1 && LAYER_NAMES.includes(parent.children[index].name)) index++;
            node.setSiblingIndex(index);
        }
    }

    private _createFxLayer(config: HallSeasonFxConfig): HallSeasonFxLayer {
        const node = new Node('HallSeasonFx');
        node.layer = this._screenRoot.layer;
        const rootSize = this._screenRoot.getComponent(UITransform);
        const transform = node.addComponent(UITransform);
        transform.setContentSize(rootSize?.width ?? config.canvas.width, rootSize?.height ?? config.canvas.height);
        // 粒子在人群之上、頂欄與面板之下
        this._insertAfterSandbox(node);
        const layer = node.addComponent(HallSeasonFxLayer);
        layer.configure(config);
        return layer;
    }
}
