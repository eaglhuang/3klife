// @spec-source → 轉蛋系統.md §E #6「戰法隨機化」；轉蛋與戰場武將處置系統.md §2.1「重複抽取機制」（PROG-2-1168）
/**
 * TacticRandomization — 轉蛋戰法隨機化（純邏輯，不依賴 cc）
 *
 * 規則：每次抽到同名武將，第 2、第 3 戰法隨機生成；抽到已持有的戰法，自動轉為「戰法經驗值」提升等級。
 *
 * 暫定（使用者 2026-10-27 裁定先用暫定值）：
 *   - 候選池：戰場戰法庫的基本戰法（不含靈感戰法 tactic-insp-*），排除第 1 戰法，每次抽 2 招不重複。
 *   - 已持有：該戰法 +100 經驗；每 100 經驗 1 級，最高 5 級（經驗封頂在滿級）。
 *   - 未持有：補到空的 slot-2／slot-3；兩格都滿則捨棄。
 *   - 戰法等級對戰場效果的加成規格未定義，這裡只記經驗。
 *
 * Unity 對照：像抽卡結算的一個 static 工具，吃武將資料與亂數，回傳新的戰法槽與經驗表，不改輸入。
 */

import type { GeneralConfig, GeneralTacticSlotConfig } from '../models/GeneralUnit';
import type { RandomSource } from './GeneralAging';
import { TACTIC_LIBRARY_TO_SPEC_ID } from './SortieDeploy';

/** 候選池：戰法庫基本戰法（不含靈感戰法） */
export const TACTIC_RANDOM_POOL: readonly string[] = Object.keys(TACTIC_LIBRARY_TO_SPEC_ID).filter((id) => !id.startsWith('tactic-insp-'));
/** 每次抽到要隨機的戰法數（第 2、第 3 戰法） */
export const TACTIC_RANDOM_SLOT_IDS: readonly string[] = ['slot-2', 'slot-3'];
/** 重複戰法轉換的經驗值 */
export const TACTIC_DUPLICATE_EXP = 100;
export const TACTIC_EXP_PER_LEVEL = 100;
export const TACTIC_MAX_LEVEL = 5;

/** 戰法等級：1 級起，每 TACTIC_EXP_PER_LEVEL 經驗 +1，最高 TACTIC_MAX_LEVEL */
export function tacticLevelOf(exp: number | undefined): number {
    const safe = Number.isFinite(exp) ? Math.max(0, exp ?? 0) : 0;
    return Math.min(TACTIC_MAX_LEVEL, 1 + Math.floor(safe / TACTIC_EXP_PER_LEVEL));
}

/** 從候選池抽 count 招不重複的戰法，排除 excluded（第 1 戰法） */
export function rollPullTactics(excluded: readonly string[], random: RandomSource, count = TACTIC_RANDOM_SLOT_IDS.length): string[] {
    const pool = TACTIC_RANDOM_POOL.filter((id) => !excluded.includes(id));
    const picked: string[] = [];
    while (picked.length < count && pool.length > 0) {
        const index = Math.min(pool.length - 1, Math.floor(random() * pool.length));
        picked.push(pool.splice(index, 1)[0]);
    }
    return picked;
}

export interface PulledTacticsResult {
    tacticSlots: GeneralTacticSlotConfig[];
    tacticExp: Record<string, number>;
    /** 補進空槽的戰法 */
    filled: string[];
    /** 轉成經驗的戰法 */
    convertedToExp: string[];
    /** 兩格都滿而捨棄的戰法 */
    discarded: string[];
}

/** 套用本次抽到的隨機戰法；不改輸入 */
export function applyPulledTactics(general: Pick<GeneralConfig, 'tacticSlots' | 'tacticExp'>, rolled: readonly string[]): PulledTacticsResult {
    const tacticSlots = (general.tacticSlots ?? []).map((slot) => ({ ...slot }));
    const tacticExp = { ...(general.tacticExp ?? {}) };
    const result: PulledTacticsResult = { tacticSlots, tacticExp, filled: [], convertedToExp: [], discarded: [] };
    const maxExp = (TACTIC_MAX_LEVEL - 1) * TACTIC_EXP_PER_LEVEL;
    for (const tacticId of rolled) {
        if (tacticSlots.some((slot) => slot.tacticId === tacticId)) {
            tacticExp[tacticId] = Math.min(maxExp, (tacticExp[tacticId] ?? 0) + TACTIC_DUPLICATE_EXP);
            result.convertedToExp.push(tacticId);
            continue;
        }
        const emptySlotId = TACTIC_RANDOM_SLOT_IDS.find((slotId) => !tacticSlots.some((slot) => slot.slotId === slotId));
        if (emptySlotId) {
            tacticSlots.push({ slotId: emptySlotId, tacticId, source: 'gacha' });
            result.filled.push(tacticId);
        } else {
            result.discarded.push(tacticId);
        }
    }
    return result;
}

/** 一次抽到：擲 2 招（排除第 1 戰法）並套用 */
export function randomizePulledTactics(general: Pick<GeneralConfig, 'tacticSlots' | 'tacticExp'>, random: RandomSource): PulledTacticsResult {
    const first = (general.tacticSlots ?? []).find((slot) => slot.slotId === 'slot-1')?.tacticId;
    return applyPulledTactics(general, rollPullTactics(first ? [first] : [], random));
}
