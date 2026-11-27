// @spec-source → 彈窗武將頭像與台詞規格書 (doc_spec_1343)；PROG-2-10129
/**
 * PopupGeneralSpeaker — 彈窗共用的「武將大頭像＋一句台詞」（View 層）。
 *
 * 少年投靠、名士占卜、家族血統樹三個彈窗共用；之後別的彈窗要掛頭像也走這裡。
 * - 頭像來源：avatars → 立繪 → 預設剪影（見 loadPopupSpeakerFrame），不新增圖集、只重用既有貼圖。
 * - 位置全用「父節點尺寸的比例」，父節點尺寸變了（SIZE_CHANGED）自動重排，不寫死像素座標。
 * - 節點依 slot 名稱重用：同一個彈窗再開、換人只改圖與文字，不重建節點。
 * - 台詞字串由呼叫端用 PopupSpeakerLine 備好；字串為空就只顯示頭像、不畫對話框。
 *
 * Unity 對照：像一個掛在 Canvas 面板上的 PortraitBadge prefab，RectTransform 全用 anchor 比例。
 */
import { Color, Graphics, Label, Mask, Node, Sprite, UITransform, type SpriteFrame } from 'cc';
import { loadGeneralAvatar, loadGeneralPortrait } from './GeneralAvatarLoader';

/** 全部是「父節點尺寸的比例」；x、y 取 0~1（0,0 為左下角），為元件中心點 */
export interface PopupSpeakerPlacement {
    /** 頭像中心 */
    avatarX: number;
    avatarY: number;
    /** 頭像邊長，佔父節點「高度」的比例 */
    avatarSize: number;
    /** 對話框；不給就不畫（台詞由呼叫端放在自己的文字上） */
    bubble?: { x: number; y: number; width: number; height: number };
}

export interface PopupSpeakerContent {
    generalId: string;
    /** 空字串＝不畫對話框 */
    line: string;
}

const NODE_PREFIX = 'PopupSpeaker_';
const AVATAR_HOLDER = 'AvatarHolder';
const AVATAR_SPRITE = 'AvatarSprite';
const AVATAR_RING = 'AvatarRing';
const BUBBLE = 'Bubble';
const BUBBLE_TEXT = 'BubbleText';
const BUBBLE_FILL = new Color(28, 22, 16, 235);
const BUBBLE_BORDER = new Color(214, 178, 96, 255);
const BUBBLE_TEXT_COLOR = new Color(250, 240, 214, 255);
const RING_COLOR = new Color(214, 178, 96, 255);
const BUBBLE_RADIUS = 12;

/** 節點目前綁的設定；換人、重排時用 */
interface SpeakerState {
    placement: PopupSpeakerPlacement;
    generalId: string;
    /** 非同步載圖的世代：換人後舊的回應不能蓋掉新的 */
    ticket: number;
}
const _states = new WeakMap<Node, SpeakerState>();
const _watched = new WeakSet<Node>();

/** 頭像 → 立繪 → 預設剪影；全部失敗回 null（節點留空白，不報錯） */
export async function loadPopupSpeakerFrame(generalId: string): Promise<SpriteFrame | null> {
    return (await loadGeneralAvatar(generalId, false))
        ?? (await loadGeneralPortrait(generalId))
        ?? (await loadGeneralAvatar(generalId, true));
}

function child(parent: Node, name: string): Node | null {
    return parent.getChildByName(name);
}

function newNode(parent: Node, name: string): Node {
    const node = new Node(name);
    node.layer = parent.layer;
    node.addComponent(UITransform);
    parent.addChild(node);
    return node;
}

function ensureRoot(parent: Node, slot: string): Node {
    const name = NODE_PREFIX + slot;
    const existing = child(parent, name);
    if (existing) return existing;
    const root = newNode(parent, name);
    // 頭像：圓形遮罩＋Sprite＋金色外框
    const holder = newNode(root, AVATAR_HOLDER);
    holder.addComponent(Mask).type = Mask.Type.GRAPHICS_ELLIPSE;
    const sprite = newNode(holder, AVATAR_SPRITE).addComponent(Sprite);
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    newNode(root, AVATAR_RING).addComponent(Graphics);
    const bubble = newNode(root, BUBBLE);
    bubble.addComponent(Graphics);
    const text = newNode(bubble, BUBBLE_TEXT);
    const label = text.addComponent(Label);
    label.overflow = Label.Overflow.SHRINK;
    label.enableWrapText = true;
    label.horizontalAlign = Label.HorizontalAlign.LEFT;
    label.verticalAlign = Label.VerticalAlign.CENTER;
    label.color = BUBBLE_TEXT_COLOR;
    return root;
}

/** 依父節點目前尺寸重排；父節點尺寸為 0（還沒版面）時略過，等 SIZE_CHANGED */
function layout(parent: Node, root: Node, placement: PopupSpeakerPlacement): void {
    const transform = parent.getComponent(UITransform);
    if (!transform || transform.width <= 0 || transform.height <= 0) return;
    const { width, height, anchorX, anchorY } = transform;
    const at = (fx: number, fy: number): [number, number] => [(fx - anchorX) * width, (fy - anchorY) * height];
    root.setPosition(0, 0, 0);

    const size = Math.round(placement.avatarSize * height);
    const holder = child(root, AVATAR_HOLDER)!;
    const [ax, ay] = at(placement.avatarX, placement.avatarY);
    holder.setPosition(ax, ay, 0);
    holder.getComponent(UITransform)!.setContentSize(size, size);
    child(holder, AVATAR_SPRITE)!.getComponent(UITransform)!.setContentSize(size, size);
    const ring = child(root, AVATAR_RING)!;
    ring.setPosition(ax, ay, 0);
    const ringGraphics = ring.getComponent(Graphics)!;
    ringGraphics.clear();
    ringGraphics.strokeColor = RING_COLOR;
    ringGraphics.lineWidth = Math.max(2, Math.round(size / 36));
    ringGraphics.circle(0, 0, size / 2);
    ringGraphics.stroke();

    const bubble = child(root, BUBBLE)!;
    const rect = placement.bubble;
    bubble.active = !!rect && (bubble.getChildByName(BUBBLE_TEXT)!.getComponent(Label)!.string !== '');
    if (!rect) return;
    const bw = Math.round(rect.width * width);
    const bh = Math.round(rect.height * height);
    const [bx, by] = at(rect.x, rect.y);
    bubble.setPosition(bx, by, 0);
    bubble.getComponent(UITransform)!.setContentSize(bw, bh);
    const g = bubble.getComponent(Graphics)!;
    g.clear();
    g.fillColor = BUBBLE_FILL;
    g.strokeColor = BUBBLE_BORDER;
    g.lineWidth = 2;
    g.roundRect(-bw / 2, -bh / 2, bw, bh, BUBBLE_RADIUS);
    g.fill();
    g.stroke();
    const textNode = bubble.getChildByName(BUBBLE_TEXT)!;
    const pad = Math.round(bh * 0.12);
    textNode.getComponent(UITransform)!.setContentSize(bw - pad * 2, bh - pad * 2);
    const label = textNode.getComponent(Label)!;
    label.fontSize = Math.max(14, Math.min(26, Math.round(bh * 0.26)));
    label.lineHeight = Math.round(label.fontSize * 1.3);
}

/**
 * 在 parent 上顯示（或更新）一位說話的武將。slot 區分同一父節點上的多個說話者（如少年三選一的每一列）。
 * 回傳根節點供呼叫端控制顯示／隱藏。
 */
export function showPopupSpeaker(parent: Node, slot: string, content: PopupSpeakerContent, placement: PopupSpeakerPlacement): Node {
    const root = ensureRoot(parent, slot);
    root.active = true;
    const prev = _states.get(root);
    const ticket = (prev?.ticket ?? 0) + 1;
    _states.set(root, { placement, generalId: content.generalId, ticket });

    const label = root.getChildByName(BUBBLE)!.getChildByName(BUBBLE_TEXT)!.getComponent(Label)!;
    label.string = content.line;
    layout(parent, root, placement);
    if (!_watched.has(parent)) {
        _watched.add(parent);
        parent.on(Node.EventType.SIZE_CHANGED, () => relayout(parent));
    }

    // 同一個人且已載好圖就不重載
    const sprite = child(child(root, AVATAR_HOLDER)!, AVATAR_SPRITE)!.getComponent(Sprite)!;
    if (prev?.generalId !== content.generalId || !sprite.spriteFrame) {
        sprite.spriteFrame = null;
        void loadPopupSpeakerFrame(content.generalId).then((frame) => {
            if (_states.get(root)?.ticket !== ticket || !root.isValid) return;
            sprite.spriteFrame = frame;
        });
    }
    return root;
}

function relayout(parent: Node): void {
    parent.children.forEach((node) => {
        if (!node.name.startsWith(NODE_PREFIX)) return;
        const state = _states.get(node);
        if (state) layout(parent, node, state.placement);
    });
}

/** 收起某個 slot（彈窗關閉或該列沒人時） */
export function hidePopupSpeaker(parent: Node, slot: string): void {
    const root = child(parent, NODE_PREFIX + slot);
    if (root) root.active = false;
}

/** 在節點底下依名稱找第一個符合的後代（版面檔裡沒有 id 的容器用） */
export function findPopupNode(root: Node, name: string): Node | null {
    if (root.name === name) return root;
    for (const node of root.children) {
        const found = findPopupNode(node, name);
        if (found) return found;
    }
    return null;
}

/** 少年三選一：每一列左側一顆頭像，台詞已併進該列文字，不畫對話框 */
export const YOUTH_ROW_SPEAKER_SLOT = 'row';
export const YOUTH_ROW_SPEAKER_PLACEMENT: PopupSpeakerPlacement = { avatarX: 0.07, avatarY: 0.5, avatarSize: 0.86 };

/** 名士占卜：名士欄左側頭像，右上角對話框（名字與偏好文字讓出右側 420px、左側 130px，見 sage-oracle-main.json） */
export const SAGE_SPEAKER_SLOT = 'sage';
export const SAGE_SPEAKER_PLACEMENT: PopupSpeakerPlacement = {
    avatarX: 0.072, avatarY: 0.65, avatarSize: 0.55,
    bubble: { x: 0.78, y: 0.67, width: 0.4, height: 0.5 },
};
