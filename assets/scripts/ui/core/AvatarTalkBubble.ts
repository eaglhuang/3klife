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
import { Canvas, Color, Graphics, Label, Node, UITransform, director } from 'cc';
import { services } from '../../core/managers/ServiceLoader';
import { sharedNpcDialogueCache } from '../../core/dialogue/NpcDialogueCache';
import { applyInsightFromDialogue } from '../../core/dialogue/InsightFlow';
import { FriendshipService } from '../../core/services/FriendshipService';
import {
    AVATAR_TALK_HOLD_SEC,
    AvatarTalkPicker,
    layoutAvatarBubble,
    type AvatarTalkResult,
} from '../../core/systems/AvatarTalk';
import { HallChatStore, parseChatBook } from '../../core/systems/HallChatLines';
import { LocalLobbyDialogueProvider, type LobbyDialogueProvider } from '../../core/systems/LobbyDialogueProvider';
import { UCUFLogger, LogCategory } from '../../core/utils/UCUFLogger';

const BUBBLE_NODE_NAME = 'AvatarTalkBubble';
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
    if (_hideTimer) {
        clearTimeout(_hideTimer);
        _hideTimer = null;
    }
    if (_bubble?.isValid) _bubble.active = false;
}

function canvasOf(anchor: Node): Node | null {
    return anchor.scene?.getComponentInChildren(Canvas)?.node ?? director.getScene()?.getComponentInChildren(Canvas)?.node ?? null;
}

/** 泡泡節點只建一次（場景換掉被銷毀時才重建）；掛 Canvas 最上層 */
function ensureBubble(canvas: Node): Node {
    if (_bubble?.isValid) {
        if (_bubble.parent !== canvas) canvas.addChild(_bubble);
        return _bubble;
    }
    const node = new Node(BUBBLE_NODE_NAME);
    node.layer = canvas.layer;
    node.addComponent(UITransform);
    node.addComponent(Graphics);
    const labelNode = new Node('Text');
    labelNode.layer = canvas.layer;
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
    // 點泡泡就關掉（泡泡本身只吃這一下，不擋其他按鈕：只有泡泡範圍內的點擊會被它收走）
    node.on(Node.EventType.TOUCH_END, () => hideAvatarTalk());
    canvas.addChild(node);
    _bubble = node;
    return node;
}

function presentBubble(anchor: Node, text: string): void {
    const canvas = canvasOf(anchor);
    if (!canvas) return;
    const bubble = ensureBubble(canvas);
    const canvasUi = canvas.getComponent(UITransform);
    const anchorUi = anchor.getComponent(UITransform);
    if (!canvasUi || !anchorUi) return;

    const world = anchor.worldPosition;
    const local = canvasUi.convertToNodeSpaceAR(world);
    // 頭像錨點可能不在中心（anchorY≠0.5）：以實際範圍中心為準
    const centerY = local.y + (0.5 - anchorUi.anchorY) * anchorUi.height * anchor.getWorldScale().y;
    const rect = layoutAvatarBubble({
        anchorX: local.x,
        anchorY: centerY,
        anchorHalfHeight: (anchorUi.height * anchor.getWorldScale().y) / 2,
        canvasWidth: canvasUi.width,
        canvasHeight: canvasUi.height,
        textLength: text.length,
        fontSize: FONT_SIZE,
        maxWidth: MAX_WIDTH,
        padding: PADDING,
        margin: SCREEN_MARGIN,
    });

    const labelNode = bubble.getChildByName('Text')!;
    const label = labelNode.getComponent(Label)!;
    const font = services().i18n.getFont('body');
    if (font) label.font = font;
    label.string = text;
    labelNode.getComponent(UITransform)!.setContentSize(rect.width - PADDING * 2, rect.height - PADDING * 2);

    bubble.getComponent(UITransform)!.setContentSize(rect.width, rect.height);
    bubble.setPosition(rect.x, rect.y, 0);
    const g = bubble.getComponent(Graphics)!;
    g.clear();
    g.fillColor = FILL;
    g.strokeColor = BORDER;
    g.lineWidth = 3;
    g.roundRect(-rect.width / 2, -rect.height / 2, rect.width, rect.height, 14);
    g.fill();
    g.stroke();

    bubble.active = true;
    bubble.setSiblingIndex(canvas.children.length - 1);
    if (_hideTimer) clearTimeout(_hideTimer);
    _hideTimer = setTimeout(() => {
        _hideTimer = null;
        if (_bubble?.isValid) _bubble.active = false;
    }, AVATAR_TALK_HOLD_SEC * 1000);
    UCUFLogger.info(LogCategory.UI, `[AvatarTalk] ${anchor.name} → ${text.slice(0, 24)}`);
}
