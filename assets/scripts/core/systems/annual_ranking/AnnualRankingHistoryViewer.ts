/**
 * 史境風雲史冊與名人堂統計控制器（PROG-2-9601 PR3）
 * 職責：
 * 1. 歷年盛典存檔（annualCeremonyArchive）多年度查詢
 * 2. 依據大合照 DTO 重現指定年度盛典快照
 * 3. 武將生涯殿堂統計（冠軍總次數、入圍前十總次數、榮譽明細）
 * 4. 存檔輕量化：僅讀取 DTO 與資料索引，不依賴任何圖檔
 */

import type { BoardRankResult } from './AnnualRankingTypes';
import type { CeremonyPhotoBackdropDto } from './CeremonyScriptAssembler';

export interface CeremonyArchiveYearDto {
    year: number;
    ceremonyPhotoBackdrop: CeremonyPhotoBackdropDto;
    results: Record<string, BoardRankResult>;
    hosts: [string, string];
}

export interface GeneralHonorRecord {
    year: number;
    boardId: string;
    rank: number;
    score: number;
    isChampion: boolean;
}

export interface GeneralHallOfFameStats {
    generalId: string;
    totalTitles: number; // 生涯冠軍次數
    top10Count: number;  // 生涯入圍前十次數
    honors: GeneralHonorRecord[];
}

export class AnnualRankingHistoryViewer {
    private _archives: Map<number, CeremonyArchiveYearDto> = new Map();

    constructor(initialArchives?: Record<number, CeremonyArchiveYearDto>) {
        if (initialArchives) {
            this.loadSnapshot(initialArchives);
        }
    }

    /**
     * 載入歷年存檔
     */
    public loadSnapshot(data?: Record<number, CeremonyArchiveYearDto>): void {
        this._archives.clear();
        if (!data || typeof data !== 'object') return;

        for (const [yearStr, record] of Object.entries(data)) {
            const year = parseInt(yearStr, 10);
            if (Number.isFinite(year) && record) {
                this._archives.set(year, record);
            }
        }
    }

    /**
     * 導出歷年存檔
     */
    public exportSnapshot(): Record<number, CeremonyArchiveYearDto> {
        const out: Record<number, CeremonyArchiveYearDto> = {};
        for (const [year, rec] of this._archives.entries()) {
            out[year] = rec;
        }
        return out;
    }

    /**
     * 封存新一屆盛典紀錄
     */
    public archiveCeremony(record: CeremonyArchiveYearDto): void {
        if (!record || !Number.isFinite(record.year)) return;
        this._archives.set(record.year, record);
    }

    /**
     * 取得已封存之所有歷史年度清單（由新到舊排序）
     */
    public getAvailableYears(): number[] {
        return Array.from(this._archives.keys()).sort((a, b) => b - a);
    }

    /**
     * 取得指定年度的完整盛典紀錄
     */
    public getYearRecord(year: number): CeremonyArchiveYearDto | null {
        return this._archives.get(year) || null;
    }

    /**
     * 查詢武將生涯名人堂統計
     */
    public getGeneralHallOfFameStats(generalId: string): GeneralHallOfFameStats {
        let totalTitles = 0;
        let top10Count = 0;
        const honors: GeneralHonorRecord[] = [];

        if (!generalId) {
            return { generalId: '', totalTitles: 0, top10Count: 0, honors: [] };
        }

        // 遍歷所有已歸檔年份
        const sortedYears = Array.from(this._archives.keys()).sort((a, b) => a - b);
        for (const year of sortedYears) {
            const archive = this._archives.get(year)!;
            const results = archive.results || {};

            for (const [boardId, boardResult] of Object.entries(results)) {
                if (!boardResult || !Array.isArray(boardResult.candidates)) continue;

                for (const cand of boardResult.candidates) {
                    if (cand.generalId === generalId && cand.rank <= 10) {
                        top10Count++;
                        const isChampion = (cand.rank === 1);
                        if (isChampion) {
                            totalTitles++;
                        }
                        honors.push({
                            year,
                            boardId,
                            rank: cand.rank,
                            score: cand.score,
                            isChampion
                        });
                    }
                }
            }
        }

        return {
            generalId,
            totalTitles,
            top10Count,
            honors
        };
    }
}
