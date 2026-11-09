// @spec-source → 武將人物介面規格補遺_2026-04-14.md §1.2 性格圖騰（HUM-02，PROG-2-2127）
/**
 * UIPersonalityBadge — 人物頁標頭的性格圓徽：顯示資料與擺放位置（純函式，不碰畫面節點）。
 *
 * 性格來源沿用 offlinePersonalityOf（明確設定 → 具名名將 → 最高屬性），
 * 所以離線行為與人物頁看到的性格一定一致。
 * Unity 對照：像把 ScriptableObject 樣式表轉成給 View 用的 ViewModel。
 */
import { offlinePersonalityOf, type OfflineBehaviorGeneral } from '../../core/systems/OfflinePersonalityBehavior';
import { personalityTotemOf, personalityTotemTooltip } from '../../core/systems/PersonalityTotem';

export interface PersonalityBadgeView {
    glyph: string;
    color: string;
    tooltip: string;
}

/** 圓徽半徑與它和文字之間的間距（px），比職能標籤的 17px 字略大 */
export const PERSONALITY_BADGE_RADIUS = 13;
export const PERSONALITY_BADGE_GAP = 10;

/** 文字水平對齊，數值與 cc.Label.HorizontalAlign 相同 */
export type BadgeTextAlign = 0 | 1 | 2;

export function personalityBadgeOf(general: OfflineBehaviorGeneral): PersonalityBadgeView | null {
    const type = offlinePersonalityOf(general);
    const totem = personalityTotemOf(type);
    return totem ? { glyph: totem.glyph, color: totem.color, tooltip: personalityTotemTooltip(type) } : null;
}

/** 估文字寬度：全形字佔滿字級、半形字約 0.6 字級，每字再加字距。 */
export function estimateLabelTextWidth(text: string, fontSize: number, letterSpacing: number): number {
    let width = 0;
    for (const ch of text) {
        width += (ch.charCodeAt(0) > 0xff ? fontSize : fontSize * 0.6) + letterSpacing;
    }
    return width;
}

/**
 * 圓徽中心相對於文字節點中心的 x：貼在文字右邊，但不超出節點右緣。
 * @param anchorX 文字節點的 anchorX
 * @param width 文字節點寬度
 */
export function personalityBadgeOffsetX(textWidth: number, width: number, anchorX: number, align: BadgeTextAlign): number {
    const left = -width * anchorX;
    const right = left + width;
    const shown = Math.min(textWidth, width);
    const textRight = align === 0 ? left + shown : align === 1 ? left + (width + shown) / 2 : right;
    return Math.min(textRight + PERSONALITY_BADGE_GAP + PERSONALITY_BADGE_RADIUS, right - PERSONALITY_BADGE_RADIUS);
}
