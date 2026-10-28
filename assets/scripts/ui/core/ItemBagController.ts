// @spec-source → 道具系統（付費免費道具）.md §道具背包 UI（P1，顯示持有道具列表、數量、篩選分類）、UI_ITEM_USE「使用 {ItemName} ×{Count}？」、UI_ITEM_LACK；ITM-10；PROG-2-1035、PROG-2-1038
/**
 * ItemBagController — 道具背包畫面的流程（純邏輯，不依賴 cc）。
 *
 * 職責：
 *   - 列出持有的道具，每頁 BAG_ROW_SLOTS 列（對應 item-bag-main.json 的固定列節點），超過時分頁（PROG-2-1200）
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
import { ITEM_CATEGORIES, type ItemCategory, itemDefOf } from '../../core/systems/ItemDef';
import { itemCount, PlayerInventory } from '../../core/systems/PlayerInventory';

/** item-bag-main.json 內的列節點數＝每頁列數；超過時以上一頁／下一頁翻頁（PROG-2-1200）。 */
export const BAG_ROW_SLOTS = 13;

/** 分類頁籤（ITM-02 掛載，PROG-2-1381）：第 0 格為全部（null），之後依五大分類順序；對應 item-bag-main.json 的 btnBagTab 節點。 */
export const BAG_CATEGORY_TABS: readonly (ItemCategory | null)[] = [null, ...ITEM_CATEGORIES];

function bagTabLabel(tab: ItemCategory | null): string {
    return tab === null ? '全部' : tab;
}

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
    private _page = 0;
    private _category: ItemCategory | null = null;

    constructor(private readonly _deps: ItemBagDeps) {}

    /** 目前的分類篩選；null 為全部分類（ITM-02）。 */
    public get category(): ItemCategory | null {
        return this._category;
    }

    /** 切換分類篩選：回到第一頁並取消選取與待確認的使用。 */
    public setCategory(category: ItemCategory | null): void {
        this._category = category;
        this._page = 0;
        this._selectedId = null;
        this._pendingConfirm = false;
        this._message = '';
    }

    /** 點第 index 個分類頁籤；超出範圍不動。 */
    public selectCategoryTab(index: number): void {
        if (index < 0 || index >= BAG_CATEGORY_TABS.length) return;
        this.setCategory(BAG_CATEGORY_TABS[index]);
    }

    /** 全部持有的道具列（只列數量大於 0 者，套用目前的分類篩選）。 */
    public allRows(): ItemBagRow[] {
        return buildItemBagRows(this._deps.inventory(), { onlyOwned: true, category: this._category });
    }

    /** 總頁數（至少 1）。 */
    public pageCount(): number {
        return Math.max(1, Math.ceil(this.allRows().length / BAG_ROW_SLOTS));
    }

    /** 目前頁碼（從 0 起）；道具用完使總頁數變少時夾回最後一頁。 */
    public get page(): number {
        return Math.min(this._page, this.pageCount() - 1);
    }

    /** 目前頁的道具列。 */
    public rows(): ItemBagRow[] {
        const start = this.page * BAG_ROW_SLOTS;
        return this.allRows().slice(start, start + BAG_ROW_SLOTS);
    }

    /** 翻頁（delta 為 ±1）；超出範圍不動，翻頁會取消待確認的使用。 */
    public turnPage(delta: number): void {
        const next = this.page + delta;
        if (next < 0 || next >= this.pageCount()) return;
        this._page = next;
        this._pendingConfirm = false;
        this._message = '';
    }

    /** 點目前頁第 index 列選取道具；取消任何待確認的使用。 */
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
        const pages = this.pageCount();
        texts.bagPageLabel = `第 ${this.page + 1}/${pages} 頁`;
        actives.bagPageLabel = pages > 1;
        actives.btnBagPrevPage = pages > 1 && this.page > 0;
        actives.btnBagNextPage = pages > 1 && this.page < pages - 1;
        texts.bagDetailName = selected ? selected.name : '未選擇道具';
        texts.bagDetailCount = selected ? `持有 ${selected.count}` : '';
        actives.btnBagUse = selected !== null && !this._pendingConfirm;
        actives.btnBagConfirm = this._pendingConfirm;
        actives.btnBagCancel = this._pendingConfirm;
        BAG_CATEGORY_TABS.forEach((tab, index) => {
            const current = tab === this._category;
            texts[`bagTabLabel${index}`] = `${current ? '● ' : ''}${bagTabLabel(tab)}`;
            actives[`btnBagTab${index}`] = true;
        });
        return { texts, actives };
    }

    /** 目前選取的道具；已經用完（數量為 0）時視為沒選。 */
    private _selectedRow(): ItemBagRow | null {
        if (!this._selectedId) return null;
        const inventory = this._deps.inventory();
        const count = itemCount(inventory, this._selectedId);
        if (count <= 0) return null;
        const def = itemDefOf(this._selectedId);
        if (!def) return null;
        return { itemId: def.id, name: def.name, count, category: def.category, rarity: def.rarity };
    }
}
