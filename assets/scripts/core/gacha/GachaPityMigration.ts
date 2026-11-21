// @spec-source → 獎勵系統 Base 框架規格書 (doc_spec_1186) §12 轉蛋遷移；轉蛋雙重保底機制與天命商店解鎖記帳規格書；GCH-R5（PROG-2-9464）
/**
 * GachaPityMigration — 舊轉蛋保底存檔（gachaPity 表）轉成 reward.pity 的階梯與累計計數（純邏輯，不依賴 cc）。
 *
 * 舊存檔每池只有三個欄位：pullCount（本池累計抽數）、lastSsrPull（最後一次出 SSR 時的累計抽數，可能缺）、
 * destinyExchanges（天命商店已兌換次數，可能缺）。換算：
 *   - SSR 階梯計數 = 累計抽數 − lastSsrPull（沒有紀錄＝從未出過，用累計抽數）；
 *   - 其他階梯計數 = 累計抽數 mod 舊小保底間隔（50）；
 *   - 兩者都夾在 [0, hardCount − 1]，轉過去不會立刻觸發硬保底的不合理結果，也不讓玩家少算進度；
 *   - 累計計數（tally）= 舊累計抽數；已兌換次數（spentKey）= 舊 destinyExchanges，原樣保留。
 * 只轉一次：meta.pity 內以 `gacha.migrated.<舊池 id>` 做標記。新路徑已先抽過的玩家（標記前就有計數）不被覆蓋：
 * 階梯保留現值，累計計數把舊抽數加在新抽數之上。
 */
import type { RewardPoolDef } from '../../shared/reward/RewardConfig';
import type { RewardMeta } from '../../shared/reward/RewardRules';
import { GACHA_SMALL_PITY_INTERVAL, normalizeGachaPityBook, type GachaPityBook } from '../systems/GachaDraw';

export const GACHA_MIGRATED_PREFIX = 'gacha.migrated.';

export interface GachaPityMigrationResult {
    meta: RewardMeta;
    /** 這次實際轉換的舊池 id */
    migrated: string[];
}

function clamp(value: number, hardCount: number): number {
    return Math.max(0, Math.min(value, hardCount - 1));
}

/** book 可以是未清理的舊資料；legacyPoolIds：舊池 id → 獎池 id */
export function migrateLegacyPity(
    book: unknown,
    meta: RewardMeta,
    pools: readonly RewardPoolDef[],
    legacyPoolIds: Readonly<Record<string, string>>,
): GachaPityMigrationResult {
    const legacy: GachaPityBook = normalizeGachaPityBook(book);
    const pity: Record<string, number> = { ...meta.pity };
    const migrated: string[] = [];
    let changed = false;
    for (const legacyId of Object.keys(legacyPoolIds)) {
        const markerKey = `${GACHA_MIGRATED_PREFIX}${legacyId}`;
        if (pity[markerKey] !== undefined) continue;
        const pool = pools.find((p) => p.id === legacyPoolIds[legacyId]);
        const state = legacy[legacyId];
        if (!pool) continue;
        pity[markerKey] = 1;
        changed = true;
        if (!state) continue;
        const since = state.lastSsrPull !== undefined && state.lastSsrPull > 0 ? state.pullCount - state.lastSsrPull : state.pullCount;
        for (const ladder of pool.pity) {
            if ((pity[ladder.counterKey] ?? 0) > 0) continue;
            const raw = ladder.tier === 'SSR' ? since : state.pullCount % GACHA_SMALL_PITY_INTERVAL;
            const counter = clamp(raw, ladder.hardCount);
            if (counter > 0) pity[ladder.counterKey] = counter;
        }
        for (const tally of pool.tallies) {
            const total = (pity[tally.counterKey] ?? 0) + state.pullCount;
            if (total > 0) pity[tally.counterKey] = total;
            const spent = (pity[tally.spentKey] ?? 0) + (state.destinyExchanges ?? 0);
            if (spent > 0) pity[tally.spentKey] = spent;
        }
        migrated.push(legacyId);
    }
    return { meta: changed ? { ...meta, pity } : meta, migrated };
}
