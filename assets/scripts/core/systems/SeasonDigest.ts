// @spec-source → 新手前 10～20 分鐘稽核 C6（artifacts/newbie-audit-1126.md）、PM 裁決 A；PROG-2-10068
/**
 * SeasonDigest — 首年前幾季的「季報紀要」信箱（純邏輯，不依賴 cc）。
 *
 * 新手第一次推進一季會連彈 5 層報表（任務回報、戰報、事件、市井奇遇、小結）。
 * 規則：遊戲的第 1、2 次換季（Y1 春、夏）只彈「戰報」＋需玩家選擇的決策事件，
 * 純資訊的任務回報與市井奇遇改寫成信箱裡的一則紀要（未讀有紅點），第 3 季起恢復完整流程。
 *
 * 只合併純資訊報表：需要玩家選擇的事件（性格事件、血統里程碑）不在這裡，永遠照舊彈窗。
 * 紀要只存結構（種類＋參數），文字由 UI 端走 i18n 組出，所以換語系也跟著換。
 *
 * Unity 對照：像一個 Inbox 的 Notification 清單，每筆帶 isRead；UI 只讀清單與未讀數。
 */

/** 前幾次換季走精簡流程（Y1 春、夏＝第 1、2 次換季） */
export const EARLY_QUIET_SEASONS = 2;
/** 精簡季的戰報結緣名單只列幾位（其餘併成「另有 N 位」一行） */
export const EARLY_QUIET_BOND_ROWS = 3;
/** 信箱紀要最多保留幾則，超過丟最舊的 */
export const SEASON_DIGEST_LIMIT = 12;

export type SeasonDigestKind = 'mission' | 'chronicle';

export interface SeasonDigestNote {
    /** `<kind>-<season>`：同一季同一種只會有一則 */
    id: string;
    /** 換季後的 totalSeasonsElapsed */
    season: number;
    kind: SeasonDigestKind;
    /** 組文字用的參數（種類決定每格意義，見 build*Note） */
    args: string[];
    read: boolean;
}

/** 換季後的 totalSeasonsElapsed 是否屬於精簡季（第 1、2 次換季）。 */
export function isEarlyQuietSeason(totalSeasonsElapsed: number): boolean {
    return Number.isInteger(totalSeasonsElapsed) && totalSeasonsElapsed >= 1 && totalSeasonsElapsed <= EARLY_QUIET_SEASONS;
}

/** 這次換季要彈哪些報表（宿主依它決定，不自己散落判斷） */
export interface SeasonAdvanceFlowPlan {
    /** 逐張任務回報卡疊（精簡季改進信箱） */
    showMissionStack: boolean;
    /** 三國季報（市井奇遇；精簡季改進信箱） */
    openChronicle: boolean;
    /** 戰報結緣名單上限；undefined＝用預設（6） */
    bondRowLimit: number | undefined;
    /** 純資訊報表要不要寫進信箱 */
    fileDigest: boolean;
}

export function planSeasonAdvanceFlow(totalSeasonsElapsed: number): SeasonAdvanceFlowPlan {
    const quiet = isEarlyQuietSeason(totalSeasonsElapsed);
    return {
        showMissionStack: !quiet,
        openChronicle: !quiet,
        bondRowLimit: quiet ? EARLY_QUIET_BOND_ROWS : undefined,
        fileDigest: quiet,
    };
}

/** 任務回報紀要：args = [完成件數, 成功件數, 逐筆文字（換行分隔，最多 2 行）]；沒有任務結算回傳 null */
export function buildMissionDigestNote(season: number, report: { settled: number; succeeded: number; lines: readonly string[] } | null | undefined): SeasonDigestNote | null {
    if (!report || report.settled <= 0) return null;
    return {
        id: `mission-${season}`,
        season,
        kind: 'mission',
        args: [String(report.settled), String(report.succeeded), report.lines.slice(0, 2).join('\n')],
        read: false,
    };
}

/** 市井奇遇紀要：args = [天下大勢, 奇遇標題, 奇遇描述]；沒有奇遇時標題與描述為空字串。尚未產生季報時回傳 null。 */
export function buildChronicleDigestNote(season: number, chronicle: { season: number; trend: string; encounterTitle?: string; encounterDesc?: string }): SeasonDigestNote | null {
    if (chronicle.season < 0) return null;
    return {
        id: `chronicle-${season}`,
        season,
        kind: 'chronicle',
        args: [chronicle.trend, chronicle.encounterTitle ?? '', chronicle.encounterDesc ?? ''],
        read: false,
    };
}

/** 加入紀要；同 id 不重複加入（換季重跑也安全），超過上限丟最舊的。不改輸入。 */
export function appendSeasonDigest(list: readonly SeasonDigestNote[], note: SeasonDigestNote): SeasonDigestNote[] {
    if (list.some((item) => item.id === note.id)) return list.map(copyNote);
    const next = [...list.map(copyNote), copyNote(note)];
    return next.length > SEASON_DIGEST_LIMIT ? next.slice(next.length - SEASON_DIGEST_LIMIT) : next;
}

export function markSeasonDigestRead(list: readonly SeasonDigestNote[], id: string): SeasonDigestNote[] {
    return list.map((item) => (item.id === id ? { ...copyNote(item), read: true } : copyNote(item)));
}

export function seasonDigestUnreadCount(list: readonly SeasonDigestNote[]): number {
    return list.filter((item) => !item.read).length;
}

function copyNote(note: SeasonDigestNote): SeasonDigestNote {
    return { ...note, args: [...note.args] };
}

/** 讀檔正規化：舊存檔沒有欄位、或欄位被竄改都回安全值 */
export function normalizeSeasonDigest(raw: unknown): SeasonDigestNote[] {
    if (!Array.isArray(raw)) return [];
    const out: SeasonDigestNote[] = [];
    for (const item of raw) {
        if (!item || typeof item !== 'object') continue;
        const v = item as Partial<SeasonDigestNote>;
        if (typeof v.id !== 'string' || v.id.length === 0) continue;
        if (v.kind !== 'mission' && v.kind !== 'chronicle') continue;
        if (!Number.isInteger(v.season) || (v.season as number) < 0) continue;
        const args = Array.isArray(v.args) ? v.args.filter((a): a is string => typeof a === 'string') : [];
        if (out.some((existing) => existing.id === v.id)) continue;
        out.push({ id: v.id, season: v.season as number, kind: v.kind, args, read: v.read === true });
    }
    return out.slice(-SEASON_DIGEST_LIMIT);
}
