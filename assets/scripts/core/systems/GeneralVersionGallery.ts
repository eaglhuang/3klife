/**
 * GeneralVersionGallery — 同名武將版本圖鑑（SAME-01 項 5 / PROG-2-0707，純邏輯，不依賴 cc）
 *
 * 規格：同名武將系統.md E 節 #5「版本圖鑑：展示同名武將所有版本收集進度」。
 *
 * Unity 對照：像一個圖鑑的 ViewModel。輸入是 GeneralVersion 資料表與玩家已擁有的 Template_ID 集合，
 * 輸出是「每個血源一頁、每個版本一格、整體進度文字」，cc 端只負責把這份資料綁到節點上。
 */
import { GeneralVersionRecord, versionsOfBloodline } from '../models/GeneralVersion';

export interface GalleryEntry {
    templateId: string;
    displayName: string;
    versionTitle: string;
    releaseDate: string | null;
    isLimited: boolean;
    owned: boolean;
}

export interface GalleryGroup {
    bloodlineId: string;
    /** 同血源任一版本的顯示名稱（取上架最早的版本） */
    displayName: string;
    entries: GalleryEntry[];
    ownedCount: number;
    totalCount: number;
    /** 「收集 x/y」；全收齊時為「已收集完成」 */
    progressText: string;
    complete: boolean;
}

/**
 * 依血源分組。owned 為玩家已擁有的 Template_ID 集合；同血源的版本依上架日排序（沿用 versionsOfBloodline）。
 * 沒有 Display_Name 的版本退回 Template_ID；沒有 Version_Title 的版本以空字串顯示。
 */
export function buildVersionGallery(list: GeneralVersionRecord[], owned: ReadonlySet<string>): GalleryGroup[] {
    const bloodlineIds = [...new Set(list.map((v) => v.Bloodline_ID))].sort();
    return bloodlineIds.map((bloodlineId) => {
        const versions = versionsOfBloodline(list, bloodlineId);
        const entries: GalleryEntry[] = versions.map((v) => ({
            templateId: v.Template_ID,
            displayName: v.Display_Name ?? v.Template_ID,
            versionTitle: v.Version_Title ?? '',
            releaseDate: v.Release_Date ?? null,
            isLimited: v.Is_Limited === true,
            owned: owned.has(v.Template_ID),
        }));
        const ownedCount = entries.filter((e) => e.owned).length;
        const totalCount = entries.length;
        const complete = totalCount > 0 && ownedCount === totalCount;
        return {
            bloodlineId,
            displayName: entries[0]?.displayName ?? bloodlineId,
            entries,
            ownedCount,
            totalCount,
            progressText: complete ? '已收集完成' : `收集 ${ownedCount}/${totalCount}`,
            complete,
        };
    });
}

/** 全圖鑑總進度：已擁有的版本數 / 版本總數（只計表內存在的 Template_ID）。 */
export function galleryTotals(groups: GalleryGroup[]): { ownedCount: number; totalCount: number } {
    return groups.reduce(
        (acc, g) => ({ ownedCount: acc.ownedCount + g.ownedCount, totalCount: acc.totalCount + g.totalCount }),
        { ownedCount: 0, totalCount: 0 },
    );
}

/** 單一血源的圖鑑頁；找不到時回傳 null。 */
export function findGalleryGroup(groups: GalleryGroup[], bloodlineId: string): GalleryGroup | null {
    return groups.find((g) => g.bloodlineId === bloodlineId) ?? null;
}
