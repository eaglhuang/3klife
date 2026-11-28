/**
 * HonorWallModel — 歷年榮譽牆純邏輯模型（不依賴 cc）
 *
 * 對應規格：docs/遊戲規格文件/系統規格書/歷年榮譽牆系統規格書.md
 * 職責：
 *   - 舊存檔遷移（缺漏 honorWallRecords / currentYearSnapshot 時預設空值）
 *   - 開局／每季快照更新「進行中的今年」置頂預覽卡片
 *   - 年末典禮完成後正式歸檔至 honorWallRecords，超過 maxStoredYears 時僅留前三名摘要
 */

export interface HonorWallEntry {
    rank: 1 | 2 | 3;
    familyName: string;
    leaderGeneralId: string;
    score: number;
    isPlayer: boolean;
}

export interface HonorWallYearRecord {
    year: number;
    playerRank: number;
    playerScore: number;
    topThree: HonorWallEntry[];
    badgeUnlocked: string | null;
    speechSummaryKey: string;
    isPreview?: boolean;
}

export interface HonorWallSaveSlice {
    honorWallRecords: HonorWallYearRecord[];
    currentYearSnapshot: HonorWallYearRecord | null;
}

export const DEFAULT_MAX_STORED_YEARS = 50;

export function migrateHonorWallSaveSlice(raw?: Partial<HonorWallSaveSlice> | null): HonorWallSaveSlice {
    return {
        honorWallRecords: Array.isArray(raw?.honorWallRecords) ? [...raw.honorWallRecords] : [],
        currentYearSnapshot: raw?.currentYearSnapshot ? { ...raw.currentYearSnapshot } : null,
    };
}

export function createInitialYearPreview(year = 1): HonorWallYearRecord {
    return {
        year,
        playerRank: 1,
        playerScore: 0,
        topThree: [],
        badgeUnlocked: null,
        speechSummaryKey: '',
        isPreview: true,
    };
}

export function updateSeasonHonorSnapshot(
    slice: HonorWallSaveSlice,
    snapshot: Omit<HonorWallYearRecord, 'isPreview'>,
): HonorWallSaveSlice {
    return {
        ...slice,
        currentYearSnapshot: {
            ...snapshot,
            isPreview: true,
        },
    };
}

export function archiveYearEndHonorRecord(
    slice: HonorWallSaveSlice,
    record: Omit<HonorWallYearRecord, 'isPreview'>,
    maxStoredYears = DEFAULT_MAX_STORED_YEARS,
): HonorWallSaveSlice {
    const filtered = slice.honorWallRecords.filter((item) => item.year !== record.year);
    const nextList: HonorWallYearRecord[] = [
        { ...record, isPreview: false },
        ...filtered,
    ].sort((a, b) => b.year - a.year);

    const trimmed = nextList.map((item, idx) => {
        if (idx < maxStoredYears) return item;
        // 超過 maxStoredYears 僅保留前三名摘要，裁除次要欄位
        return {
            year: item.year,
            playerRank: item.playerRank,
            playerScore: item.playerScore,
            topThree: item.topThree.slice(0, 3),
            badgeUnlocked: null,
            speechSummaryKey: '',
            isPreview: false,
        };
    });

    return {
        honorWallRecords: trimmed,
        currentYearSnapshot: null,
    };
}

export function getHonorWallDisplayList(slice: HonorWallSaveSlice, currentYear = 1): HonorWallYearRecord[] {
    const preview = slice.currentYearSnapshot ?? createInitialYearPreview(currentYear);
    return [preview, ...slice.honorWallRecords];
}
