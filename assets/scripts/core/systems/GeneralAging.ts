// @spec-source → 遊戲時間系統.md (doc_spec_0034) §F、武將壽命系統.md (doc_spec_0018) §F
/**
 * GeneralAging — 武將每季增齡與壽命結算（純邏輯，不依賴 cc）
 *
 * 規格重點：
 * - 每季 Age += 0.25（4 季 = 1 歲）
 * - Max_Lifespan = 65 + Red_Gene_Bonus + Random_Variance(-5 ~ +10)
 * - 65 歲以上成為退役候選（可轉教官，由玩家決定，這裡只發事件）
 * - 超過壽命後每季死亡率 = min(0.8, Over_Age × 0.1)
 *
 * Unity 對照：像一個每季被呼叫一次的純 C# Service，
 * 只回傳「發生了什麼事」，不直接操作 UI 或 GameObject。
 */
import type { GeneralConfig } from '../models/GeneralUnit';

export const AGE_PER_SEASON = 0.25;
export const BASE_LIFESPAN = 65;
export const RETIREMENT_AGE = 65;
export const LIFESPAN_VARIANCE_MIN = -5;
export const LIFESPAN_VARIANCE_MAX = 10;
export const MAX_DEATH_CHANCE_PER_SEASON = 0.8;
export const DEATH_CHANCE_PER_OVER_YEAR = 0.1;
export const GENERAL_STATUS_DEAD = 'dead';

/** 增齡流程需要、但尚未正式進入 GeneralConfig 的欄位 */
export type AgingGeneral = GeneralConfig & {
    /** 壽命上限；缺值時依 id 決定性產生並寫回 */
    maxLifespan?: number;
    /** 紅色因子等級（每級 +3 歲壽命） */
    redGeneLevel?: number;
};

export type AgingEventType = 'reached-retirement-age' | 'died';

export interface AgingEvent {
    type: AgingEventType;
    generalId: string;
    age: number;
}

/** 回傳 [0, 1) 的亂數來源；測試時可注入固定序列 */
export type RandomSource = () => number;

/** 以 id 產生穩定的雜湊值（FNV-1a），讓同一武將的壽命變異每次都一樣 */
function hashId(id: string): number {
    let hash = 0x811c9dc5;
    for (let i = 0; i < id.length; i++) {
        hash ^= id.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash;
}

export function resolveMaxLifespan(general: AgingGeneral): number {
    if (typeof general.maxLifespan === 'number' && Number.isFinite(general.maxLifespan)) {
        return general.maxLifespan;
    }
    const span = LIFESPAN_VARIANCE_MAX - LIFESPAN_VARIANCE_MIN + 1;
    const variance = LIFESPAN_VARIANCE_MIN + (hashId(general.id) % span);
    const redBonus = Math.max(0, general.redGeneLevel ?? 0) * 3;
    return BASE_LIFESPAN + redBonus + variance;
}

export function deathChancePerSeason(age: number, maxLifespan: number): number {
    const overAge = age - maxLifespan;
    if (overAge <= 0) {
        return 0;
    }
    return Math.min(MAX_DEATH_CHANCE_PER_SEASON, overAge * DEATH_CHANCE_PER_OVER_YEAR);
}

export function isGeneralDead(general: GeneralConfig): boolean {
    return general.status === GENERAL_STATUS_DEAD;
}

/**
 * 將名冊中所有存活武將推進 1 季，回傳新名冊（不改寫輸入陣列）與事件。
 * 沒有 age 的武將不參與增齡（資料不足時不猜測）。
 */
export function ageGeneralsOneSeason(
    roster: readonly AgingGeneral[],
    random: RandomSource = Math.random,
): { roster: AgingGeneral[]; events: AgingEvent[] } {
    const events: AgingEvent[] = [];
    const next = roster.map((source) => {
        const general: AgingGeneral = { ...source };
        if (isGeneralDead(general) || typeof general.age !== 'number') {
            return general;
        }

        const previousAge = general.age;
        general.age = previousAge + AGE_PER_SEASON;
        general.maxLifespan = resolveMaxLifespan(general);

        if (previousAge < RETIREMENT_AGE && general.age >= RETIREMENT_AGE) {
            events.push({ type: 'reached-retirement-age', generalId: general.id, age: general.age });
        }

        const chance = deathChancePerSeason(general.age, general.maxLifespan);
        if (chance > 0 && random() < chance) {
            general.status = GENERAL_STATUS_DEAD;
            events.push({ type: 'died', generalId: general.id, age: general.age });
        }
        return general;
    });
    return { roster: next, events };
}
