// @spec-source → 培育系統.md §Server 端 — 培育紀錄表；server/schema/002_nurture_records.sql（NUR-15 / PROG-2-0855）；PROG-2-0721
/**
 * NurtureRecordRow — 畢業時把培育會話轉成「培育紀錄」一列（純邏輯，不依賴 cc）
 *
 * MVP 期間紀錄先存在存檔欄位（扁平快照，版號不升），之後才搬到 server 表。
 * 欄位與 server/schema/nur15-row-validators.ts 的 NurtureRecordRow 對齊（snake_case）。
 *
 * 欄位來源（PM 裁定，暫定，可逆）：
 *   - revelation_level：沒有揭露時記 0（「未揭露」），有揭露就用實際層級（PROG-2-0744）。
 *   - phase_block_history_json：由每回合紀錄的 phase 組成 [{round, phase}]。
 *   - mentoring_mode_log_json：會話的 mentoringModeLog；沒有傳道時為空陣列。
 *   - reveal_log_json：用每回合揭露的負面因子組成 [{round, negativeFactor}]，沒有則為空陣列。
 *     這是最接近的既有欄位，不等於規格的完整揭露歷程。
 *   - tp_total：優先用 totalTp；舊存檔沒有 totalTp 時退用目前的 tp（只是餘額，可能偏低），並列在 unavailable。
 * 上述替代來源會列在 unavailable，方便呼叫端與測試看出哪些欄位是替代值。
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
    const unavailable: string[] = [];
    const tpTotal = session.totalTp ?? session.tp;
    if (session.totalTp === undefined) unavailable.push('tp_total');
    return {
        row: {
            session_id: session.sessionId,
            child_uid: session.childId,
            start_season: session.startSeason,
            end_season: endSeason,
            mentor_id: session.mentors[0]?.id ?? null,
            revelation_level: 0,
            phase_block_history_json: JSON.stringify(session.log.map(({ round, phase }) => ({ round, phase }))),
            mentoring_mode_log_json: JSON.stringify(session.mentoringModeLog ?? []),
            reveal_log_json: JSON.stringify(
                session.log.filter((entry) => entry.negativeFactor !== undefined)
                    .map(({ round, negativeFactor }) => ({ round, negativeFactor })),
            ),
            final_stats_json: JSON.stringify(session.prowess),
            graduation_tags_json: JSON.stringify([...graduation.tags]),
            rating: graduation.rating,
            tp_total: tpTotal,
        },
        unavailable,
    };
}
