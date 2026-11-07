// @spec-source → 戰場武將單挑對決與斬將功能規格書 (doc_spec_0314) §4 勝負結算、§5 TC-DUEL-03/04（NUM-03，PROG-2-1940）
/**
 * DuelOutcome — 單挑勝負結算規則（純邏輯，不依賴 cc）。
 *
 * 規格定案：
 * - 勝方：主將 +15 斬將戰功名聲（走 InBattleAscension 的 DUEL_VICTORY 來源，可觸發即時升階）；
 *   全軍士氣拉滿 100、暴擊率 +15% 持續 2 回合；若直接擊殺敵將，敵全軍潰散、喪失當回合行動。
 * - 敗方：被斬殺 → 陣亡結算，產出傳承虎符卡並寫戰歿遺書；負傷敗逃 → 主將 HP 歸 1、分隊兵力崩 50%。
 *
 * 單挑接受判定與拒絕懲罰既有實作在 AiDuelDecision / BattleGeneralDuelFlow，本檔只補勝負後的效果清單。
 * 暫定：三回合死鬥演出、虎符卡品質（doc_spec_0313）與 BattleGeneralDuelFlow 接線另卡。
 * Unity 對照：像戰鬥結算的 static helper，輸出一份「要套用哪些效果」的資料，由 Controller 實際改狀態。
 */
import { applyBattleFame, BattleAscendCandidate, BattleAscendResult, BattleFameSource } from './InBattleAscension';
import { epitaphTypeFor, EpitaphType } from '../../core/systems/ChildUnveiling';

export const DUEL_WINNER_MORALE = 100;
export const DUEL_WINNER_CRIT_BONUS = 0.15;
export const DUEL_WINNER_BUFF_TURNS = 2;
export const DUEL_FLEE_HP = 1;
export const DUEL_FLEE_SQUAD_LOSS_RATIO = 0.5;

export interface DuelWinnerEffects {
    morale: number;
    critBonus: number;
    buffTurns: number;
}

export interface DuelLoserEffects {
    killed: boolean;
    /** 敗逃時主將 HP 設為此值；被斬殺時為 0 */
    commanderHp: number;
    /** 敗逃時分隊兵力損失比例；被斬殺時 0（交給陣亡結算） */
    squadLossRatio: number;
    /** 被斬殺時敵全軍潰散、喪失當回合行動 */
    armyRouted: boolean;
    /** 被斬殺時需產出傳承虎符卡 */
    dropsLegacyTally: boolean;
    /** 被斬殺時的告別信類型 */
    epitaph: EpitaphType | null;
}

export interface DuelOutcome<T extends BattleAscendCandidate> {
    winner: BattleAscendResult<T>;
    winnerEffects: DuelWinnerEffects;
    loserEffects: DuelLoserEffects;
}

/** 單挑分出勝負後的效果清單；winner 的功業名聲透過 applyBattleFame 結算（可能即時升階）。 */
export function resolveDuelOutcome<T extends BattleAscendCandidate>(winner: T, loserKilled: boolean): DuelOutcome<T> {
    return {
        winner: applyBattleFame(winner, [BattleFameSource.DUEL_VICTORY]),
        winnerEffects: { morale: DUEL_WINNER_MORALE, critBonus: DUEL_WINNER_CRIT_BONUS, buffTurns: DUEL_WINNER_BUFF_TURNS },
        loserEffects: loserKilled
            ? { killed: true, commanderHp: 0, squadLossRatio: 0, armyRouted: true, dropsLegacyTally: true, epitaph: epitaphTypeFor('battle', 0) }
            : { killed: false, commanderHp: DUEL_FLEE_HP, squadLossRatio: DUEL_FLEE_SQUAD_LOSS_RATIO, armyRouted: false, dropsLegacyTally: false, epitaph: null },
    };
}

/** 敗逃後的分隊兵力（無條件捨去）。 */
export function troopsAfterDuelFlee(currentTroops: number): number {
    return Math.max(0, Math.floor(currentTroops * (1 - DUEL_FLEE_SQUAD_LOSS_RATIO)));
}
