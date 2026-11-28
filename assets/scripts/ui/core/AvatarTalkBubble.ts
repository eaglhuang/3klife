// @spec-source → 大廳系統規格書 doc_spec_0002 E-5（點武將聊天）；使用者裁定 2026-11-24「武將頭像點擊一定說話」；PROG-2-9885
/**
 * AvatarTalkBubble — 全遊戲共用的「點頭像說話」行為（View 層）。
 *
 * 用法：各畫面在頭像節點建好（或換人）後呼叫 bindAvatarTalk(node, generalId) 即可，其餘全共用：
 *   - 選句在 core/systems/AvatarTalk.ts（AI 快取 → 大廳台詞底稿 → i18n 保底，絕不沒聲）。
 *   - 全場只有一個泡泡節點（掛 Canvas 最上層、重複使用），同時最多一句；點泡泡立刻關掉，停留幾秒自動消失。
 *   - 同一個節點重複呼叫只更新 generalId，不重複掛監聽。事件不攔截，頭像原本的點擊功能（開詳情等）照常運作。
 * 戰場 HUD 頭像不在範圍（戰場交戰場專家）。
 *
 * Unity 對照：像一個全域 SpeechBubbleManager，頭像上掛 OnPointerClick → Manager.Show(general, anchor)。
 */
import { Button, Canvas, Color, Graphics, Label, Node, UITransform, Vec2, Vec3, director, view } from 'cc';
import { services } from '../../core/managers/ServiceLoader';
import { sharedNpcDialogueCache } from '../../core/dialogue/NpcDialogueCache';
import { applyInsightFromDialogue } from '../../core/dialogue/InsightFlow';
import { FriendshipService } from '../../core/services/FriendshipService';
import {
    AVATAR_TALK_HOLD_SEC,
    AvatarTalkPicker,
    layoutAvatarBubble,
    rectsOverlap,
    type CenterRect,
    type AvatarTalkResult,
} from '../../core/systems/AvatarTalk';
import { HallChatStore, parseChatBook } from '../../core/systems/HallChatLines';
import { LocalLobbyDialogueProvider, type LobbyDialogueProvider } from '../../core/systems/LobbyDialogueProvider';
import { UCUFLogger, LogCategory } from '../../core/utils/UCUFLogger';
import { tryToddlerBarkTap } from '../fun/FunToddlerBarkView';

const BUBBLE_NODE_NAME = 'AvatarTalkBubble';
/** 顯示後再把泡泡提到最上層的時間點（毫秒）：蓋過點擊後才開出的詳情面板 */
const RAISE_DELAYS_MS = [120, 400, 900, 1600];
/** 泡泡顯示期間，每隔這麼久檢查一次版面有沒有變（結果窗、操作列後來才出現）：壓到按鈕就重新擺位 */
const RELAYOUT_POLL_MS = 150;
const HALL_CHAT_PATH = 'data/hall-map/hall-chat-lines';
const FONT_SIZE = 24;
const PADDING = 16;
const MAX_WIDTH = 420;
const SCREEN_MARGIN = 12;
const FILL = new Color(28, 22, 16, 235);
const BORDER = new Color(214, 178, 96, 255);
const TEXT = new Color(250, 240, 214, 255);

/** 節點目前綁的武將；同一節點換人只改這裡 */
const _boundIds = new WeakMap<Node, string>();

let _provider: LobbyDialogueProvider | null = null;
let _providerLoading: Promise<void> | null = null;
let _bubble: Node | null = null;
let _hideTimer: ReturnType<typeof setTimeout> | null = null;
/** 泡泡該顯示到的時間點；換頁流程若順手把泡泡關掉，這段時間內會再打開（點掉泡泡或到時間才算真的收） */
let _holdUntil = 0;
/** 目前這句泡泡的來源，版面變動（按鈕後來才顯示、頭像被收起）時用來重新擺位 */
let _current: { anchor: Node; text: string; anchorSig: string } | null = null;
let _watchTimer: ReturnType<typeof setTimeout> | null = null;

const _picker = new AvatarTalkPicker({
    provider: () => _provider,
    // 先用中台 v2 台詞（心情、好感、天下大勢吻合的那句），沒有才退回舊的 AI 快取（PROG-2-9964）
    cacheLine: (generalId) => services().dialogue.cachedLine(generalId, 'avatar-tap') ?? sharedNpcDialogueCache.latestFor(generalId, services().i18n.currentLocale),
    friendship: (generalId) => FriendshipService.getInstance().get(generalId),
    translate: (key) => services().i18n.t(key),
    random: () => services().session.randomSource(),
    nowMs: () => Date.now(),
    hour: () => new Date().getHours(),
});

/** 大廳建好台詞接口（含雲端殼）後交給這裡共用；沒呼叫過時頭像說話會自己載入本地底稿。 */
export function setAvatarTalkProvider(provider: LobbyDialogueProvider | null): void {
    _provider = provider;
}

/** 還沒有台詞接口時載入本地底稿（內建＋本機快取）；載入期間點到的頭像先說保底句。 */
function ensureProvider(): void {
    if (_provider || _providerLoading) return;
    _providerLoading = services().resource.loadJson(HALL_CHAT_PATH)
        .then((raw: unknown) => {
            if (_provider) return;
            // 只讀內建底稿：本機快取與雲端同步由大廳建的那份接口負責（大廳一建好就會改用它）
            const store = new HallChatStore(parseChatBook(raw) ?? { version: 0, generic: [], generals: {} }, null);
            _provider = new LocalLobbyDialogueProvider(store);
        })
        .catch(() => undefined)
        .finally(() => { _providerLoading = null; });
}

/**
 * 讓這個頭像節點「點了就說話」。generalId 空白就不綁（沒有武將可說）。
 * 節點需有 UITransform 才收得到點擊（有 Sprite 的頭像都有）。
 */
export function bindAvatarTalk(node: Node | null | undefined, generalId: string | null | undefined): void {
    if (!node || !node.isValid || !generalId) return;
    const first = !_boundIds.has(node);
    _boundIds.set(node, generalId);
    if (!first) return;
    if (!node.getComponent(UITransform)) node.addComponent(UITransform);
    node.on(Node.EventType.TOUCH_END, () => {
        const id = _boundIds.get(node);
        if (id) showAvatarTalk(node, id);
    });
}

/** 立即讓某位武將在頭像節點旁說一句（也供測試與其他入口呼叫）。回傳實際說的結果。 */
export function showAvatarTalk(anchor: Node, generalId: string): AvatarTalkResult {
    // 未滿 5 歲的孩子：改出童言童語＋小動作（新手樂趣 FUN-01，PROG-2-10177），不走成人台詞
    if (tryToddlerBarkTap(anchor, generalId)) return { kind: 'cooldown' };
    ensureProvider();
    const result = _picker.speak(generalId);
    if (result.kind === 'cooldown') return result;
    services().dialogue.prefetch(generalId, 'avatar-tap');
    const name = services().session.roster.find((general) => general.id === generalId)?.name;
    const text = name ? services().i18n.t('ui.avatarTalk.format', name, result.text) : result.text;
    presentBubble(anchor, text);
    // AI 快取來的新台詞：沿用既有「有感而發」成就（同句、每日上限、友誼加成都在 recordInsightDialogue 裡判）
    if (result.source === 'cache') void applyInsightFromDialogue(generalId, result.text, name ?? generalId);
    return result;
}

/** 在任意節點旁顯示一句指定文字（任務派出等非「點頭像」的觸發點共用同一個泡泡；PROG-2-9966） */
export function showAvatarBubbleText(anchor: Node, text: string, holdSec: number = AVATAR_TALK_HOLD_SEC): void {
    if (!anchor.isValid || !text) return;
    presentBubble(anchor, text, holdSec);
}

/** 立刻關掉泡泡（離開畫面、開面板時可呼叫） */
export function hideAvatarTalk(): void {
    _holdUntil = 0;
    _current = null;
    stopWatch();
    if (_hideTimer) {
        clearTimeout(_hideTimer);
        _hideTimer = null;
    }
    if (_bubble?.isValid) _bubble.active = false;
}

/**
 * 泡泡要掛的根節點：優先是頭像所在的 Canvas（多個 Canvas／畫面宿主時，座標與層級才跟頭像一致），
 * 找不到就用場景的 Canvas，再不行用頭像最上層的祖先。
 */
function rootOf(anchor: Node): Node | null {
    let cursor: Node | null = anchor.parent;
    let top: Node | null = null;
    while (cursor) {
        if (cursor.getComponent(Canvas)) return cursor;
        if (cursor.parent && !cursor.parent.parent) top = cursor;
        cursor = cursor.parent;
    }
    return anchor.scene?.getComponentInChildren(Canvas)?.node ?? director.getScene()?.getComponentInChildren(Canvas)?.node ?? top;
}

/** 泡泡節點只建一次（場景換掉被銷毀時才重建）；掛在頭像所屬根節點最上層 */
function ensureBubble(root: Node): Node {
    if (_bubble?.isValid) {
        if (_bubble.parent !== root) {
            _bubble.removeFromParent();
            root.addChild(_bubble);
        }
        return _bubble;
    }
    const node = new Node(BUBBLE_NODE_NAME);
    node.layer = root.layer;
    node.addComponent(UITransform);
    node.addComponent(Graphics);
    const labelNode = new Node('Text');
    labelNode.layer = root.layer;
    labelNode.addComponent(UITransform);
    const label = labelNode.addComponent(Label);
    label.fontSize = FONT_SIZE;
    label.lineHeight = Math.round(FONT_SIZE * 1.3);
    label.color = TEXT;
    label.overflow = Label.Overflow.RESIZE_HEIGHT;
    label.horizontalAlign = Label.HorizontalAlign.LEFT;
    label.verticalAlign = Label.VerticalAlign.CENTER;
    label.enableWrapText = true;
    node.addChild(labelNode);
    // 點泡泡就關掉（泡泡只吃泡泡範圍內的點擊，不擋其他按鈕）
    node.on(Node.EventType.TOUCH_END, () => hideAvatarTalk());
    root.addChild(node);
    _bubble = node;
    return node;
}

/** 世界座標矩形 → 根節點本地的中心矩形 */
function toLocalRect(root: Node, ui: UITransform): CenterRect {
    const box = ui.getBoundingBoxToWorld();
    const center = new Vec3();
    root.inverseTransformPoint(center, new Vec3(box.x + box.width / 2, box.y + box.height / 2, 0));
    const scale = root.getWorldScale();
    return { x: center.x, y: center.y, width: box.width / (scale.x || 1), height: box.height / (scale.y || 1) };
}

/** 收集畫面上可見的按鈕範圍（排除包含頭像的整列按鈕與大面積容器），泡泡擺位時避開 */
function collectButtonRects(root: Node, anchor: Node | null, bubble: Node, maxW: number, maxH: number): CenterRect[] {
    const rects: CenterRect[] = [];
    const stack: Node[] = [root];
    while (stack.length > 0) {
        const node = stack.pop()!;
        if (!node.activeInHierarchy || node === bubble) continue;
        const button = node.getComponent(Button);
        if (button && button.enabled && button.interactable && (!anchor || (!anchor.isChildOf(node) && node !== anchor))) {
            const ui = node.getComponent(UITransform);
            if (ui) {
                const rect = toLocalRect(root, ui);
                if (rect.width > 0 && rect.height > 0 && rect.width <= maxW && rect.height <= maxH) rects.push(rect);
            }
        }
        for (const child of node.children) stack.push(child);
    }
    return rects;
}

/** 根節點的畫布尺寸與原點偏移（有 UITransform 時以其錨點換算，讓座標原點落在畫面中心） */
interface CanvasInfo { w: number; h: number; shift: Vec2 }
function canvasInfo(root: Node): CanvasInfo {
    const rootUi = root.getComponent(UITransform);
    const visible = view.getVisibleSize();
    const w = rootUi && rootUi.width > 0 ? rootUi.width : visible.width;
    const h = rootUi && rootUi.height > 0 ? rootUi.height : visible.height;
    return { w, h, shift: rootUi ? new Vec2((0.5 - rootUi.anchorX) * w, (0.5 - rootUi.anchorY) * h) : new Vec2(0, 0) };
}

/** 節點在根節點裡的矩形（以畫面中心為原點） */
function centeredRect(root: Node, node: Node, info: CanvasInfo): CenterRect | null {
    const ui = node.getComponent(UITransform);
    if (!ui) return null;
    const raw = toLocalRect(root, ui);
    return { ...raw, x: raw.x - info.shift.x, y: raw.y - info.shift.y };
}

/** 目前要避開的按鈕範圍（以畫面中心為原點） */
function avoidRects(root: Node, anchor: Node | null, bubble: Node, info: CanvasInfo): CenterRect[] {
    return collectButtonRects(root, anchor, bubble, info.w * 0.45, info.h * 0.45)
        .map((r) => ({ ...r, x: r.x - info.shift.x, y: r.y - info.shift.y }));
}

/**
 * 依「錨點矩形」與目前的按鈕範圍擺好泡泡並畫出來。
 * 錨點可以是真的頭像，也可以是頭像被收起時改用的畫面頂端虛擬錨點。
 */
function layoutBubble(root: Node, bubble: Node, anchorRect: CenterRect, text: string, avoid: readonly CenterRect[], info: CanvasInfo): void {
    const rect = layoutAvatarBubble({
        anchor: anchorRect,
        canvasWidth: info.w,
        canvasHeight: info.h,
        textLength: text.length,
        fontSize: FONT_SIZE,
        maxWidth: MAX_WIDTH,
        padding: PADDING,
        margin: SCREEN_MARGIN,
        avoid,
    });
    const labelNode = bubble.getChildByName('Text')!;
    const label = labelNode.getComponent(Label)!;
    const font = services().i18n.getFont('body');
    if (font) label.font = font;
    label.string = text;
    labelNode.getComponent(UITransform)!.setContentSize(rect.width - PADDING * 2, rect.height - PADDING * 2);

    bubble.getComponent(UITransform)!.setContentSize(rect.width, rect.height);
    bubble.setPosition(rect.x + info.shift.x, rect.y + info.shift.y, 0);
    const g = bubble.getComponent(Graphics)!;
    g.clear();
    g.fillColor = FILL;
    g.strokeColor = BORDER;
    g.lineWidth = 3;
    g.roundRect(-rect.width / 2, -rect.height / 2, rect.width, rect.height, 14);
    g.fill();
    g.stroke();
    UCUFLogger.info(LogCategory.UI, `[AvatarTalk] root=${root.name} side=${rect.side} overlap=${Math.round(rect.overlap)} → ${text.slice(0, 24)}`);
}

function anchorSignature(rect: CenterRect): string {
    return [rect.x, rect.y, rect.width, rect.height].map((v) => Math.round(v)).join(',');
}

function presentBubble(anchor: Node, text: string, holdSec: number = AVATAR_TALK_HOLD_SEC): void {
    const root = rootOf(anchor);
    if (!root || !anchor.getComponent(UITransform)) return;
    const bubble = ensureBubble(root);
    const info = canvasInfo(root);
    const anchorRect = centeredRect(root, anchor, info)!;
    _current = { anchor, text, anchorSig: anchorSignature(anchorRect) };
    layoutBubble(root, bubble, anchorRect, text, avoidRects(root, anchor, bubble, info), info);

    bubble.active = true;
    _holdUntil = Date.now() + holdSec * 1000;
    raiseBubble(root);
    // 點頭像可能同時開了詳情／換頁（新面板會蓋在上面）：稍後再提到最上層，讓泡泡不被蓋掉，順便依新版面重擺
    for (const delay of RAISE_DELAYS_MS) {
        setTimeout(() => {
            if (!_bubble?.isValid || Date.now() >= _holdUntil) return;
            if (!_bubble.active) _bubble.active = true;
            refreshBubble();
            raiseBubble(_bubble.parent);
        }, delay);
    }
    startWatch();
    if (_hideTimer) clearTimeout(_hideTimer);
    _hideTimer = setTimeout(() => {
        _hideTimer = null;
        _current = null;
        stopWatch();
        if (_bubble?.isValid) _bubble.active = false;
    }, holdSec * 1000);
}

function stopWatch(): void {
    if (_watchTimer) {
        clearTimeout(_watchTimer);
        _watchTimer = null;
    }
}

/** 泡泡還在時定期檢查版面：通用規則「彈出泡泡要避開主要操作列」，操作列比泡泡晚出現也一樣 */
function startWatch(): void {
    stopWatch();
    const tick = (): void => {
        _watchTimer = null;
        if (!_bubble?.isValid || !_bubble.active || Date.now() >= _holdUntil) return;
        refreshBubble();
        _watchTimer = setTimeout(tick, RELAYOUT_POLL_MS);
    };
    _watchTimer = setTimeout(tick, RELAYOUT_POLL_MS);
}

/**
 * 重新檢查泡泡位置：
 *   - 頭像還在畫面上：頭像移動了，或泡泡壓到按鈕，才重擺（沒變就不動，避免每次都重畫）。
 *   - 頭像被收起（例如宿命十連從高光轉結果窗、武將展示區收起）：搬到畫面頂端，同樣避開按鈕。
 */
function refreshBubble(): void {
    const bubble = _bubble;
    const current = _current;
    if (!bubble?.isValid || !current || !bubble.active) return;
    const { anchor, text } = current;
    if (!anchor.isValid || !anchor.activeInHierarchy) {
        rehomeBubble(text);
        return;
    }
    const root = rootOf(anchor);
    if (!root) return;
    if (bubble.parent !== root) ensureBubble(root);
    const info = canvasInfo(root);
    const anchorRect = centeredRect(root, anchor, info);
    const bubbleRect = centeredRect(root, bubble, info);
    if (!anchorRect || !bubbleRect) return;
    const avoid = avoidRects(root, anchor, bubble, info);
    const moved = anchorSignature(anchorRect) !== current.anchorSig;
    if (!moved && !avoid.some((box) => rectsOverlap(bubbleRect, box))) return;
    current.anchorSig = anchorSignature(anchorRect);
    layoutBubble(root, bubble, anchorRect, text, avoid, info);
}

/**
 * 點頭像同時換了頁（例如名冊列頭像 → 進詳情、宿命十連轉結果窗）：原頁整個收起，掛在那頁底下的泡泡會跟著看不到。
 * 這時把泡泡搬到目前還在畫面上的最上層 Canvas，優先擺在上方正中（詳情頁此處是空的），並避開畫面上的按鈕，讓話仍然看得到。
 */
function rehomeBubble(text: string): void {
    const bubble = _bubble;
    const scene = director.getScene();
    if (!bubble?.isValid || !scene) return;
    const canvases = scene.getComponentsInChildren(Canvas).filter((c) => c.node.activeInHierarchy);
    const root = canvases.length > 0 ? canvases[canvases.length - 1].node : null;
    if (!root) return;
    if (bubble.parent !== root) {
        bubble.removeFromParent();
        root.addChild(bubble);
    }
    const info = canvasInfo(root);
    // 虛擬錨點：畫面頂端的一個點，泡泡優先排在它下方
    const topAnchor: CenterRect = { x: 0, y: info.h / 2 - SCREEN_MARGIN - 40, width: 1, height: 1 };
    layoutBubble(root, bubble, topAnchor, text, avoidRects(root, null, bubble, info), info);
}

function raiseBubble(root: Node | null): void {
    if (root?.isValid && _bubble?.isValid) _bubble.setSiblingIndex(root.children.length - 1);
}
