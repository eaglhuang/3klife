// @spec-source → 武將日誌與離線互動系統.md (doc_spec_0015) §E-3、§F-2（派遣品質評分）、§G（派遣完成）；PROG-2-1177（JRN-03）
/**
 * DispatchQuality — 派遣品質評分與品質區間（純邏輯，不依賴 cc）。
 *
 * - 分數＝角色契合×45＋能力契合×25＋心情×15＋日誌親和×15（§F-2），四捨五入，0~100。
 * - 規格只給子項函式名，算法暫定；權重、心情對照、品質門檻集中在下方資料表。
 * - 品質只決定結果區間與日誌表現，不覆寫任務主獎勵（§F-2 規則 1）；不用成功／失敗二元（規則 2）。
 * - 高風險任務不得自動代勞（規則 3）。
 *
 * Unity 對照：像 Idle Dispatch 的評分器，ScriptableObject 存權重與門檻，評分函式只讀資料。
 */

export type DispatchQuality = 'POOR' | 'NORMAL' | 'GOOD' | 'EXCELLENT';
export type DispatchMood = 'LOW' | 'NORMAL' | 'HIGH';
export type DispatchStatKey = 'str' | 'int' | 'lea' | 'pol' | 'cha';

/** §F-2 權重 */
export const DISPATCH_SCORE_WEIGHTS = { role: 45, stat: 25, mood: 15, journal: 15 } as const;

/** 心情倍率（暫定，規格未給） */
export const DISPATCH_MOOD_MODIFIER: Readonly<Record<DispatchMood, number>> = { LOW: 0.2, NORMAL: 0.6, HIGH: 1 };

/** 品質門檻：分數 ≥ min 即為該品質，由高到低比對（暫定，規格未給） */
export const DISPATCH_QUALITY_BANDS: readonly { quality: DispatchQuality; min: number }[] = [
    { quality: 'EXCELLENT', min: 80 },
    { quality: 'GOOD', min: 60 },
    { quality: 'NORMAL', min: 40 },
    { quality: 'POOR', min: 0 },
];

/** §G 派遣完成 */
export const DISPATCH_COMPLETE_TEMPLATE = '{GeneralName} 已完成『{JobName}』，帶回 {RewardText}。';

export interface DispatchJob {
    jobId: string;
    name: string;
    tags: readonly string[];
    requiredStats: Readonly<Partial<Record<DispatchStatKey, number>>>;
    storyTags: readonly string[];
    /** 高風險或會改變大局的任務（§F-2 規則 3） */
    highRisk?: boolean;
}

export interface DispatchGeneral {
    roleTags: readonly string[];
    stats: Readonly<Partial<Record<DispatchStatKey, number>>>;
    mood?: DispatchMood;
    journalTags: readonly string[];
}

/** 要求標籤中具備的比例；沒有要求時為 1（暫定：不扣分）。 */
function tagOverlap(required: readonly string[], owned: readonly string[]): number {
    if (required.length === 0) return 1;
    const have = new Set(owned);
    return required.filter((t) => have.has(t)).length / required.length;
}

export function getRoleFit(jobTags: readonly string[], roleTags: readonly string[]): number {
    return tagOverlap(jobTags, roleTags);
}

/** 各需求能力 min(1, 實際/需求) 的平均；沒有需求時為 1。需求非正數的項目略過。 */
export function getStatFit(required: DispatchJob['requiredStats'], stats: DispatchGeneral['stats']): number {
    const keys = (Object.keys(required) as DispatchStatKey[]).filter((k) => (required[k] ?? 0) > 0);
    if (keys.length === 0) return 1;
    const sum = keys.reduce((acc, k) => {
        const actual = stats[k];
        const ratio = typeof actual === 'number' && Number.isFinite(actual) && actual > 0 ? actual / (required[k] as number) : 0;
        return acc + Math.min(1, ratio);
    }, 0);
    return sum / keys.length;
}

export function getMoodModifier(mood: DispatchMood | undefined): number {
    return DISPATCH_MOOD_MODIFIER[mood ?? 'NORMAL'];
}

export function getJournalAffinity(storyTags: readonly string[], journalTags: readonly string[]): number {
    return tagOverlap(storyTags, journalTags);
}

export function getDispatchScore(job: Readonly<DispatchJob>, general: Readonly<DispatchGeneral>): number {
    const w = DISPATCH_SCORE_WEIGHTS;
    return Math.round(
        getRoleFit(job.tags, general.roleTags) * w.role
        + getStatFit(job.requiredStats, general.stats) * w.stat
        + getMoodModifier(general.mood) * w.mood
        + getJournalAffinity(job.storyTags, general.journalTags) * w.journal,
    );
}

export function dispatchQualityOf(score: number): DispatchQuality {
    const value = Number.isFinite(score) ? score : 0;
    return (DISPATCH_QUALITY_BANDS.find((b) => value >= b.min) ?? DISPATCH_QUALITY_BANDS[DISPATCH_QUALITY_BANDS.length - 1]).quality;
}

/** 高風險任務不得自動代勞，需玩家親自決策。 */
export function canAutoDispatch(job: Readonly<DispatchJob>): boolean {
    return job.highRisk !== true;
}

export function dispatchCompleteLine(generalName: string, jobName: string, rewardText: string): string {
    return DISPATCH_COMPLETE_TEMPLATE
        .replace('{GeneralName}', generalName)
        .replace('{JobName}', jobName)
        .replace('{RewardText}', rewardText);
}

/** 派遣完成劇本句的查表 key（PROG-2-1448），參數順序與 zh-TW 模板的 {0}{1}{2} 一致。 */
export const DISPATCH_COMPLETE_KEY = 'UI_JOURNAL_STORY_DISPATCH_DONE';

export function dispatchCompleteArgs(generalName: string, jobName: string, rewardText: string): string[] {
    return [generalName, jobName, rewardText];
}
