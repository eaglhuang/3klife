// @spec-source → 使用者裁定 2026-11-23（武將名稱旁顯示縮小頭像）；PROG-2-9844
/**
 * GeneralNameTag — 名字標籤旁的縮小武將頭像（共用元件）。
 *
 * 用法：applyGeneralNameTag(labelNode, generalId, name)。標籤節點掛在名字 Label 的同層，
 * 同一個 Label 只會建一次，之後重複呼叫只改內容（節點重用，不重複建立貼圖）。
 * 頭像沒有或載入失敗時畫名字首字圓章；generalId 為空時隱藏標籤並還原名字位置。
 *
 * 顏色來自主題 token（nameTag.*），字串在 GeneralNameTagModel 解析；文字不寫死。
 * 圖集：只取既有的 avatars/*_avatar 貼圖，不新增圖集。
 */
import { Color, Graphics, HorizontalTextAlignment, Label, Node, Sprite, UITransform, VerticalTextAlignment, Widget } from 'cc';
import { services } from '../../core/managers/ServiceLoader';
import { ThemeService } from '../core/ThemeService';
import type { ThemeRegistry } from '../core/UIThemeResolver';
import { loadGeneralAvatar } from '../core/GeneralAvatarLoader';
import {
    NAME_TAG_AVATAR_SIZE,
    NAME_TAG_GAP,
    NAME_TAG_STYLE_FALLBACK,
    type NameTagStyle,
    nameTagAvatarCandidates,
    nameTagInitial,
    resolveNameTagStyle,
} from '../core/GeneralNameTagModel';

const THEME_REGISTRY_PATH = 'ui-spec/themes/theme-registry';
const TAG_PREFIX = 'NameTag_';
const AVATAR_NODE = 'Avatar';
const SEAL_NODE = 'Seal';
const SEAL_TEXT_NODE = 'SealText';

let _style: Promise<NameTagStyle> | null = null;
/** 名字 Label 原本的 x（套用標籤時會往右推開）。 */
const _baseX = new WeakMap<Node, number>();
/** 每個標籤最後一次請求的序號，舊的非同步載入結果直接丟棄。 */
const _requestSeq = new WeakMap<Node, number>();
/** 已掛上尺寸監聽的名字 Label。 */
const _watched = new WeakSet<Node>();
/** 名字 Label 若由 Widget 管位置（left 對齊），原本的 left 邊距；直接改座標會被 Widget 蓋回去。 */
const _baseLeft = new WeakMap<Node, number>();

/** 讀主題登錄表取得標籤樣式；讀不到就用墊底色，只載入一次。 */
export function loadGeneralNameTagStyle(): Promise<NameTagStyle> {
    if (!_style) {
        _style = services().resource.loadJson(THEME_REGISTRY_PATH)
            .then((registry: unknown) => {
                const theme = new ThemeService();
                theme.setRegistry(registry as ThemeRegistry);
                return resolveNameTagStyle((key) => theme.token(key));
            })
            .catch(() => NAME_TAG_STYLE_FALLBACK);
    }
    return _style;
}

/** 在名字 Label 旁套用武將名稱標籤；labelNode 必須已掛在場景上。 */
export function applyGeneralNameTag(labelNode: Node, generalId: string, name: string, style: NameTagStyle): void {
    const parent = labelNode.parent;
    if (!parent) return;
    const avatarIds = nameTagAvatarCandidates(generalId);
    if (avatarIds.length === 0) {
        hideGeneralNameTag(labelNode);
        return;
    }
    const tag = ensureTag(parent, labelNode, style);
    tag.active = true;
    placeTag(labelNode, tag);
    watchLabelSize(labelNode);
    setSeal(tag, nameTagInitial(name));
    showSeal(tag, true);

    const seq = (_requestSeq.get(tag) ?? 0) + 1;
    _requestSeq.set(tag, seq);
    void loadGeneralAvatar(generalId, false).then((frame) => {
        if (!frame || !tag.isValid || _requestSeq.get(tag) !== seq) return;
        const sprite = tag.getChildByName(AVATAR_NODE)?.getComponent(Sprite);
        if (!sprite) return;
        // 先鎖 CUSTOM 再換圖：預設 TRIMMED 模式換圖會把節點撐成原圖大小（頭像會變整張立繪那麼大）
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        sprite.spriteFrame = frame;
        sprite.node.getComponent(UITransform)?.setContentSize(NAME_TAG_AVATAR_SIZE, NAME_TAG_AVATAR_SIZE);
        showSeal(tag, false);
    });
}

/** 依 FlowView 的 nameTags 一次套用到畫面：key 為文字節點 id；找不到節點的項目略過。 */
export function applyGeneralNameTags(
    binder: { getNode(id: string): Node | null },
    tags: Readonly<Record<string, { generalId: string; name: string }>> | undefined,
    style: NameTagStyle,
): void {
    if (!tags) return;
    for (const [id, tag] of Object.entries(tags)) {
        const labelNode = binder.getNode(id);
        if (!labelNode) continue;
        if (tag.generalId) applyGeneralNameTag(labelNode, tag.generalId, tag.name, style);
        else hideGeneralNameTag(labelNode);
    }
}

/** 隱藏名字標籤並還原名字位置（沒有武將時用）。 */
export function hideGeneralNameTag(labelNode: Node): void {
    const parent = labelNode.parent;
    const tag = parent?.getChildByName(TAG_PREFIX + labelNode.name);
    if (tag) {
        _requestSeq.set(tag, (_requestSeq.get(tag) ?? 0) + 1);
        tag.active = false;
    }
    const baseLeft = _baseLeft.get(labelNode);
    const widget = labelNode.getComponent(Widget);
    if (baseLeft !== undefined && widget) {
        widget.left = baseLeft;
        widget.updateAlignment();
    }
    const baseX = _baseX.get(labelNode);
    if (baseX !== undefined) labelNode.setPosition(baseX, labelNode.position.y, labelNode.position.z);
}

function ensureTag(parent: Node, labelNode: Node, style: NameTagStyle): Node {
    const tagName = TAG_PREFIX + labelNode.name;
    const existing = parent.getChildByName(tagName);
    if (existing) return existing;

    const tag = new Node(tagName);
    tag.addComponent(UITransform).setContentSize(NAME_TAG_AVATAR_SIZE, NAME_TAG_AVATAR_SIZE);
    parent.addChild(tag);

    const avatar = new Node(AVATAR_NODE);
    avatar.addComponent(UITransform).setContentSize(NAME_TAG_AVATAR_SIZE, NAME_TAG_AVATAR_SIZE);
    avatar.addComponent(Sprite);
    tag.addChild(avatar);

    const seal = new Node(SEAL_NODE);
    seal.addComponent(UITransform).setContentSize(NAME_TAG_AVATAR_SIZE, NAME_TAG_AVATAR_SIZE);
    seal.addComponent(Graphics);
    tag.addChild(seal);

    const sealText = new Node(SEAL_TEXT_NODE);
    sealText.addComponent(UITransform).setContentSize(NAME_TAG_AVATAR_SIZE, NAME_TAG_AVATAR_SIZE);
    const label = sealText.addComponent(Label);
    label.fontSize = Math.round(NAME_TAG_AVATAR_SIZE * 0.55);
    label.lineHeight = NAME_TAG_AVATAR_SIZE;
    label.horizontalAlign = HorizontalTextAlignment.CENTER;
    label.verticalAlign = VerticalTextAlignment.CENTER;
    seal.addChild(sealText);

    // 程式建立的節點預設在 DEFAULT 圖層，UI 相機看不到，要跟父節點同圖層
    const setLayer = (n: Node): void => { n.layer = parent.layer; n.children.forEach(setLayer); };
    setLayer(tag);

    setSealColors(tag, style);
    return tag;
}

/** 名字 Label 的寬度常在面板開啟後才被版面撐開；尺寸一變就重排，頭像才貼得住名字左緣。 */
function watchLabelSize(labelNode: Node): void {
    if (_watched.has(labelNode)) return;
    _watched.add(labelNode);
    labelNode.on(Node.EventType.SIZE_CHANGED, () => {
        const tag = labelNode.parent?.getChildByName(TAG_PREFIX + labelNode.name);
        if (tag?.active) placeTag(labelNode, tag);
    });
}

/** 依標籤 Label 的對齊方式決定：靠左時把名字往右推，頭像放在名字最左側。 */
function placeTag(labelNode: Node, tag: Node): void {
    const label = labelNode.getComponent(Label);
    const labelTransform = labelNode.getComponent(UITransform);
    const offset = NAME_TAG_AVATAR_SIZE + NAME_TAG_GAP;
    const leftAligned = !label || label.horizontalAlign === HorizontalTextAlignment.LEFT;

    const widget = labelNode.getComponent(Widget);
    if (leftAligned && widget?.isAlignLeft && widget.isAbsoluteLeft) {
        // Widget 每幀會把 Label 擺回原位，座標推開不會生效：改推 left 邊距並立刻重算，再貼著名字左緣放頭像
        if (!_baseLeft.has(labelNode)) _baseLeft.set(labelNode, widget.left);
        widget.left = _baseLeft.get(labelNode)! + offset;
        widget.updateAlignment();
        const left = labelNode.position.x - (labelTransform?.width ?? 0) * (labelTransform?.anchorX ?? 0.5);
        tag.setPosition(left - NAME_TAG_GAP - NAME_TAG_AVATAR_SIZE / 2, labelNode.position.y, 0);
        return;
    }

    if (!_baseX.has(labelNode)) _baseX.set(labelNode, labelNode.position.x);
    const baseX = _baseX.get(labelNode)!;
    const anchorX = labelTransform?.anchorX ?? 0.5;
    const labelWidth = labelTransform?.width ?? 0;
    const leftEdge = baseX - labelWidth * anchorX;

    if (leftAligned) {
        labelNode.setPosition(baseX + offset, labelNode.position.y, labelNode.position.z);
        tag.setPosition(leftEdge + NAME_TAG_AVATAR_SIZE / 2, labelNode.position.y, 0);
    } else {
        labelNode.setPosition(baseX, labelNode.position.y, labelNode.position.z);
        tag.setPosition(leftEdge - NAME_TAG_GAP - NAME_TAG_AVATAR_SIZE / 2, labelNode.position.y, 0);
    }
}

function showSeal(tag: Node, seal: boolean): void {
    const sealNode = tag.getChildByName(SEAL_NODE);
    const avatarNode = tag.getChildByName(AVATAR_NODE);
    if (sealNode) sealNode.active = seal;
    if (avatarNode) avatarNode.active = !seal;
}

function setSeal(tag: Node, initial: string): void {
    const text = tag.getChildByName(SEAL_NODE)?.getChildByName(SEAL_TEXT_NODE)?.getComponent(Label);
    if (text) text.string = initial;
}

function setSealColors(tag: Node, style: NameTagStyle): void {
    const g = tag.getChildByName(SEAL_NODE)?.getComponent(Graphics);
    const text = tag.getChildByName(SEAL_NODE)?.getChildByName(SEAL_TEXT_NODE)?.getComponent(Label);
    if (!g) return;
    const r = NAME_TAG_AVATAR_SIZE / 2;
    g.clear();
    g.fillColor = Color.fromHEX(new Color(), style.sealColor);
    g.circle(0, 0, r);
    g.fill();
    g.strokeColor = Color.fromHEX(new Color(), style.ringColor);
    g.lineWidth = 2;
    g.circle(0, 0, r - 1);
    g.stroke();
    if (text) text.color = Color.fromHEX(new Color(), style.sealTextColor);
}
