/**
 * GeneralVersionGalleryController — 同名武將版本圖鑑畫面的狀態（PROG-2-0708 cc 接線，純邏輯，不依賴 cc）
 *
 * 記住目前選中的血源；選血源與開關只改這裡的狀態，畫面端用 getView() 取得節點資料後套上去。
 *
 * Unity 對照：像圖鑑 Panel 的 Presenter，持有資料表與選中的分頁，View 只負責 Bind 結果。
 */
import type { GeneralVersionRecord } from '../../core/models/GeneralVersion';
import { buildVersionGallery, GALLERY_GROUP_SLOTS, toGalleryLayoutState } from '../../core/systems/GeneralVersionGallery';

export interface GeneralVersionGalleryView {
    open: boolean;
    texts: Record<string, string>;
    actives: Record<string, boolean>;
    selectedBloodlineId: string | null;
}

export class GeneralVersionGalleryController {
    private _table: GeneralVersionRecord[] = [];
    private _owned: ReadonlySet<string> = new Set();
    private _selected: string | null = null;
    private _open = false;

    /** 開啟圖鑑；預設選中第一個血源，沒有資料時不選。 */
    open(table: GeneralVersionRecord[], owned: ReadonlySet<string>): void {
        this._table = table;
        this._owned = owned;
        const first = buildVersionGallery(table, owned)[0];
        this._selected = first ? first.bloodlineId : null;
        this._open = true;
    }

    close(): void {
        this._open = false;
        this._selected = null;
    }

    /** 點左欄某一血源；超出版面槽數或不存在的血源會被忽略。 */
    selectBloodline(bloodlineId: string): void {
        const groups = buildVersionGallery(this._table, this._owned);
        const index = groups.findIndex((g) => g.bloodlineId === bloodlineId);
        if (index < 0 || index >= GALLERY_GROUP_SLOTS) return;
        this._selected = bloodlineId;
    }

    /** 左欄第 index 格對應的血源；沒有或超出槽數時回傳 null。 */
    getBloodlineIdAt(index: number): string | null {
        if (index < 0 || index >= GALLERY_GROUP_SLOTS) return null;
        return buildVersionGallery(this._table, this._owned)[index]?.bloodlineId ?? null;
    }

    getView(): GeneralVersionGalleryView {
        if (!this._open) {
            return { open: false, texts: {}, actives: {}, selectedBloodlineId: null };
        }
        const groups = buildVersionGallery(this._table, this._owned);
        return { open: true, ...toGalleryLayoutState(groups, this._selected), selectedBloodlineId: this._selected };
    }
}
