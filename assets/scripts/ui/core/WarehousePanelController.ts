// @spec-source → WBS v3 BAG-02（主城倉庫：50 格、擴容 +20、上限 200）；BAG-09（倉庫 UI 與字串）；PROG-2-0477
// @spec-source → 武將背包（倉庫）系統.md §鎖定保護（逐件選取鎖定／解鎖，PROG-2-1854）
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
    warehouseExpandGemCost,
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
    /** 鎖定或解鎖一件（GameSession.setInventoryLocked）；回傳是否找到該列；不給時鎖定鈕停用（PROG-2-1854） */
    setLocked?: (inventoryId: string, locked: boolean) => boolean;
}

/** 選取列的標記（加在列尾，PROG-2-1854） */
export const WAREHOUSE_SELECTED_MARK = '　◀';

/** 清單一頁最多列出幾件，前後以「…前有／另有 N 件」帶過 */
export const WAREHOUSE_LIST_MAX_LINES = 8;

const FULL_NOTICE = warehouseFullLine();

export class WarehousePanelController {
    private _notice: string | null = null;
    private _sortKey: WarehouseSortKey = 'quality';
    /** 選取的那一件（Inventory_ID）；換排序時保留 */
    private _selectedId: string | null = null;

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
        this._notice = ok ? null : `玉璧不足：擴容需要 ${warehouseExpandGemCost(this._deps.expansions())} 玉璧`;
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

    private _sorted(): readonly InventoryRecord[] {
        return sortWarehouseRecords(this._deps.storedRecords?.() ?? [], this._sortKey);
    }

    /** 選取列在排序後清單的位置；沒選或那件已不在倉庫時回到第一件 */
    private _selectedIndex(sorted: readonly InventoryRecord[]): number {
        const index = sorted.findIndex((record) => record.Inventory_ID === this._selectedId);
        return index >= 0 ? index : 0;
    }

    /** 目前選取的那一件；倉庫空時為 null */
    public selectedRecord(): InventoryRecord | null {
        const sorted = this._sorted();
        return sorted[this._selectedIndex(sorted)] ?? null;
    }

    /** 上一件／下一件（頭尾循環）：step = -1 或 +1 */
    public moveSelection(step: number): InventoryRecord | null {
        const sorted = this._sorted();
        if (sorted.length === 0) return null;
        const next = (this._selectedIndex(sorted) + step + sorted.length) % sorted.length;
        this._selectedId = sorted[next].Inventory_ID;
        return sorted[next];
    }

    /** 鎖定或解鎖選取的那一件；結果寫在提示列 */
    public toggleLockSelected(): boolean {
        const record = this.selectedRecord();
        if (!record || !this._deps.setLocked) {
            this._notice = '倉庫目前沒有物品';
            return false;
        }
        const locked = !!record.isLocked;
        const name = warehouseRecordLine({ ...record, isLocked: false });
        const ok = this._deps.setLocked(record.Inventory_ID, !locked);
        this._selectedId = record.Inventory_ID;
        this._notice = ok ? `${locked ? '已解鎖' : '已鎖定'} ${name}` : '找不到這件物品';
        return ok;
    }

    /** 依目前排序方式組出清單文字：顯示選取列所在的那一頁，選取列尾加標記 */
    public listText(): string {
        const sorted = this._sorted();
        if (sorted.length === 0) return '倉庫目前沒有物品';
        const selected = this._selectedIndex(sorted);
        const start = Math.floor(selected / WAREHOUSE_LIST_MAX_LINES) * WAREHOUSE_LIST_MAX_LINES;
        const page = sorted.slice(start, start + WAREHOUSE_LIST_MAX_LINES);
        const lines = page.map((record, i) => warehouseRecordLine(record) + (start + i === selected ? WAREHOUSE_SELECTED_MARK : ''));
        if (start > 0) lines.unshift(`…前有 ${start} 件`);
        const rest = sorted.length - start - page.length;
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
            btnWarehouseExpandLabel: expandable ? `擴容 +${WAREHOUSE_EXPAND_STEP} 格（${warehouseExpandGemCost(this._deps.expansions())} 玉璧）` : '已達上限',
            btnCloseLabel: '關閉',
            btnWarehousePrevLabel: '上一件',
            btnWarehouseNextLabel: '下一件',
            btnWarehouseLockLabel: this.selectedRecord()?.isLocked ? '解鎖' : '鎖定',
        };
        const actives: Record<string, boolean> = { warehouseNotice: notice !== '' };
        const count = this._sorted().length;
        const enabled: Record<string, boolean> = {
            btnClose: true,
            btnWarehouseExpand: expandable,
            btnWarehouseSort: true,
            btnWarehousePrev: count > 1,
            btnWarehouseNext: count > 1,
            btnWarehouseLock: count > 0 && !!this._deps.setLocked,
        };
        return { texts, actives, enabled };
    }
}
