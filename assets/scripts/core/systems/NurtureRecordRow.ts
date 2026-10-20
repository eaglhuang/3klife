// @spec-source → 培育系統.md §Server 端 — 培育紀錄表；server/schema/002_nurture_records.sql（NUR-15 / PROG-2-0855）；PROG-2-0721
/**
 * NurtureRecordRow — 畢業時把培育會話轉成「培育紀錄」一列（純邏輯，不依賴 cc）
 *
 * MVP 期間紀錄先存在存檔欄位（扁平快照，版號不升），之後才搬到 server 表。
 * 欄位與 server/schema/nur15-row-validators.ts 的 NurtureRecordRow 對齊（snake_case）。
 *
 * 取不到的值一律設為 null，不填假值：
 *   - revelation_level：目前沒有子嗣的揭露層級紀錄，無法得出 0~3。
 *   - phase_block_history_json、mentoring_mode_log_json、reveal_log_json：現有培育狀態沒有這三份歷程，
 *     以 JSON 文字 "null" 表示「未紀錄」，仍是可解析的 JSON（server 列驗證要求可解析）。
 *   - tp_total：舊存檔的會話沒有 totalTp 時為 null。
 * 上述缺值會列在 unavailable，方便呼叫端與測試看出哪些欄位還沒接上。
 */
import type { NurtureSession, NurtureRating } from './NurtureSystem';

export interface NurtureRecordDraft {
    session_id: string;
    child_uid: string;
    start_season: number;
    end_season: number;
    mentor_id: string | null;
    revelation_level: number | null;
    phase_block_history_json: string;
    mentoring_mode_log_json: string;
    reveal_log_json: string;
    final_stats_json: string;
    graduation_tags_json: string;
    rating: NurtureRating;
    tp_total: number | null;
}

export interface NurtureRecordBuildResult {
    row: NurtureRecordDraft;
    /** 沒有資料來源、以 null 或 "null" 代替的欄位名 */
    unavailable: string[];
}

/** 把已畢業的會話轉成紀錄一列；不修改輸入 */
export function buildNurtureRecordRow(
    session: NurtureSession,
    graduation: { rating: NurtureRating; tags: readonly string[] },
    endSeason: number,
): NurtureRecordBuildResult {
    const unavailable = ['revelation_level', 'phase_block_history_json', 'mentoring_mode_log_json', 'reveal_log_json'];
    const tpTotal = session.totalTp ?? null;
    if (tpTotal === null) unavailable.push('tp_total');
    return {
        row: {
            session_id: session.sessionId,
            child_uid: session.childId,
            start_season: session.startSeason,
            end_season: endSeason,
            mentor_id: session.mentors[0]?.id ?? null,
            revelation_level: null,
            phase_block_history_json: JSON.stringify(null),
            mentoring_mode_log_json: JSON.stringify(null),
            reveal_log_json: JSON.stringify(null),
            final_stats_json: JSON.stringify(session.prowess),
            graduation_tags_json: JSON.stringify([...graduation.tags]),
            rating: graduation.rating,
            tp_total: tpTotal,
        },
        unavailable,
    };
}
