// @spec-source → 武將人物介面規格補遺_2026-04-14.md §1 性格圖騰（HUM-02，PROG-2-2009）
/**
 * PersonalityTotem — 四型性格圖騰的圓徽資料：中文名、單字、顏色、意象與提示文案（純邏輯，不依賴 cc）。
 *
 * 規格定案：
 * - 義氣型（綠，兩手相握／結義印）「重情重義，人脈廣布」。
 * - 豪爽型（紅，酒碗／裂帛）「豪氣干雲，廣結善緣」。
 * - 睿智型（藍，羽扇／奏摺）「深謀慮，治世良才」。
 * - 貪玩型（紫，骰子／飛鳥）「放浪不羈，奇遇不斷」。
 * - 人物 Header 緊鄰職能標籤，以小型圓徽呈現。
 *
 * 暫定：規格只寫色名，色碼先取 #3BA55C／#D9453B／#3D7DD8／#8E5BC9，待美術定稿；
 * 圓徽圖示由 Codex 另行繪製，畫面接線另卡。缺性格時回 null 不顯示。
 * Unity 對照：像一張以 enum 為 key 的 ScriptableObject 樣式表。
 */
import type { GeneralPersonalityType } from '../models/GeneralUnit';

export interface PersonalityTotemDef {
    type: GeneralPersonalityType;
    name: string;
    glyph: string;
    color: string;
    motif: string;
    hint: string;
}

export const PERSONALITY_TOTEMS: Readonly<Record<GeneralPersonalityType, PersonalityTotemDef>> = {
    Loyal: { type: 'Loyal', name: '義氣型', glyph: '義', color: '#3BA55C', motif: '兩手相握／結義印', hint: '重情重義，人脈廣布' },
    Brave: { type: 'Brave', name: '豪爽型', glyph: '豪', color: '#D9453B', motif: '酒碗／裂帛', hint: '豪氣干雲，廣結善緣' },
    Wise: { type: 'Wise', name: '睿智型', glyph: '睿', color: '#3D7DD8', motif: '羽扇／奏摺', hint: '深謀慮，治世良才' },
    Playful: { type: 'Playful', name: '貪玩型', glyph: '貪', color: '#8E5BC9', motif: '骰子／飛鳥', hint: '放浪不羈，奇遇不斷' },
};

/** 依性格取圓徽資料；未知或缺值回 null。 */
export function personalityTotemOf(type: string | null | undefined): PersonalityTotemDef | null {
    return type && Object.prototype.hasOwnProperty.call(PERSONALITY_TOTEMS, type)
        ? PERSONALITY_TOTEMS[type as GeneralPersonalityType]
        : null;
}

/** 圓徽的提示文字，如「義氣型：重情重義，人脈廣布」。 */
export function personalityTotemTooltip(type: string | null | undefined): string {
    const t = personalityTotemOf(type);
    return t ? `${t.name}：${t.hint}` : '';
}
