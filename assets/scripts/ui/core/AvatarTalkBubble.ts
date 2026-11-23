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
    type CenterRect,
    type AvatarTalkResult,
} from '../../core/systems/AvatarTalk';
import { HallChatStore, parseChatBook } from '../../core/systems/HallChatLines';
import { LocalLobbyDialogueProvider, type LobbyDialogueProvider } from '../../core/systems/LobbyDialogueProvider';
import { UCUFLogger, LogCategory } from '../../core/utils/UCUFLogger';

const BUBBLE_NODE_NAME = 'AvatarTalkBubble';
/** 顯示後再把泡泡提到最上層的時間點（毫秒）：蓋過點擊後才開出的詳情面板 */
const RAISE_DELAYS_MS = [120, 400, 900, 1600];
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

const _picker = new AvatarTalkPicker({
    provider: () => _provider,
    cacheLine: (generalId) => sharedNpcDialogueCache.latestFor(generalId, services().i18n.currentLocale),
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
    ensureProvider();
    const result = _picker.speak(generalId);
    if (result.kind === 'cooldown') return result;
    const name = services().session.roster.find((general) => general.id === generalId)?.name;
    const text = name ? services().i18n.t('ui.avatarTalk.format', name, result.text) : result.text;
    presentBubble(anchor, text);
    // AI 快取來的新台詞：沿用既有「有感而發」成就（同句、每日上限、友誼加成都在 recordInsightDialogue 裡判）
    if (result.source === 'cache') void applyInsightFromDialogue(generalId, result.text, name ?? generalId);
    return result;
}

/** 立刻關掉泡泡（離開畫面、開面板時可呼叫） */
export function hideAvatarTalk(): void {
    _holdUntil = 0;
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
function collectButtonRects(root: Node, anchor: Node, bubble: Node, maxW: number, maxH: number): CenterRect[] {
    const rects: CenterRect[] = [];
    const stack: Node[] = [root];
    while (stack.length > 0) {
        const node = stack.pop()!;
        if (!node.activeInHierarchy || node === bubble) continue;
        const button = node.getComponent(Button);
        if (button && button.enabled && button.interactable && !anchor.isChildOf(node) && node !== anchor) {
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

function presentBubble(anchor: Node, text: string): void {
    const root = rootOf(anchor);
    if (!root) return;
    const anchorUi = anchor.getComponent(UITransform);
    if (!anchorUi) return;
    const bubble = ensureBubble(root);
    const rootUi = root.getComponent(UITransform);
    const visible = view.getVisibleSize();
    const canvasW = rootUi && rootUi.width > 0 ? rootUi.width : visible.width;
    const canvasH = rootUi && rootUi.height > 0 ? rootUi.height : visible.height;
    // 根節點的原點：有 UITransform 時以其錨點換算，讓座標原點落在畫面中心
    const originShift = rootUi ? new Vec2((0.5 - rootUi.anchorX) * canvasW, (0.5 - rootUi.anchorY) * canvasH) : new Vec2(0, 0);

    const anchorRect = toLocalRect(root, anchorUi);
    const avoid = collectButtonRects(root, anchor, bubble, canvasW * 0.45, canvasH * 0.45)
        .map((r) => ({ ...r, x: r.x - originShift.x, y: r.y - originShift.y }));
    const rect = layoutAvatarBubble({
        anchor: { ...anchorRect, x: anchorRect.x - originShift.x, y: anchorRect.y - originShift.y },
        canvasWidth: canvasW,
        canvasHeight: canvasH,
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
    bubble.setPosition(rect.x + originShift.x, rect.y + originShift.y, 0);
    const g = bubble.getComponent(Graphics)!;
    g.clear();
    g.fillColor = FILL;
    g.strokeColor = BORDER;
    g.lineWidth = 3;
    g.roundRect(-rect.width / 2, -rect.height / 2, rect.width, rect.height, 14);
    g.fill();
    g.stroke();

    bubble.active = true;
    _holdUntil = Date.now() + AVATAR_TALK_HOLD_SEC * 1000;
    raiseBubble(root);
    // 點頭像可能同時開了詳情／換頁（新面板會蓋在上面）：稍後再提到最上層，讓泡泡不被蓋掉
    for (const delay of RAISE_DELAYS_MS) {
        setTimeout(() => {
            if (!_bubble?.isValid || Date.now() >= _holdUntil) return;
            if (!_bubble.active) _bubble.active = true;
            if (!anchor.isValid || !anchor.activeInHierarchy) rehomeBubble();
            raiseBubble(_bubble.parent);
        }, delay);
    }
    if (_hideTimer) clearTimeout(_hideTimer);
    _hideTimer = setTimeout(() => {
        _hideTimer = null;
        if (_bubble?.isValid) _bubble.active = false;
    }, AVATAR_TALK_HOLD_SEC * 1000);
    UCUFLogger.info(LogCategory.UI, `[AvatarTalk] ${anchor.name} root=${root.name} side=${rect.side} overlap=${Math.round(rect.overlap)} → ${text.slice(0, 24)}`);
}

/**
 * 點頭像同時換了頁（例如名冊列頭像 → 進詳情）：原頁整個收起，掛在那頁底下的泡泡會跟著看不到。
 * 這時把泡泡搬到目前還在畫面上的最上層 Canvas，擺在上方正中（詳情頁此處是空的），讓話仍然看得到。
 */
function rehomeBubble(): void {
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
    const rootUi = root.getComponent(UITransform);
    const visible = view.getVisibleSize();
    const canvasH = rootUi && rootUi.height > 0 ? rootUi.height : visible.height;
    const bubbleH = bubble.getComponent(UITransform)?.height ?? 0;
    const shiftY = rootUi ? (0.5 - rootUi.anchorY) * canvasH : 0;
    const shiftX = rootUi ? (0.5 - rootUi.anchorX) * (rootUi.width > 0 ? rootUi.width : visible.width) : 0;
    bubble.setPosition(shiftX, shiftY + canvasH / 2 - bubbleH / 2 - SCREEN_MARGIN - 40, 0);
}

function raiseBubble(root: Node | null): void {
    if (root?.isValid && _bubble?.isValid) _bubble.setSiblingIndex(root.children.length - 1);
}
