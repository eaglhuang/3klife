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
    const bloodlineIds = Array.from(new Set(list.map((v) => v.Bloodline_ID))).sort();
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

/** 版面固定槽數：與 general-version-gallery-main.json 的 groupRow_* / cell_* 對應 */
export const GALLERY_GROUP_SLOTS = 8;
export const GALLERY_CELL_SLOTS = 6;

export interface GalleryLayoutState {
    texts: Record<string, string>;
    actives: Record<string, boolean>;
}

/**
 * 把圖鑑轉成 cc 端 applier 要的 texts / actives。左欄列出血源，右欄顯示選中血源的版本格。
 * 只做字串與顯示旗標對應；選中血源不存在時右欄為空。
 */
export function toGalleryLayoutState(groups: GalleryGroup[], selectedBloodlineId: string | null): GalleryLayoutState {
    const texts: Record<string, string> = { galleryTitle: '同名武將版本圖鑑' };
    const actives: Record<string, boolean> = {};
    for (let i = 0; i < GALLERY_GROUP_SLOTS; i++) {
        const g = groups[i];
        actives[`groupRow_${i}`] = !!g;
        if (!g) continue;
        texts[`groupName_${i}`] = g.displayName;
        texts[`groupProgress_${i}`] = g.progressText;
        actives[`groupSelected_${i}`] = g.bloodlineId === selectedBloodlineId;
    }
    const selected = findGalleryGroup(groups, selectedBloodlineId ?? '');
    texts.selectedName = selected ? selected.displayName : '';
    for (let i = 0; i < GALLERY_CELL_SLOTS; i++) {
        const e = selected?.entries[i];
        actives[`cell_${i}`] = !!e;
        if (!e) continue;
        texts[`cellName_${i}`] = e.displayName;
        texts[`cellTitle_${i}`] = e.versionTitle;
        texts[`cellState_${i}`] = e.owned ? '已擁有' : '未收集';
        actives[`cellLimited_${i}`] = e.isLimited;
    }
    return { texts, actives };
}
