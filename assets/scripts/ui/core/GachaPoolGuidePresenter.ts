// @spec-source → 轉蛋系統.md §B-1 雙池分工敘事、§雙池定位導覽、§死亡傳承提示（PROG-2-0563、PROG-2-0565）
/**
 * GachaPoolGuidePresenter — 卡池頁與名將詳情的定位文字（純邏輯，不依賴 cc）
 *
 * 只產生字串，不碰節點；節點由 LobbyScene 與 GeneralDetailBasicsChild 綁定。
 * 死亡傳承提示只在武將已故時附加到來源欄，見 appendDeathLegacyHint。
 *
 * Unity 對照：Presenter 把文案表轉成字串，View 只負責 SetText。
 */
import { DEATH_LEGACY_HINT, GENERAL_POOL_GUIDE, SUPPORT_POOL_GUIDE } from '../../core/systems/GachaPoolGuide';
import { GENERAL_STATUS_DEAD } from '../../core/systems/GeneralAging';

export interface GachaPoolGuideLines {
    /** 名將系列標題行（卡池頁） */
    generalSeries: string;
    /** 支援系列標題行（卡池頁） */
    supportSeries: string;
}

export function buildGachaPoolGuideLines(): GachaPoolGuideLines {
    return {
        generalSeries: GENERAL_POOL_GUIDE,
        supportSeries: SUPPORT_POOL_GUIDE,
    };
}

/** 來源欄文字；已故武將附加死亡傳承提示，存活武將維持原文字 */
export function appendDeathLegacyHint(sourceText: string, status: string | undefined): string {
    if ((status ?? '').toLowerCase() !== GENERAL_STATUS_DEAD) return sourceText;
    return `${sourceText}\n${DEATH_LEGACY_HINT}`;
}
