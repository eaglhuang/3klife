import { setSpriteFillColor } from '../components/SolidBackground';
import { Color, Node, Sprite, UIOpacity } from 'cc';

/**
 * UIContentNodeVisual — 內容契約欄位的「字串值 → 節點視覺」對照（BMV3-02 接線，PROG-2-2064）
 *
 * 契約欄位可宣告 nodeVisual，讓 state 內容的列舉字串直接換節點的透明度或 sprite 顏色，
 * 例如命鏡的 spiritBrightness（dim/normal/bright）、auraColor（gold/purple/blue/silver）。
 * 對照表放在契約 JSON，不寫死在程式；值不在對照表內時不動節點。
 *
 * Unity 對照：像 Inspector 上一張 enum → CanvasGroup.alpha / Image.color 的對照表。
 */
export interface ContentNodeVisualSpec {
    /** 值 → UIOpacity.opacity（0~255），節點沒有 UIOpacity 時自動補上 */
    opacity?: Record<string, number>;
    /** 值 → Sprite.color（#RRGGBB 或 #RRGGBBAA），節點沒有 Sprite 時略過 */
    spriteColor?: Record<string, string>;
}

/** 依對照表套用節點視覺；有套到任何一項回傳 true */
export function applyContentNodeVisual(node: Node, spec: ContentNodeVisualSpec, value: string): boolean {
    let applied = false;
    const opacity = spec.opacity?.[value];
    if (typeof opacity === 'number') {
        const comp = node.getComponent(UIOpacity) ?? node.addComponent(UIOpacity);
        comp.opacity = Math.max(0, Math.min(255, Math.round(opacity)));
        applied = true;
    }
    const hex = spec.spriteColor?.[value];
    const color = typeof hex === 'string' ? parseHexColor(hex) : null;
    const sprite = color ? node.getComponent(Sprite) : null;
    if (sprite && color) {
        setSpriteFillColor(sprite, color);
        applied = true;
    }
    return applied;
}

function parseHexColor(hex: string): Color | null {
    const match = /^#?([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(hex.trim());
    if (!match) return null;
    const rgb = parseInt(match[1], 16);
    const alpha = match[2] ? parseInt(match[2], 16) : 255;
    return new Color((rgb >> 16) & 0xff, (rgb >> 8) & 0xff, rgb & 0xff, alpha);
}
