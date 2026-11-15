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
import { Label, Node, UITransform, Widget, view } from 'cc';
import type { HallMapLayout, HallMapTurnStep } from '../../core/systems/HallMapFocusPlanner';
import { hallBgCoverScale } from '../../core/systems/HallBackgroundFit';
import { HallBubbleState } from '../../core/systems/HallBubbleState';
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
import { hallCrowdReactionOf } from '../../core/systems/HallCrowdReaction';
import { LobbyHallStageController } from './LobbyHallStageController';
import type { HallWanderData } from '../../shared/lobby/wanderSupport';
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

/** 點到在場武將後，泡泡要顯示的內容（由 LobbyScene 依自薦任務／聊天台詞決定） */
export interface HallActorTapView {
    /** 泡泡抬頭：「{name}：」 */
    name: string;
    text: string;
    /** 有值＝這位武將正在自薦任務：泡泡顯示「交給你／再議」，按「交給你」才呼叫 onAccept；沒有就是單純聊天（不顯示選項、自動收起） */
    volunteer?: { onAccept: () => void };
}

/** 聊天泡泡停留秒數取自設定檔 bubbleSeconds；自薦任務要讓玩家有時間決定，停久一點 */
export const VOLUNTEER_BUBBLE_SEC = 8;

export interface LobbyHallStageDepsInput {
    readonly layout: HallStageLayout;
    readonly decor: HallStageDecor;
    readonly refreshSpots: (nowSec: number) => void;
    readonly cast: () => HallStageCast;
    readonly nowSec: () => number;
    /** 走動設定（data/hall-map/hall-wander.json）；null 或沒給時人群維持原本的靜態小人 */
    readonly wander?: HallWanderData | null;
    /** 點到武將時決定泡泡內容；回傳 null 就不開泡泡 */
    readonly onActorTap?: (generalId: string) => HallActorTapView | null;
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

export interface LobbyHallTopbarView {
    gold?: number | string;
    gems?: number | string;
    food?: number | string;
    troops?: number | string;
    officerSubtitle?: string;
    timeLabel?: string;
}

/** 節點本身或第一個子節點上的 Label 套字；找不到 Label 時不動 */
function setText(node: Node | null | undefined, text: string): void {
    if (!node) return;
    const label = node.getComponent(Label) ?? node.children[0]?.getComponent(Label) ?? null;
    if (!label) return;
    const charMode = Label.CacheMode?.CHAR ?? 2;
    const noneMode = Label.CacheMode?.NONE ?? 0;
    if (label.cacheMode === charMode) {
        label.cacheMode = noneMode;
    }
    label.string = text;
}

/** 綁定器自建、緊接在沙盤後面的圖層節點名稱 */
const LAYER_NAMES: readonly string[] = ['HallStageCrowd', 'HallSeasonFx'];

/** 版面裡沙盤群組（sandbox-group）的固定尺寸 */
const HALL_SANDBOX_WIDTH = 1920;
const HALL_SANDBOX_HEIGHT = 1080;

/** 計算大廳底欄子選單的水平置中偏移，使選單對齊觸發按鈕且不超出大廳左右邊界。 */
export function computeSubMenuCenterX(
    dockCenterX: number,
    hallWidth: number,
    menuWidth: number,
    margin = 24,
): number {
    if (!Number.isFinite(dockCenterX) || !Number.isFinite(hallWidth) || hallWidth <= 0) return 0;
    const safeMenuW = Number.isFinite(menuWidth) && menuWidth > 0 ? menuWidth : 0;
    const halfLimit = Math.max(0, hallWidth / 2 - safeMenuW / 2 - margin);
    return Math.max(-halfLimit, Math.min(halfLimit, dockCenterX));
}

export class LobbyHallScreenBinder {
    private readonly _applier: LobbyHallThemeApplier;
    private _fx: HallSeasonFxLayer | null = null;
    private _fxSeason: HallSeason | null = null;
    private _crowd: HallStageCrowd | null = null;
    private _stage: LobbyHallStageController | null = null;
    private _bubbleTimer: ReturnType<typeof setTimeout> | null = null;
    /** 泡泡同一時間只有一個：誰開著、計時代號（連點不疊、舊計時不誤關） */
    private readonly _bubble = new HallBubbleState();
    /** 「交給你」要做什麼；泡泡收起時清空 */
    private _bubbleAccept: (() => void) | null = null;
    private _map: HallMapTurnPlayer | null = null;
    private readonly _tickStage = (): void => {
        if (this._stage && this._deps.stage) this._stage.tick(this._deps.stage.nowSec());
    };

    /** screenRoot：畫面根節點（layout root，例如 LobbyHallScreen）。 */
    constructor(private readonly _screenRoot: Node, private readonly _deps: LobbyHallScreenDeps) {
        this._applier = new LobbyHallThemeApplier(new LobbyHallThemeNodeView(_screenRoot));
        this._fitBackground();
        this._bindTap('lobby-hall-screen.back', () => _deps.onBack());
        for (const id of LOBBY_HALL_DOCK_IDS) this._bindTap(`lobby-hall-screen.dock-${id}`, () => _deps.onDock(id));
        const onPanel = _deps.onPanel;
        if (onPanel) for (const id of LOBBY_HALL_PANEL_IDS) this._bindTap(`lobby-hall-screen.${id}`, () => onPanel(id));
        this._bindBubbleChoices();
        if (_deps.mapLayout) this._map = this._createMapPlayer(_deps.mapLayout);
        if (_deps.stage) this._createStage(_deps.stage);
        if (_deps.fxConfig) this._fx = this._createFxLayer(_deps.fxConfig);
    }

    /** 視窗比 16:9 寬時放大底圖蓋滿左右，不拉寬變形 */
    private _fitBackground(): void {
        const bg = findUcufNode(this._screenRoot, 'lobby-hall-screen.hall-bg');
        if (!bg) return;
        const size = view.getVisibleSize();
        const scale = hallBgCoverScale(size.width, size.height);
        bg.setScale(scale, scale, 1);
    }

    /** 顯示或隱藏場景面板（例如家族系統未解鎖時隱藏世家） */
    setPanelVisible(id: LobbyHallPanelId, visible: boolean): void {
        const node = findUcufNode(this._screenRoot, `lobby-hall-screen.${id}`);
        if (node) node.active = visible;
    }

    /** 依節點名稱深度優先尋找子孫節點 */
    private _findDescendantByName(root: Node, name: string): Node | null {
        if (root.name === name) return root;
        for (const child of root.children) {
            const hit = this._findDescendantByName(child, name);
            if (hit) return hit;
        }
        return null;
    }

    /** 同步幕府大廳頂列資源、官職主將與季節時辰 */
    setTopbar(view: LobbyHallTopbarView): void {
        const formatVal = (val: number | string | undefined): string | null => {
            if (val === undefined) return null;
            return typeof val === 'number'
                ? Math.max(0, Math.floor(val)).toLocaleString('en-US')
                : String(val);
        };
        const applyField = (nodeName: string, text: string | null, ucufId?: string): void => {
            if (text === null) return;
            const node = (ucufId ? findUcufNode(this._screenRoot, ucufId) : null)
                ?? this._findDescendantByName(this._screenRoot, nodeName);
            setText(node, text);
        };
        applyField('LobbyHallScreen_span_1', formatVal(view.gold));
        applyField('LobbyHallScreen_span_2', formatVal(view.gems));
        applyField('LobbyHallScreen_span_3', formatVal(view.food));
        applyField('LobbyHallScreen_span_4', formatVal(view.troops));
        if (view.officerSubtitle !== undefined) {
            applyField('LobbyHallScreen_div_7', view.officerSubtitle);
        }
        if (view.timeLabel !== undefined) {
            applyField('LobbyHallScreen_div_10', view.timeLabel, 'lobby-hall-screen.hall-time');
        }
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

    /** 派遣任務後呼叫：高難任務讓在場武將集體反應（大廳 §E-5，PROG-2-1740）；其他難度或沒有人群時不動 */
    reactToDispatch(difficulty: string): void {
        const reaction = hallCrowdReactionOf(difficulty);
        if (reaction && this._crowd) this._crowd.react(reaction);
    }

    /** 人群名牌顯示開關：子選單蓋在大廳上層時暫藏，並一併收起開啟中的泡泡避免重疊 */
    setCrowdTagsVisible(visible: boolean): void {
        if (!visible) this._closeBubble();
        this._crowd?.setTagsVisible(visible);
    }

    /** 取得指定底欄按鈕相對於大廳根節點的水平中心座標（設計座標）。 */
    getDockButtonCenterX(dockId: LobbyHallDockId): number | null {
        const node = findUcufNode(this._screenRoot, `lobby-hall-screen.dock-${dockId}`);
        if (!node) return null;
        const rootTransform = this._screenRoot.getComponent(UITransform);
        if (rootTransform && node.worldPosition) {
            return rootTransform.convertToNodeSpaceAR(node.worldPosition).x;
        }
        return node.position.x + (node.parent?.position.x ?? 0);
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
        this._closeBubble();
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

    /**
     * 武將對話泡泡（issue #2099 第 6 項；Issue #2135 改為由武將觸發）：平常收起，點到在場武將才出現。
     * 設計稿最後一列是「交給你／再議」兩顆選項（轉出來是 panel 不接點擊）：自薦任務時「交給你」呼叫 onAccept，
     * 兩顆都收起泡泡；單純聊天時整列隱藏。點泡泡本體也收起（#2107-9）；選項按鈕的觸控先處理，不會被本體吃掉。
     */
    /** 同步泡泡分離式陰影（${bubble.name}_CssShadow）顯示與層級，避免殘留或壓住泡泡 */
    private _syncBubbleShadow(bubble: Node, visible: boolean): void {
        const parent = bubble.parent;
        if (!parent) return;
        const shadow = parent.getChildByName(`${bubble.name}_CssShadow`);
        if (!shadow) return;
        shadow.active = visible;
        if (visible) {
            shadow.setSiblingIndex(parent.children.length - 1);
            bubble.setSiblingIndex(parent.children.length - 1);
        }
    }

    private _bindBubbleChoices(): void {
        const bubble = findUcufNode(this._screenRoot, 'lobby-hall-screen.bubble');
        if (!bubble) return;
        // 選項列＝有兩個以上子節點的那一列（執行期另插的陰影等節點沒有子節點）
        const choiceRow = bubble.children.filter(child => child.children.length >= 2).pop();
        // 設計稿的示範對話不該一直掛在畫面上
        bubble.active = false;
        this._syncBubbleShadow(bubble, false);
        bubble.off(Node.EventType.TOUCH_END);
        bubble.on(Node.EventType.TOUCH_END, () => this._closeBubble());
        if (!choiceRow) return;
        const [accept, decline] = choiceRow.children;
        accept.off(Node.EventType.TOUCH_END);
        accept.on(Node.EventType.TOUCH_END, () => {
            const onAccept = this._bubbleAccept;
            this._closeBubble();
            onAccept?.();
        });
        decline.off(Node.EventType.TOUCH_END);
        decline.on(Node.EventType.TOUCH_END, () => this._closeBubble());
    }

    /** 收起泡泡並讓那位武將繼續走（泡泡先被點掉、逾時、離開大廳都走這裡） */
    private _closeBubble(): void {
        if (this._bubbleTimer) {
            clearTimeout(this._bubbleTimer);
            this._bubbleTimer = null;
        }
        const bubble = findUcufNode(this._screenRoot, 'lobby-hall-screen.bubble');
        if (bubble?.isValid) {
            bubble.active = false;
            this._syncBubbleShadow(bubble, false);
        }
        const actor = this._bubble.close();
        this._bubbleAccept = null;
        if (actor) this._crowd?.releaseActor(actor);
    }

    /** 計時到期：只收起本次開啟的那個泡泡（代號對不上代表已被新泡泡取代） */
    private _expireBubble(token: number): void {
        this._bubbleTimer = null;
        const actor = this._bubble.expire(token);
        if (actor === null) return;
        const bubble = findUcufNode(this._screenRoot, 'lobby-hall-screen.bubble');
        if (bubble?.isValid) {
            bubble.active = false;
            this._syncBubbleShadow(bubble, false);
        }
        this._bubbleAccept = null;
        this._crowd?.releaseActor(actor);
    }

    /** 外面要開其他面板（或子選單蓋上來）時呼叫：收起泡泡並放行武將 */
    hideBubble(): void {
        this._closeBubble();
    }

    /** 點到在場武將：依內容開泡泡並回傳該武將要停多久；沒有內容回傳 undefined（用預設停留） */
    private _openActorBubble(generalId: string, input: LobbyHallStageDepsInput): number | undefined {
        const content = input.onActorTap?.(generalId) ?? null;
        const bubble = findUcufNode(this._screenRoot, 'lobby-hall-screen.bubble');
        if (!content || !bubble) return undefined;
        const [nameLabel, textLabel] = bubble.children;
        const choiceRow = bubble.children.filter(child => child.children.length >= 2).pop();
        setText(nameLabel, `${content.name}：`);
        setText(textLabel, content.text);
        if (choiceRow) choiceRow.active = !!content.volunteer;
        // 換人：先放行被擠掉的上一位（同一人連點不放行，只刷新計時）
        const opened = this._bubble.open(generalId);
        if (opened.previous && opened.previous !== generalId) this._crowd?.releaseActor(opened.previous);
        this._bubbleAccept = content.volunteer?.onAccept ?? null;
        const seconds = content.volunteer ? VOLUNTEER_BUBBLE_SEC : (input.wander?.bubbleSeconds ?? 2);
        bubble.active = true;
        // 設計稿的泡泡夾在勢力圖等元件之間，跟著頭頂移動後會被蓋住，開啟時拉到最上層並同步陰影
        bubble.setSiblingIndex(bubble.parent ? bubble.parent.children.length - 1 : 0);
        this._syncBubbleShadow(bubble, true);
        this._placeBubbleAbove(bubble, generalId);
        if (this._bubbleTimer) clearTimeout(this._bubbleTimer);
        this._bubbleTimer = setTimeout(() => this._expireBubble(opened.token), seconds * 1000);
        return seconds;
    }

    /** 泡泡跟著武將頭頂：改 Widget 的水平置中與上緣距離（設計稿是固定位置），夾在畫面內並避開啟用中的天下勢力圖 */
    private _placeBubbleAbove(bubble: Node, generalId: string): void {
        const widget = bubble.getComponent(Widget);
        const head = this._crowd?.headPositionOf(generalId);
        const parentSize = bubble.parent?.getComponent(UITransform);
        const size = bubble.getComponent(UITransform);
        if (!widget || !head || !parentSize || !size) return;
        const margin = 12;
        const halfW = size.width / 2;
        const maxH = parentSize.width / 2 - halfW - margin;
        let hCenter = Math.max(-maxH, Math.min(maxH, head.x));
        // 泡泡下緣貼在頭頂標記上方；上緣離畫面頂至少留一個邊距
        let top = Math.max(margin, parentSize.height / 2 - (head.y + size.height));

        const sandbox = findUcufNode(this._screenRoot, 'lobby-hall-screen.sandbox');
        const sandboxTrans = sandbox?.active ? sandbox.getComponent(UITransform) : null;
        if (sandbox && sandbox.active && sandboxTrans) {
            sandbox.getComponent(Widget)?.updateAlignment();
            let sbCenterX = sandbox.position.x;
            let sbCenterY = sandbox.position.y;
            let cur: Node | null = sandbox.parent;
            let depth = 0;
            while (cur && cur !== bubble.parent && depth++ < 4) {
                sbCenterX += cur.position?.x ?? 0;
                sbCenterY += cur.position?.y ?? 0;
                cur = cur.parent;
            }
            const sbScaleX = Math.abs(sandbox.scale?.x ?? 1);
            const sbScaleY = Math.abs(sandbox.scale?.y ?? 1);
            const sbHalfW = (sandboxTrans.width * sbScaleX) / 2;
            const sbHalfH = (sandboxTrans.height * sbScaleY) / 2;
            const sbTop = parentSize.height / 2 - (sbCenterY + sbHalfH) - 28;
            const sbBottom = parentSize.height / 2 - (sbCenterY - sbHalfH);
            const overlapX = Math.abs(hCenter - sbCenterX) < (halfW + sbHalfW + margin);
            const overlapY = top < (sbBottom + margin) && (top + size.height) > (sbTop - margin);
            if (overlapX && overlapY) {
                const maxTop = Math.max(margin, parentSize.height - size.height - 120);
                const pushDownTop = sbBottom + margin;
                if (pushDownTop <= maxTop) {
                    // 優先維持在說話武將同欄正下方，避免橫移太遠失去指向性（Issue #2159）
                    top = Math.max(top, pushDownTop);
                } else {
                    const leftCandidate = sbCenterX - sbHalfW - halfW - margin;
                    const rightCandidate = sbCenterX + sbHalfW + halfW + margin;
                    if (head.x <= sbCenterX && leftCandidate >= -maxH) {
                        hCenter = leftCandidate;
                    } else if (rightCandidate <= maxH) {
                        hCenter = rightCandidate;
                    } else {
                        top = maxTop;
                    }
                }
            }
        }

        widget.isAbsoluteHorizontalCenter = true;
        widget.isAbsoluteTop = true;
        widget.horizontalCenter = hCenter;
        widget.top = top;
        widget.updateAlignment();
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
        player.tint = findUcufNode(this._screenRoot, 'lobby-hall-screen.season-tint');
        player.focusOnly = ['stage-s1', 'stage-s2', 'stage-s3']
            .map((id) => findUcufNode(this._screenRoot, `lobby-hall-screen.${id}`))
            .filter((n): n is Node => !!n);
        // 沙盤群組固定 1920×1080 置中，座標要用群組尺寸；用實際畫面寬度會在寬螢幕把地圖往左推
        player.configure(layout, { width: HALL_SANDBOX_WIDTH, height: HALL_SANDBOX_HEIGHT });
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
        crowd.configureWander(input.wander ?? null, input.layout.canvas, (generalId) => this._openActorBubble(generalId, input));
        this._crowd = crowd;
        // 設計稿的示意名牌（npc-sample-N）只是版面樣本；真人群上場就關掉，免得與人群名牌疊字
        for (let i = 1; ; i++) {
            const sample = findUcufNode(this._screenRoot, `lobby-hall-screen.npc-sample-${i}`);
            if (!sample) break;
            sample.active = false;
        }
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
