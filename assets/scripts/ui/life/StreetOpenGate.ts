// @spec-source → Q版社會總規格書 QSOC-01 第 9.5 節（市井大街開放時機，使用者 11/28 裁決）；PROG-2-10219
/**
 * StreetOpenGate — 市井大街開放條件旗標（純邏輯，不依賴 cc）
 *
 * 職責：依 life-street-open.json 判斷市井大街是否已開放（第一場戰鬥打完、已到第一季中段以後）。
 * 不負責：家臣帶主角逛大街的教學演出（規格列為待辦，尚未實作）、戰鬥結果怎麼來。
 */
import openData from '../../../resources/data/life-street-open.json';

export interface StreetOpenConfig {
    openAfterFirstBattle: boolean;
    openSeasonMin: number;
    tutorialEscortRequired: boolean;
}

export interface StreetOpenFacts {
    /** 玩家是否已打完第一場戰鬥 */
    firstBattleDone: boolean;
    /** 目前遊戲季序號（第一季＝1） */
    seasonIndex: number;
    /** 家臣帶逛的教學是否已播過（教學演出尚未實作前，呼叫端可暫以 true 代入） */
    tutorialDone?: boolean;
}

export const DEFAULT_STREET_OPEN_CONFIG: StreetOpenConfig = openData as unknown as StreetOpenConfig;

export function isStreetOpen(facts: StreetOpenFacts, config: StreetOpenConfig = DEFAULT_STREET_OPEN_CONFIG): boolean {
    if (config.openAfterFirstBattle && !facts.firstBattleDone) return false;
    if (facts.seasonIndex < config.openSeasonMin) return false;
    if (config.tutorialEscortRequired && !facts.tutorialDone) return false;
    return true;
}
