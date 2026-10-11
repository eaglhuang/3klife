// @spec-source → 因子解鎖系統.md (doc_spec_0009) §A §F「三階段解鎖表」
/**
 * DiscoveryProgress — 玩家 discoveryLevel 的經驗值與升級（純邏輯，不依賴 cc）
 *
 * 規格只寫了「玩家等級 Lv1~20 / 21~45 / 46+ 對應三階段」，沒有寫等級怎麼長。
 * 本檔的成長來源與數值全部是暫定（PROG-2-0044），保守地只取兩個已存在的玩家行為：
 *   - 戰場結算：勝 +30、平 +20、敗 +10
 *   - 培育畢業：+50
 * 每升一級固定 100 經驗，上限 99 級；約 48 場勝仗到 Phase 2（20 級）、110 場到 Phase 3（45 級）。
 *
 * Unity 對照：像一個 PlayerLevel 的 ScriptableObject 曲線 + static AddExp()，
 * 只算「加了經驗之後變幾級」，存檔與廣播交給 GameSession。
 */
import { discoveryPhase } from './FactorAwakening';

/** 暫定：每升一級所需經驗 */
export const DISCOVERY_EXP_PER_LEVEL = 100;
/** 暫定：等級上限 */
export const DISCOVERY_LEVEL_CAP = 99;

export type DiscoveryExpSource = 'battle-win' | 'battle-draw' | 'battle-loss' | 'nurture-graduate';

/** 暫定：各來源給的經驗 */
export const DISCOVERY_EXP_GAIN: Record<DiscoveryExpSource, number> = {
    'battle-win': 30,
    'battle-draw': 20,
    'battle-loss': 10,
    'nurture-graduate': 50,
};

export interface DiscoveryProgressState {
    level: number;
    /** 目前等級內累積的經驗 0 ~ DISCOVERY_EXP_PER_LEVEL-1；滿級時固定 0 */
    exp: number;
}

export interface DiscoveryGain {
    source: DiscoveryExpSource;
    amount: number;
    before: DiscoveryProgressState;
    after: DiscoveryProgressState;
    levelsGained: number;
    phaseBefore: 1 | 2 | 3;
    phaseAfter: 1 | 2 | 3;
}

export function normalizeDiscoveryProgress(level: unknown, exp: unknown): DiscoveryProgressState {
    const lv = typeof level === 'number' && Number.isFinite(level) && level >= 1 ? Math.min(DISCOVERY_LEVEL_CAP, Math.floor(level)) : 1;
    if (lv >= DISCOVERY_LEVEL_CAP) return { level: lv, exp: 0 };
    const xp = typeof exp === 'number' && Number.isFinite(exp) && exp >= 0 ? Math.floor(exp) : 0;
    return { level: lv, exp: Math.min(DISCOVERY_EXP_PER_LEVEL - 1, xp) };
}

/** 加經驗並換算升級；不改輸入 */
export function gainDiscoveryExp(
    state: DiscoveryProgressState,
    source: DiscoveryExpSource,
    amount: number = DISCOVERY_EXP_GAIN[source],
): DiscoveryGain {
    const before = normalizeDiscoveryProgress(state.level, state.exp);
    let level = before.level;
    let exp = before.exp + Math.max(0, Math.floor(amount));
    while (level < DISCOVERY_LEVEL_CAP && exp >= DISCOVERY_EXP_PER_LEVEL) {
        exp -= DISCOVERY_EXP_PER_LEVEL;
        level += 1;
    }
    const after = normalizeDiscoveryProgress(level, exp);
    return {
        source,
        amount,
        before,
        after,
        levelsGained: after.level - before.level,
        phaseBefore: discoveryPhase(before.level),
        phaseAfter: discoveryPhase(after.level),
    };
}

/** 戰場結果 → 經驗來源；ongoing 不給 */
export function battleExpSource(result: string): DiscoveryExpSource | null {
    switch (result) {
        case 'player-win': return 'battle-win';
        case 'draw': return 'battle-draw';
        case 'enemy-win': return 'battle-loss';
        default: return null;
    }
}
