// @spec-source → UI-2-0148（UI-2-0123 子項）：幕府大廳主題套用的 Cocos 節點實作
/**
 * LobbyHallThemeNodeView — LobbyHallThemeView 的 Cocos 實作。
 *
 * 在大廳根節點底下以 _ucufId 找節點（UcufNodeLookup），切換 active、換 SpriteFrame、套色。
 * 找不到的節點直接略過（例如節慶槽平時不在 layout 裡），不拋錯。
 * SpriteFrame 載入函式可注入，預設走 resources.load；同一節點連續換圖時只採用最後一次的結果。
 * Unity 對照：像一個持有 Transform 根節點的 ThemeBinder，用 tag 找 Image 後換 sprite 與 color。
 */
import { Color, Node, resources, Sprite, SpriteFrame, UIOpacity } from 'cc';
import type { HallTint } from '../../core/systems/HallTheme';
import type { LobbyHallThemeView } from './LobbyHallThemeApplier';
import { findUcufNode } from './UcufNodeLookup';

export type SpriteFrameLoader = (path: string, done: (frame: SpriteFrame | null) => void) => void;

export const loadSpriteFrameFromResources: SpriteFrameLoader = (path, done) => {
    resources.load(`${path}/spriteFrame`, SpriteFrame, (err, frame) => done(err ? null : frame));
};

/** '#RRGGBB' → [r, g, b]；格式不對回傳 null。 */
export function parseHexRgb(hex: string): [number, number, number] | null {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
    if (!m) return null;
    const v = parseInt(m[1], 16);
    return [(v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff];
}

export class LobbyHallThemeNodeView implements LobbyHallThemeView {
    private readonly _pendingSprite = new Map<string, string>();

    constructor(
        private readonly _root: Node,
        private readonly _loadSprite: SpriteFrameLoader = loadSpriteFrameFromResources,
    ) {}

    setActive(nodeId: string, active: boolean): void {
        const node = findUcufNode(this._root, nodeId);
        if (node) node.active = active;
    }

    setSprite(nodeId: string, path: string): void {
        const node = findUcufNode(this._root, nodeId);
        if (!node) return;
        this._pendingSprite.set(nodeId, path);
        this._loadSprite(path, frame => {
            // 載入期間又換了別張圖，舊結果作廢
            if (this._pendingSprite.get(nodeId) !== path) return;
            this._pendingSprite.delete(nodeId);
            if (!frame || !node.isValid) return;
            const sprite = node.getComponent(Sprite) ?? node.addComponent(Sprite);
            sprite.spriteFrame = frame;
        });
    }

    setTint(nodeId: string, tint: Readonly<HallTint>): void {
        const node = findUcufNode(this._root, nodeId);
        const rgb = parseHexRgb(tint.color);
        if (!node || !rgb) return;
        const alpha = Math.round(Math.min(1, Math.max(0, tint.alpha)) * 255);
        const sprite = node.getComponent(Sprite);
        if (sprite) {
            sprite.color = new Color(rgb[0], rgb[1], rgb[2], alpha);
            return;
        }
        // 沒有 Sprite 的容器（皮膚由子節點繪製）只能調整整體透明度
        const opacity = node.getComponent(UIOpacity) ?? node.addComponent(UIOpacity);
        opacity.opacity = alpha;
    }
}
