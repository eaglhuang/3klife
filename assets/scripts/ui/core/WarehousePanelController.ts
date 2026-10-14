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
import {
    canExpandWarehouse,
    warehouseCapacity,
    WAREHOUSE_EXPAND_STEP,
    WarehouseStoreResult,
} from '../../core/systems/WarehouseCapacity';

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
}

const FULL_NOTICE = '倉庫已滿，請擴容或整理';

export class WarehousePanelController {
    private _notice: string | null = null;

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

    /** 扁平 FlowView：key 與 warehouse-panel-main.json 的節點 id 對應。 */
    public getFlowView(): WarehousePanelFlowView {
        const used = this._deps.usedSlots();
        const capacity = warehouseCapacity(this._deps.expansions());
        const expandable = this.expandable();
        const notice = this._notice ?? (this.isFull() ? FULL_NOTICE : '');
        const texts: Record<string, string> = {
            warehouseTitle: '武將倉庫',
            warehouseCapacity: `容量 ${used}/${capacity}`,
            warehouseNotice: notice,
            btnWarehouseExpandLabel: expandable ? `擴容 +${WAREHOUSE_EXPAND_STEP} 格` : '已達上限',
            btnCloseLabel: '關閉',
        };
        const actives: Record<string, boolean> = { warehouseNotice: notice !== '' };
        const enabled: Record<string, boolean> = { btnClose: true, btnWarehouseExpand: expandable };
        return { texts, actives, enabled };
    }
}
