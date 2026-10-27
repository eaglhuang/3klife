// @spec-source → 道具系統（付費免費道具）.md §道具背包 UI（P1，顯示持有道具列表、數量、篩選分類）、UI_ITEM_USE「使用 {ItemName} ×{Count}？」、UI_ITEM_LACK；ITM-10；PROG-2-1035、PROG-2-1038
/**
 * ItemBagController — 道具背包畫面的流程（純邏輯，不依賴 cc）。
 *
 * 職責：
 *   - 列出持有的道具（最多 BAG_ROW_SLOTS 列，對應 item-bag-main.json 的固定列節點）
 *   - 選取道具後顯示詳情；按「使用」先進入確認，按「確定」才真的呼叫 useItem
 *   - 輸出扁平 FlowView，key 與 item-bag-main.json 的節點 id 一一對應
 *
 * 規格沒有寫背包的版位，本畫面採用簡單清單加右側詳情加使用按鈕（PM 2026-10-27 裁定，座標交 Codex）。
 * 使用流程本身（扣數量、刷新、安胎藥 ARMED）在 ItemUseFlow／GameSession.useItem，這裡只轉換結果為提示文字。
 *
 * Unity 對照：Presenter。點「使用」先開確認 Dialog（pending），按確定才呼叫 Model 的 UseItem，
 * 結果的錯誤碼轉成 Dialog 文字，畫面本身不算數量。
 */
import { ItemUseResult } from '../../core/systems/ItemUseFlow';
import { buildItemBagRows, ItemBagRow } from '../../core/systems/ItemBagView';
import { ITEM_DISPLAY_NAMES, itemCount, PlayerInventory } from '../../core/systems/PlayerInventory';

/** item-bag-main.json 內的列節點數；超過的持有道具暫不顯示（分頁另卡）。 */
export const BAG_ROW_SLOTS = 13;

export interface ItemBagFlowView {
    texts: Record<string, string>;
    actives: Record<string, boolean>;
}

export interface ItemBagDeps {
    inventory: () => PlayerInventory;
    useItem: (itemId: string, nowMs: number) => ItemUseResult;
    now: () => number;
}

const MSG_NONE_SELECTED = '請先選擇道具';
const MSG_NOT_USABLE = '此道具目前無法使用';
const MSG_ALREADY_ARMED = '安胎藥已生效中，下一次結緣成功時才會消耗';

/** 使用被拒絕時的提示文字；數量不足沿用商城導向的提示。 */
function rejectMessage(result: Extract<ItemUseResult, { ok: false }>): string {
    if (result.reason === 'LACK') return result.prompt.text;
    if (result.reason === 'ALREADY_ARMED') return MSG_ALREADY_ARMED;
    return MSG_NOT_USABLE;
}

export class ItemBagController {
    private _selectedId: string | null = null;
    private _pendingConfirm = false;
    private _message = '';

    constructor(private readonly _deps: ItemBagDeps) {}

    /** 目前持有的道具列（只列數量大於 0 者）。 */
    public rows(): ItemBagRow[] {
        return buildItemBagRows(this._deps.inventory(), { onlyOwned: true }).slice(0, BAG_ROW_SLOTS);
    }

    /** 點第 index 列選取道具；取消任何待確認的使用。 */
    public select(index: number): void {
        this._selectedId = this.rows()[index]?.itemId ?? null;
        this._pendingConfirm = false;
        this._message = '';
    }

    /** 按「使用」：沒選道具就提示，否則進入確認狀態。 */
    public requestUse(): void {
        const row = this._selectedRow();
        if (!row) {
            this._message = MSG_NONE_SELECTED;
            return;
        }
        this._pendingConfirm = true;
        this._message = `使用 ${row.name} ×1？`;
    }

    /** 按「取消」：關掉確認，不用道具。 */
    public cancelUse(): void {
        this._pendingConfirm = false;
        this._message = '';
    }

    /** 按「確定」：真的呼叫使用流程，依結果更新提示；成功或失敗都結束確認狀態。 */
    public confirmUse(): ItemUseResult | null {
        const row = this._selectedRow();
        if (!this._pendingConfirm || !row) return null;
        const result = this._deps.useItem(row.itemId, this._deps.now());
        this._pendingConfirm = false;
        this._message = result.ok === true ? `已使用 ${row.name}` : rejectMessage(result);
        if (this._selectedRow() === null) this._selectedId = null;
        return result;
    }

    /** 扁平 FlowView：key 與 item-bag-main.json 的節點 id 對應。 */
    public getFlowView(): ItemBagFlowView {
        const rows = this.rows();
        const texts: Record<string, string> = { bagMessage: this._message };
        const actives: Record<string, boolean> = {};
        for (let i = 0; i < BAG_ROW_SLOTS; i++) {
            const row = rows[i];
            texts[`bagRowLabel${i}`] = row ? `${row.name} ×${row.count}` : '';
            actives[`btnBagRow${i}`] = row !== undefined;
        }
        const selected = this._selectedRow();
        texts.bagDetailName = selected ? selected.name : '未選擇道具';
        texts.bagDetailCount = selected ? `持有 ${selected.count}` : '';
        actives.btnBagUse = selected !== null && !this._pendingConfirm;
        actives.btnBagConfirm = this._pendingConfirm;
        actives.btnBagCancel = this._pendingConfirm;
        return { texts, actives };
    }

    /** 目前選取的道具；已經用完（數量為 0）時視為沒選。 */
    private _selectedRow(): ItemBagRow | null {
        if (!this._selectedId) return null;
        const inventory = this._deps.inventory();
        const count = itemCount(inventory, this._selectedId);
        if (count <= 0) return null;
        return { itemId: this._selectedId, name: ITEM_DISPLAY_NAMES[this._selectedId] ?? this._selectedId, count };
    }
}
