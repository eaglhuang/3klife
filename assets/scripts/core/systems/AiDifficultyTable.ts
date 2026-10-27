// @spec-source → AI武將強度系統.md E-1 難度等級、E-7 單挑 AI 決策、F-2 部署節奏、F-3 AI SP 充能（PROG-2-1314，WBS AIS-01）
/**
 * AiDifficultyTable — AI 難度表的解析與驗證（純邏輯，不依賴 cc）
 *
 * 資料檔：assets/resources/data/ai-difficulty.json。這裡只做解析與範圍檢查，檔案讀取交給呼叫端。
 * 五個難度必須各出現一次；屬性縮放、SP 倍率、單挑閾值都要落在規格範圍內。
 * difficultyBonus 同時供部署節奏與轉生次數使用（規格兩處的表格相同）。
 *
 * 暫定：難度 ID 沿用 AiSpCharge 的小寫（easy…hell），與規格 JSON 範例的大寫不同；單挑閾值 NORMAL 以上取 0.58。
 *
 * Unity 對照：像一張 Difficulty ScriptableObject 表，載入時跑 OnValidate 檢查每一列欄位是否在合理範圍。
 */
import type { AiDifficulty } from './AiSpCharge';

export const AI_DIFFICULTY_IDS: readonly AiDifficulty[] = ['easy', 'normal', 'hard', 'nightmare', 'hell'];

export const AI_IQ_LEVELS = ['LOW', 'MEDIUM', 'HIGH', 'EXTREME', 'PERFECT'] as const;
export type AiIqLevel = (typeof AI_IQ_LEVELS)[number];

export interface AiDifficultyEntry {
    difficultyId: AiDifficulty;
    /** 屬性縮放，規格範圍 0.7 ~ 2.0 */
    statScale: number;
    aiIq: AiIqLevel;
    /** 難度加成：部署節奏與轉生次數共用 */
    difficultyBonus: number;
    canUseTactics: boolean;
    canUseUltimate: boolean;
    /** SP 充能倍率，規格範圍 0.8 ~ 1.5 */
    spGainModifier: number;
    /** 單挑接受閾值，規格範圍 0.45 ~ 0.58 */
    duelAcceptThreshold: number;
}

export type AiDifficultyTable = Readonly<Record<AiDifficulty, AiDifficultyEntry>>;

export interface AiDifficultyParseResult {
    table: AiDifficultyTable | null;
    errors: string[];
}

const RANGES = {
    statScale: [0.7, 2.0],
    spGainModifier: [0.8, 1.5],
    duelAcceptThreshold: [0.45, 0.58],
} as const;

function inRange(value: unknown, [min, max]: readonly [number, number]): boolean {
    return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

/** 解析 JSON 物件（ai-difficulty.json 的內容）；有任何錯誤時 table 為 null。 */
export function parseAiDifficultyTable(raw: unknown): AiDifficultyParseResult {
    const errors: string[] = [];
    const list = (raw as { difficulties?: unknown } | null)?.difficulties;
    if (!Array.isArray(list)) return { table: null, errors: ['缺少 difficulties 陣列'] };

    const found = new Map<string, AiDifficultyEntry>();
    for (const item of list as Partial<AiDifficultyEntry>[]) {
        const id = item.difficultyId;
        if (!id || !AI_DIFFICULTY_IDS.includes(id)) {
            errors.push(`未知難度 ID: ${String(id)}`);
            continue;
        }
        if (found.has(id)) errors.push(`${id}: 重複出現`);
        if (!inRange(item.statScale, RANGES.statScale)) errors.push(`${id}: statScale 超出 0.7~2.0`);
        if (!inRange(item.spGainModifier, RANGES.spGainModifier)) errors.push(`${id}: spGainModifier 超出 0.8~1.5`);
        if (!inRange(item.duelAcceptThreshold, RANGES.duelAcceptThreshold)) errors.push(`${id}: duelAcceptThreshold 超出 0.45~0.58`);
        if (!item.aiIq || !(AI_IQ_LEVELS as readonly string[]).includes(item.aiIq)) errors.push(`${id}: aiIq 不合法`);
        if (typeof item.difficultyBonus !== 'number' || item.difficultyBonus < 0) errors.push(`${id}: difficultyBonus 不合法`);
        if (typeof item.canUseTactics !== 'boolean' || typeof item.canUseUltimate !== 'boolean') errors.push(`${id}: 戰法／奧義旗標缺漏`);
        found.set(id, item as AiDifficultyEntry);
    }
    for (const id of AI_DIFFICULTY_IDS) {
        if (!found.has(id)) errors.push(`${id}: 缺少難度列`);
    }
    if (errors.length > 0) return { table: null, errors };
    return { table: Object.fromEntries(found) as AiDifficultyTable, errors };
}

export function aiDifficultyEntryOf(table: AiDifficultyTable, difficulty: AiDifficulty): AiDifficultyEntry {
    return table[difficulty];
}
