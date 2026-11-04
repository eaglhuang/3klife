// @spec-source → WBS v3 BAG-02（主城倉庫：50 格、擴容 +20、上限 200）；BAG-09（倉庫 UI 與字串）；PROG-2-0477
/**
 * WarehousePanelController — 倉庫面板的畫面流程（純邏輯，不依賴 cc）。
 *
 * 職責：
 *   - 顯示容量（已用/上限）與擴容按鈕（達上限時停用）
 *   - 存入被拒絕（滿倉）時由 reportStore() 設提示；擴容成功或容量足夠時提示清除
 *   - 輸出扁平 FlowView，key 與 warehouse-panel-main.json 的節點 id 一一對應
 *
 * Unity 對照：Presenter。Button onClick 只呼叫 expandSelected()，畫面層拿 getFlowView() 一次刷新。
 */
import { warehouseFullLine } from '../../core/systems/BackpackScripts';
import {
    canExpandWarehouse,
    warehouseCapacity,
    WAREHOUSE_EXPAND_STEP,
    WarehouseStoreResult,
} from '../../core/systems/WarehouseCapacity';
import type { InventoryRecord } from '../../core/systems/InventoryProjection';
import {
    nextWarehouseSortKey,
    sortWarehouseRecords,
    WAREHOUSE_SORT_LABEL,
    warehouseRecordLine,
    WarehouseSortKey,
} from '../../core/systems/WarehouseSort';

export interface WarehousePanelFlowView {
    texts: Record<string, string>;
    actives: Record<string, boolean>;
    enabled: Record<string, boolean>;
}

export interface WarehousePanelDeps {
    /** 目前已用格數。 */
    usedSlots: () => number;
    /** 目前擴容次數。 */
    expansions: () => number;
    /** 擴容一次：回傳是否成功；由呼叫端寫入存檔。 */
    expand: () => boolean;
    /** 倉庫裡的物件列（不含已裝在武將身上的）；不給時清單顯示空倉提示（PROG-2-1721） */
    storedRecords?: () => readonly InventoryRecord[];
}

/** 清單最多列出幾件，其餘以「…另有 N 件」帶過 */
export const WAREHOUSE_LIST_MAX_LINES = 8;

const FULL_NOTICE = warehouseFullLine();

export class WarehousePanelController {
    private _notice: string | null = null;
    private _sortKey: WarehouseSortKey = 'quality';

    constructor(private readonly _deps: WarehousePanelDeps) {}

    /** 還能不能擴容（容量未達上限）。 */
    public expandable(): boolean {
        return canExpandWarehouse(this._deps.expansions());
    }

    /** 已用格數是否已達容量。 */
    public isFull(): boolean {
        return this._deps.usedSlots() >= warehouseCapacity(this._deps.expansions());
    }

    /** 存入結果回報：被拒絕（滿倉）時設提示；成功則清除提示。 */
    public reportStore(result: WarehouseStoreResult): void {
        this._notice = result.ok ? null : FULL_NOTICE;
    }

    /** 擴容按鈕；已達上限時只設提示，不呼叫 expand。 */
    public expandSelected(): boolean {
        if (!this.expandable()) {
            this._notice = '已達倉庫容量上限';
            return false;
        }
        const ok = this._deps.expand();
        this._notice = ok ? null : '擴容失敗，請稍後再試';
        return ok;
    }

    /** 目前排序方式 */
    public get sortKey(): WarehouseSortKey {
        return this._sortKey;
    }

    /** 排序按鈕：品質 → 類型 → 取得時間 循環（倉庫系統 §E-6） */
    public cycleSort(): WarehouseSortKey {
        this._sortKey = nextWarehouseSortKey(this._sortKey);
        return this._sortKey;
    }

    /** 依目前排序方式組出清單文字 */
    public listText(): string {
        const records = this._deps.storedRecords?.() ?? [];
        if (records.length === 0) return '倉庫目前沒有物品';
        const sorted = sortWarehouseRecords(records, this._sortKey);
        const lines = sorted.slice(0, WAREHOUSE_LIST_MAX_LINES).map(warehouseRecordLine);
        const rest = sorted.length - lines.length;
        if (rest > 0) lines.push(`…另有 ${rest} 件`);
        return lines.join('\n');
    }

    /** 扁平 FlowView：key 與 warehouse-panel-main.json 的節點 id 對應。 */
    public getFlowView(): WarehousePanelFlowView {
        const used = this._deps.usedSlots();
        const capacity = warehouseCapacity(this._deps.expansions());
        const expandable = this.expandable();
        const notice = this._notice ?? (this.isFull() ? FULL_NOTICE : '');
        const texts: Record<string, string> = {
            warehouseTitle: '主城倉庫',
            warehouseCapacity: `容量 ${used}/${capacity}`,
            warehouseNotice: notice,
            btnWarehouseSortLabel: `排序：${WAREHOUSE_SORT_LABEL[this._sortKey]}`,
            warehouseList: this.listText(),
            btnWarehouseExpandLabel: expandable ? `擴容 +${WAREHOUSE_EXPAND_STEP} 格` : '已達上限',
            btnCloseLabel: '關閉',
        };
        const actives: Record<string, boolean> = { warehouseNotice: notice !== '' };
        const enabled: Record<string, boolean> = { btnClose: true, btnWarehouseExpand: expandable, btnWarehouseSort: true };
        return { texts, actives, enabled };
    }
}
