// @spec-source → 可結緣女性來源系統.md §H 字串（UI_SRC_*、UI_QUALITY_TAG）、§I 欄位（PROG-2-0247，女武將 UI 用）
/**
 * FemaleSourcePresenter — 女武將資訊頁的來源標籤（純邏輯，不依賴 cc）
 *
 * 把 FemaleSource 轉成 UI 要顯示的文字：來源名稱與「來源品質：{Source} ({Quality})」。
 * 沒有來源紀錄的武將（舊檔、男將）回傳 null，UI 就不顯示這一行。
 * 字串為規格預設值（暫定，待 P0 UI_ 字串表定案）；規格寫的「」引號不放進顯示文字。
 *
 * Unity 對照：像 Presenter 把 ScriptableObject 的來源欄位翻成 Label 文字，View 只負責擺上去。
 */
import type { FemaleSource, FemaleSourceType } from './FemaleSource';

/** 來源標籤預設文字（§H） */
export const FEMALE_SOURCE_LABEL: Readonly<Record<FemaleSourceType, string>> = Object.freeze({
    GACHA: '天命召喚',
    MERCENARY: '傭兵結義',
    CAPTIVE: '戰俘招降',
    DUNGEON: '民間尋訪',
    OFFSPRING: '血脈傳承',
});

export interface FemaleSourcePresentation {
    sourceLabel: string;
    /** 「來源品質：{Source} ({Quality})」 */
    qualityTag: string;
    /** 送禮好感只對戰俘與傭兵顯示（§I） */
    showGiftAffinity: boolean;
    giftAffinity: number;
}

export function femaleSourcePresentationOf(source: FemaleSource | null | undefined): FemaleSourcePresentation | null {
    if (!source) return null;
    const sourceLabel = FEMALE_SOURCE_LABEL[source.Source_Type];
    return {
        sourceLabel,
        qualityTag: `來源品質：${sourceLabel} (${source.Quality_Grade})`,
        showGiftAffinity: source.Source_Type === 'CAPTIVE' || source.Source_Type === 'MERCENARY',
        giftAffinity: source.Gift_Affinity,
    };
}
