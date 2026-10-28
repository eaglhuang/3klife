// @spec-source → AI武將強度系統.md (doc_data_0002) E-6b「AI 虎符選擇邏輯」AI_SelectTally（PROG-2-1467）
/**
 * AiTallySelection — AI 武將挑選要裝備的虎符（純邏輯，不依賴 cc）
 *
 * 規格偽碼：
 * 1. 優先裝備自己名號的虎符（Resonance_Template === Template_ID，血脈共鳴）。
 * 2. 否則依「兵種適性效率 × 品質加成 × (1 + 星級 × 0.08)」取最高分。
 *
 * 暫定（可逆）：
 * - 虎符沒有兵種、或武將沒有該兵種適性時，適性視為 B（1.0）。
 * - 兵種比對不分大小寫（武將適性鍵為 CAVALRY 等大寫）。
 * - 同分取先出現者。
 *
 * Unity 對照：像 AI 的 Loadout Picker，從背包清單挑一張最適合自己的卡。
 */
import type { TigerTallyCard } from '../models/TigerTallyCard';
import { BATTLE_POWER_CONSTANTS, type AptitudeGrade } from './BattlePowerRating';
import { readCardStarState } from './TigerTallyStar';

export interface AiTallyGeneral {
    templateId: string;
    /** 兵種 → 適性等級（S~D） */
    troopAptitude: Readonly<Record<string, string>>;
}

/** 暫定：缺兵種或缺適性時的預設等級 */
export const AI_TALLY_DEFAULT_APTITUDE: AptitudeGrade = 'B';

function aptitudeEfficiency(general: AiTallyGeneral, troopType: string | undefined): number {
    const table = BATTLE_POWER_CONSTANTS.APTITUDE_EFFICIENCY;
    if (!troopType) return table[AI_TALLY_DEFAULT_APTITUDE];
    const key = troopType.trim().toUpperCase();
    const entry = Object.entries(general.troopAptitude).find(([type]) => type.trim().toUpperCase() === key);
    const grade = entry?.[1]?.trim().toUpperCase() as AptitudeGrade | undefined;
    return grade && grade in table ? table[grade] : table[AI_TALLY_DEFAULT_APTITUDE];
}

/** 單張虎符對此 AI 武將的評分（不含共鳴） */
export function scoreTallyForAi(general: AiTallyGeneral, tally: TigerTallyCard): number {
    const star = readCardStarState(tally).star;
    return aptitudeEfficiency(general, tally.troopType)
        * BATTLE_POWER_CONSTANTS.TALLY_QUALITY_MOD[tally.quality]
        * (1 + star * BATTLE_POWER_CONSTANTS.TALLY_STAR_MOD_PER_STAR);
}

/** 挑一張虎符；共鳴優先，否則取最高分；沒有可選時回 null */
export function aiSelectTally(general: AiTallyGeneral, tallies: readonly TigerTallyCard[]): TigerTallyCard | null {
    const resonance = tallies.find(tally => tally.templateId === general.templateId);
    if (resonance) return resonance;

    let best: TigerTallyCard | null = null;
    let bestScore = -Infinity;
    for (const tally of tallies) {
        const score = scoreTallyForAi(general, tally);
        if (score > bestScore) {
            best = tally;
            bestScore = score;
        }
    }
    return best;
}
