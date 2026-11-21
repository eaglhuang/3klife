// @spec-source → 轉蛋系統.md (doc_spec_0042)；GCH-R4（PROG-2-9463）：從 LocalGachaService 抽出，讓共通 API 轉接層不必引用依賴場景服務的檔案
/** 轉蛋稀有度推論與結果文字（純函式，不依賴 cc） */
import type { GeneralConfig, GeneralDetailRarityTier } from '../models/GeneralUnit';

export function inferRarityTier(general: GeneralConfig): GeneralDetailRarityTier {
    const explicit = general.rarityTier;
    if (explicit) {
        return explicit;
    }

    switch (general.characterCategory) {
        case 'mythical':
            return 'mythic';
        case 'titled':
            return 'legendary';
        case 'famed':
            return 'epic';
        case 'general':
            return 'rare';
        case 'civilian':
        default:
            return 'common';
    }
}

export function formatDrawResultText(index: number, general: GeneralConfig, rarityTier: GeneralDetailRarityTier): string {
    return `#${index + 1} [${rarityTier}] ${general.name}`;
}
