// @spec-source → 使用者裁定 2026-10-26（紅顏、名將池一頁六框全身立繪，超過六位翻頁）；PROG-2-1126
/**
 * PortraitGallery — 「一頁六框立繪」的分頁與選取（純邏輯，不依賴 cc）
 *
 * 紅顏展示與招賢館共用同一套節點 id（每個 layout 各自一份，binder 依 host 分開）：
 *   btnFrame{i}（點選）、frame{i}Name、frame{i}Sub、frame{i}Tag（核心徽章）、frame{i}Sel（選中金框）、
 *   frame{i}Mask／frame{i}Portrait（立繪，執行期依臉部標記擺位，見 PortraitFrameFit）、
 *   btnPrev、btnNext、pageLabel。
 *
 * Unity 對照：固定 6 個 Item 的 Pager，只把目前頁的 ItemData 塞進去。
 */
import { pageSliceOf } from './FixedSlotPager';

export const PORTRAIT_GALLERY_PAGE_SIZE = 6;

export interface PortraitGalleryItem {
    id: string;
    name: string;
    /** 名字下方的小字（費用、已在名冊……）；空字串則不顯示 */
    sub: string;
    /** 立繪 key（kebab id 或 portraitKey），給 loadGeneralPortrait 與臉部標記查表 */
    portraitKey: string;
    /** 左上金色徽章文字；空字串則不顯示 */
    tag: string;
}

export interface PortraitGalleryView {
    texts: Record<string, string>;
    actives: Record<string, boolean>;
    enabled: Record<string, boolean>;
}

export class PortraitGallery<T extends PortraitGalleryItem> {
    private _page = 0;
    private _selectedId: string | null = null;

    public constructor(private readonly _items: () => readonly T[]) {}

    private _slice() {
        return pageSliceOf(this._items(), this._page, PORTRAIT_GALLERY_PAGE_SIZE);
    }

    public get page(): number { return this._slice().page; }

    public get pageCount(): number { return this._slice().pageCount; }

    public prev(): void { this._page = Math.max(0, this.page - 1); }

    public next(): void { this._page = Math.min(this.pageCount - 1, this.page + 1); }

    /** 本頁的項目（最多 6 個） */
    public pageItems(): T[] { return this._slice().items; }

    /** 點第 slot 框；空框忽略 */
    public select(slot: number): void {
        const item = this.pageItems()[slot];
        if (item) this._selectedId = item.id;
    }

    /** 選中的項目；沒選或已不存在時取本頁第一個 */
    public selected(): T | null {
        const all = this._items();
        return all.find((item) => item.id === this._selectedId) ?? this.pageItems()[0] ?? null;
    }

    public getView(): PortraitGalleryView {
        const slice = this._slice();
        const selectedId = this.selected()?.id;
        const texts: Record<string, string> = { pageLabel: `${slice.page + 1} / ${slice.pageCount}` };
        const actives: Record<string, boolean> = {};
        const enabled: Record<string, boolean> = { btnPrev: slice.hasPrev, btnNext: slice.hasNext };
        for (let i = 0; i < PORTRAIT_GALLERY_PAGE_SIZE; i++) {
            const item = slice.items[i];
            actives[`btnFrame${i}`] = !!item;
            texts[`frame${i}Name`] = item?.name ?? '';
            texts[`frame${i}Sub`] = item?.sub ?? '';
            texts[`frame${i}TagLabel`] = item?.tag ?? '';
            actives[`frame${i}Tag`] = !!item?.tag;
            actives[`frame${i}Sel`] = !!item && item.id === selectedId;
        }
        return { texts, actives, enabled };
    }
}
