// @spec-source → 血統理論系統.md (doc_spec_0011) §覺醒名號（Awakening Title）
/**
 * AwakeningTitle — 覺醒名號判定（純邏輯，不依賴 cc）
 *
 * 兩段判定：
 *   1. 天才條件（任一即可）：畢業 S 且五維總和 ≥ 460；EP ≥ 95；14 人矩陣有 ≥ 5 個相同標籤因子（滿連鎖共鳴）
 *   2. 天才子嗣依序比對四個名號，取第一個符合者；都不符合則只標記為天才、不給名號
 *
 * 暫定（規格沒寫）：
 *   - 名號比對順序採規格表列順序（常山真龍 → 麒麟 → 虎膽龍威 → 鬼才後裔）。
 *   - 「全騎兵因子」的標籤鍵暫定為 'cavalry'，由呼叫端統計 ancestorTagCounts。
 *   - 附加效果只回傳效果 id，實際套用（騎兵適性、訓練倍率等）留給各系統接線。
 *
 * Unity 對照：像一個 static 規則表 + Evaluate()，輸入是畢業結算資料，輸出是要貼在名字後面的封號。
 */

export type GraduationRank = 'S' | 'A' | 'B' | 'C';
export type AwakeningStatKey = 'str' | 'int' | 'lea' | 'pol' | 'cha' | 'luk';

export const AWAKENING_GENIUS_TOTAL = 460;
export const AWAKENING_GENIUS_EP = 95;
export const AWAKENING_GENIUS_TAG_RUN = 5;
export const AWAKENING_ANCESTOR_COUNT = 14;
/** 暫定：「全騎兵因子」的標籤鍵 */
export const AWAKENING_CAVALRY_TAG = 'cavalry';

export interface AwakeningTitleInput {
    /** 培育畢業評級；未畢業為 undefined */
    graduationRank?: GraduationRank;
    /** 畢業五維值 */
    graduationStats?: Partial<Record<AwakeningStatKey, number>>;
    ep: number;
    /** 14 人血統矩陣中，每個標籤出現的祖先數 */
    ancestorTagCounts?: Record<string, number>;
    /** 祖先總數，預設 14 */
    ancestorCount?: number;
}

export type AwakeningTitleName = '常山真龍' | '麒麟' | '虎膽龍威' | '鬼才後裔';

export interface AwakeningTitleResult {
    isGenius: boolean;
    /** 符合的名號；天才但沒有命中任何名號時為 null */
    title: AwakeningTitleName | null;
    /** 附加效果 id（實際套用由各系統負責） */
    effectId: string | null;
}

interface TitleRule {
    name: AwakeningTitleName;
    effectId: string;
    matches: (input: AwakeningTitleInput) => boolean;
}

const TITLE_RULES: TitleRule[] = [
    {
        name: '常山真龍',
        effectId: 'cavalry-aptitude-s',
        matches: (i) => (i.ancestorTagCounts?.[AWAKENING_CAVALRY_TAG] ?? 0) >= (i.ancestorCount ?? AWAKENING_ANCESTOR_COUNT),
    },
    { name: '麒麟', effectId: 'training-x1.1', matches: (i) => i.ep >= 98 },
    { name: '虎膽龍威', effectId: 'duel-burst-plus-10', matches: (i) => (i.graduationStats?.str ?? -1) >= 90 },
    { name: '鬼才後裔', effectId: 'secret-event-plus-20', matches: (i) => (i.graduationStats?.int ?? -1) >= 80 },
];

export function isAwakeningGenius(input: AwakeningTitleInput): boolean {
    const total = Object.values(input.graduationStats ?? {}).reduce((sum, v) => sum + (v ?? 0), 0);
    if (input.graduationRank === 'S' && total >= AWAKENING_GENIUS_TOTAL) return true;
    if (input.ep >= AWAKENING_GENIUS_EP) return true;
    const maxRun = Math.max(0, ...Object.values(input.ancestorTagCounts ?? {}));
    return maxRun >= AWAKENING_GENIUS_TAG_RUN;
}

/** 判定覺醒名號；不改輸入 */
export function evaluateAwakeningTitle(input: AwakeningTitleInput): AwakeningTitleResult {
    if (!isAwakeningGenius(input)) return { isGenius: false, title: null, effectId: null };
    const rule = TITLE_RULES.find((r) => r.matches(input));
    return { isGenius: true, title: rule?.name ?? null, effectId: rule?.effectId ?? null };
}
