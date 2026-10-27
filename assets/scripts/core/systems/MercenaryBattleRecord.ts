// @spec-source → 留存系統.md §F 插畫解鎖條件（2 交手：1 場戰鬥；3 認同：戰勝 3 場）；傭兵系統（試用）.md（試用傭兵出戰不計精力與戰績）；PROG-2-1401（RET-01 後續）
/**
 * MercenaryBattleRecord — 試用傭兵出戰後的進度寫入（純邏輯，不依賴 cc）
 *
 * - 只處理試用中（Trial）的傭兵；結義後與已到期的傭兵原樣回傳（同一個參照），呼叫端可用 `!==` 判斷有沒有變動。
 * - 每場出戰 battles +1；戰勝才 wins +1；平手與敗北只記場數。
 * - 插畫階段依 advanceIllustrationStage 推進，只進不退。
 *
 * 出戰不計精力與戰績：這裡只寫傭兵自己的 battles、wins，不碰名冊武將。
 * Unity 對照：像每場戰鬥結束後，把計數器寫回那個角色的 ScriptableObject，不動角色本體的數值。
 */
import type { BattleOutcome } from './BattleRoster';
import { advanceIllustrationStage } from './MercenaryIllustration';
import type { MercenaryState } from './MercenaryBond';

export function recordTrialBattle(merc: Readonly<MercenaryState>, outcome: BattleOutcome): MercenaryState {
    if (merc.status !== 'Trial') return merc as MercenaryState;
    const battles = (merc.battles ?? 0) + 1;
    const wins = (merc.wins ?? 0) + (outcome === 'win' ? 1 : 0);
    const illustrationStage = advanceIllustrationStage(merc.illustrationStage ?? 1, {
        battles,
        wins,
        affection: merc.affection ?? 0,
        bonded: false,
    });
    return { ...merc, battles, wins, illustrationStage };
}
