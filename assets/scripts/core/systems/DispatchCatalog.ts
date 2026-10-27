/**
 * DispatchCatalog — 暫定派遣任務清單與派遣板列（JRN-03 第三段，PROG-2-1179）
 *
 * 規格（武將日誌與離線互動系統.md (doc_spec_0015) §E-3）未給任務清單，以下為暫定值，
 * 待企劃定案後整份替換。需求標籤對齊 careerClass／role，故事標籤用日誌類別。
 */
import type { DispatchJobDef, DispatchState } from './DispatchJobs';
import { dispatchQualityOf, type DispatchQuality } from './DispatchQuality';

const HOUR_MS = 60 * 60 * 1000;

/** 暫定任務清單：時長、需求、回報文字皆為暫定 */
export const DISPATCH_JOB_CATALOG: readonly DispatchJobDef[] = [
    { jobId: 'PATROL', name: '邊境巡查', tags: ['Warrior'], requiredStats: { lea: 60 }, storyTags: ['BATTLE'], durationMs: 4 * HOUR_MS, rewardText: '糧草 50', reward: { resource: 'food', amount: 50 } },
    { jobId: 'FARM', name: '屯田督導', tags: ['Scholar'], requiredStats: { pol: 60 }, storyTags: ['GROWTH'], durationMs: 6 * HOUR_MS, rewardText: '糧草 120', reward: { resource: 'food', amount: 120 } },
    { jobId: 'ESCORT', name: '商路護送', tags: ['Combat'], requiredStats: { str: 60 }, storyTags: ['DISPATCH'], durationMs: 3 * HOUR_MS, rewardText: '金幣 200', reward: { resource: 'gold', amount: 200 } },
    { jobId: 'PERSUADE', name: '遊說名士', tags: ['Scholar'], requiredStats: { cha: 65, int: 60 }, storyTags: ['INTERACTION'], durationMs: 8 * HOUR_MS, rewardText: '名聲 10', reward: { resource: 'fame', amount: 10 } },
    { jobId: 'RAID', name: '夜探敵營', tags: ['Scout'], requiredStats: { int: 70 }, storyTags: ['BATTLE'], durationMs: 2 * HOUR_MS, rewardText: '敵情一份、名聲 15', reward: { resource: 'fame', amount: 15 }, highRisk: true },
];

/** 派遣板列；與 JournalHubController 的 DispatchBoardRow 同形 */
export interface DispatchCatalogRow {
    id: string;
    title: string;
    scoreText: string;
}

export const DISPATCH_ROW_TEXT = {
    available: '可派遣',
    highRisk: '需親自決策',
} as const;

/** 暫定：派遣品質中文名（PROG-2-1188 預覽用） */
export const DISPATCH_QUALITY_LABEL: Readonly<Record<DispatchQuality, string>> = { POOR: '欠佳', NORMAL: '普通', GOOD: '良好', EXCELLENT: '極佳' };

/** 派遣板預覽：某任務由誰去、幾分 */
export interface DispatchPreview {
    generalName: string;
    score: number;
}

export function dispatchPreviewText(preview: Readonly<DispatchPreview>, highRisk: boolean): string {
    const text = `${preview.generalName} ${preview.score} 分・${DISPATCH_QUALITY_LABEL[dispatchQualityOf(preview.score)]}`;
    return highRisk ? `${text}・${DISPATCH_ROW_TEXT.highRisk}` : text;
}

export function findDispatchJob(jobId: string, catalog: readonly DispatchJobDef[] = DISPATCH_JOB_CATALOG): DispatchJobDef | null {
    return catalog.find((j) => j.jobId === jobId) ?? null;
}

/**
 * 派遣板列：進行中的任務排前面（「武將・剩 N 時」，無條件進位），其餘依清單順序。
 * 有 preview 且回傳人選時，未進行的列改顯示預覽（PROG-2-1188）。
 */
export function dispatchBoardRows(
    state: Readonly<DispatchState>,
    catalog: readonly DispatchJobDef[],
    nameOf: (generalId: string) => string,
    nowMs: number,
    preview?: (job: Readonly<DispatchJobDef>) => DispatchPreview | null,
): DispatchCatalogRow[] {
    const activeRows: DispatchCatalogRow[] = [];
    const idleRows: DispatchCatalogRow[] = [];
    for (const job of catalog) {
        const active = state.active.find((a) => a.jobId === job.jobId);
        if (active) {
            const hours = Math.max(0, Math.ceil((active.dueAtMs - nowMs) / HOUR_MS));
            activeRows.push({ id: job.jobId, title: job.name, scoreText: `${nameOf(active.generalId)}・剩 ${hours} 時` });
        } else {
            const picked = preview?.(job) ?? null;
            const fallback = job.highRisk ? DISPATCH_ROW_TEXT.highRisk : DISPATCH_ROW_TEXT.available;
            idleRows.push({ id: job.jobId, title: job.name, scoreText: picked ? dispatchPreviewText(picked, job.highRisk === true) : fallback });
        }
    }
    return activeRows.concat(idleRows);
}

/** 點列派遣結果的提示文字（PROG-2-1181，暫定字串） */
export function dispatchClickMessage(result: { ok: boolean; reason?: string; jobName?: string; generalName?: string }): string {
    if (result.ok) return `${result.generalName ?? ''}出發執行「${result.jobName ?? ''}」。`;
    if (result.reason === 'job-active') return `「${result.jobName ?? ''}」由${result.generalName ?? ''}執行中。`;
    if (result.reason === 'general-busy' && result.generalName) return `${result.generalName}正在執行其他派遣。`;
    if (result.reason === 'general-cooldown' && result.generalName) return `${result.generalName}尚在休整，暫不能派遣。`;
    if (result.reason === 'no-general' || result.reason === 'general-busy' || result.reason === 'general-cooldown') return '目前沒有可派遣的武將。';
    return '無法派遣此任務。';
}
