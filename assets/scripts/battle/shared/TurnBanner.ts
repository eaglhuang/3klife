// @spec-source → 主戰場UI規格書.md (doc_ui_0001)；回合開始提示改用橫幅（使用者 2026-11-06 裁決，PROG-2-1888）
/**
 * TurnBanner.ts — 回合開始橫幅的文字、配色與去抖規則（純邏輯）
 *
 * - 我方藍、敵方紅，與原本 Toast 版本同色。
 * - 去抖戳記放在全域：BattleUIBridge 與 BattleSceneFlow 兩條路徑共用同一個時間戳，避免同一回合跳兩次。
 *
 * Unity 對照：static class 回傳顯示資料，由 View 層決定怎麼畫。
 */
import { Faction } from '../../core/config/Constants';

export interface TurnBannerSpec {
    text: string;
    rgba: readonly [number, number, number, number];
}

const PLAYER_BANNER: TurnBannerSpec = { text: '我方回合開始', rgba: [90, 190, 255, 255] };
const ENEMY_BANNER: TurnBannerSpec = { text: '敵方回合開始', rgba: [255, 110, 110, 255] };

export function turnBannerOf(faction: Faction): TurnBannerSpec {
    return faction === Faction.Player ? PLAYER_BANNER : ENEMY_BANNER;
}

export interface TurnBannerClock {
    __lastTurnBannerTime?: number;
}

/** 距離上次顯示未滿 debounceMs 回傳 false；否則記下這次時間並回傳 true */
export function claimTurnBannerSlot(
    now: number,
    debounceMs: number,
    clock: TurnBannerClock = globalThis as TurnBannerClock,
): boolean {
    const last = clock.__lastTurnBannerTime;
    if (last !== undefined && now - last < debounceMs) return false;
    clock.__lastTurnBannerTime = now;
    return true;
}
