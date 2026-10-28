// @spec-source → 武將人物介面規格書 §寶頁 2x3 格位；武將裝備道具系統 §「寶 / GEAR」一般裝備六槽；PROG-2-1044
/**
 * GearSlotPickController — 寶頁格位點擊後的選取面板流程（純邏輯，不依賴 cc）。
 *
 * 職責：
 *   - open(slot) 開啟某一格，列出可放入的裝備（buildGearPickerRows）
 *   - choose(index) 選一件裝備後直接呼叫穿戴；unequip() 卸下該格裝備
 *   - 把穿戴或卸下的結果轉成提示文字；成功後清空選取狀態
 *   - 輸出扁平 FlowView，key 與選取面板的 layout 節點 id 對應（layout 另卡）
 *
 * 寫入一律經 deps.equip／deps.unequip（即 GameSession.equipGear／unequipGear），這裡不改物件庫。
 *
 * Unity 對照：Presenter。點格子開 Picker，點項目才呼叫 Model 的 Equip，錯誤碼轉成 Dialog 文字。
 */
import { EquipSlot } from '../../core/systems/GeneralBackpack';
import { buildGearPickerRows, GearPickerRow, hasEquippedInSlot } from '../../core/systems/GearPickerView';
import type { GearEquipRejectReason, GearEquipResult } from '../../core/systems/GearEquipFlow';
import type { InventoryRecord } from '../../core/systems/InventoryProjection';
import { GEAR_SLOT_NAMES } from '../../core/systems/GearPageSlots';
import type { GearDecomposeResult } from '../../core/systems/GearLockDecompose';

/** 選取面板的列節點數（與 layout 固定列對應，之後接 layout 時使用）。 */
export const GEAR_PICK_ROW_SLOTS = 8;

export interface GearSlotPickDeps {
    records: () => readonly InventoryRecord[];
    generalUid: () => string;
    equip: (gearUid: string, generalUid: string, slotId: EquipSlot) => GearEquipResult;
    unequip: (generalUid: string, slotId: EquipSlot) => GearEquipResult;
    /** 設定鎖定（BAG-07，GameSession.setInventoryLocked）；回傳是否找到該列 */
    setLocked: (gearUid: string, locked: boolean) => boolean;
    /** 分解一件一般裝備（BAG-07，GameSession.decomposeGear） */
    decompose: (gearUid: string) => GearDecomposeResult;
}

export interface GearSlotPickFlowView {
    texts: Record<string, string>;
    actives: Record<string, boolean>;
}

const DECOMPOSE_REJECT_TEXT: Record<Extract<GearDecomposeResult, { ok: false }>['reason'], string> = {
    NOT_FOUND: '找不到這件裝備',
    NOT_GEAR: '這不是一般裝備',
    LOCKED: '已鎖定，請先解鎖再分解',
    EQUIPPED: '裝備中，請先卸下再分解',
};

const REJECT_TEXT: Record<GearEquipRejectReason, string> = {
    NOT_FOUND: '找不到這件裝備',
    NOT_GEAR: '這不是一般裝備',
    OWNED_ELSEWHERE: '這件裝備已在其他武將身上，請先卸下',
    NOT_EQUIPABLE: '這件裝備不能放進這一格',
    SLOT_LOCKED: '這一格尚未解鎖',
};

export class GearSlotPickController {
    private _slot: EquipSlot | null = null;
    private _rows: GearPickerRow[] = [];
    private _message = '';
    /** 管理模式：點列是選取（供鎖定／分解），不是穿戴（BAG-07 暫定 UI） */
    private _manage = false;
    private _selectedGearUid: string | null = null;

    constructor(private readonly _deps: GearSlotPickDeps) {}

    /** 目前開啟的格位；未開啟為 null。 */
    public slot(): EquipSlot | null {
        return this._slot;
    }

    /** 開啟某一格，重新列出可放入的裝備。 */
    public open(slot: EquipSlot): void {
        this._slot = slot;
        this._message = '';
        this._selectedGearUid = null;
        this._refreshRows();
    }

    public close(): void {
        this._slot = null;
        this._rows = [];
        this._message = '';
        this._manage = false;
        this._selectedGearUid = null;
    }

    /** 切換管理模式；切換時清掉選取與提示。 */
    public toggleManage(): void {
        this._manage = !this._manage;
        this._selectedGearUid = null;
        this._message = '';
    }

    /** 目前選取的裝備列（管理模式才會有）。 */
    public selectedRow(): GearPickerRow | null {
        return this._rows.find((row) => row.gearUid === this._selectedGearUid) ?? null;
    }

    /** 鎖定或解鎖目前選取的裝備；沒有選取回傳 false。 */
    public toggleLockSelected(): boolean {
        const row = this.selectedRow();
        if (!row) {
            this._message = '請先選擇裝備';
            return false;
        }
        const locked = this._isLocked(row.gearUid);
        const ok = this._deps.setLocked(row.gearUid, !locked);
        this._message = ok ? (locked ? `已解鎖 ${row.name}` : `已鎖定 ${row.name}`) : '找不到這件裝備';
        this._refreshRows();
        return ok;
    }

    /** 分解目前選取的裝備；成功後關閉選取並提示拿到的材料。 */
    public decomposeSelected(): GearDecomposeResult | null {
        const row = this.selectedRow();
        if (!row) {
            this._message = '請先選擇裝備';
            return null;
        }
        const result = this._deps.decompose(row.gearUid);
        if (result.ok === true) {
            this._selectedGearUid = null;
            this._message = `已分解 ${row.name}，獲得 ${result.material.amount} 件竹簡`;
            this._refreshRows();
        } else {
            this._message = DECOMPOSE_REJECT_TEXT[result.reason];
        }
        return result;
    }

    /** 目前列表（未開啟時為空）。 */
    public rows(): GearPickerRow[] {
        return this._rows.slice(0, GEAR_PICK_ROW_SLOTS);
    }

    /** 選第 index 件裝備並穿上；成功後關閉面板，失敗則留在面板上顯示原因。 */
    public choose(index: number): GearEquipResult | null {
        if (this._slot === null) return null;
        const row = this.rows()[index];
        if (!row) return null;
        if (this._manage) {
            this._selectedGearUid = row.gearUid;
            this._message = '';
            return null;
        }
        const result = this._deps.equip(row.gearUid, this._deps.generalUid(), this._slot);
        this._finish(result, `已穿上 ${row.name}`);
        return result;
    }

    /** 卸下該格裝備回到倉庫；該格沒有裝備時回傳 null。 */
    public unequip(): GearEquipResult | null {
        if (this._slot === null || !hasEquippedInSlot(this._deps.records(), this._deps.generalUid(), this._slot)) return null;
        const result = this._deps.unequip(this._deps.generalUid(), this._slot);
        this._finish(result, `已卸下${GEAR_SLOT_NAMES[this._slot]}`);
        return result;
    }

    /** 扁平 FlowView：key 與選取面板 layout 節點 id 對應（layout 另卡）。 */
    public getFlowView(): GearSlotPickFlowView {
        const rows = this.rows();
        const texts: Record<string, string> = {
            gearPickTitle: this._slot ? `選擇${GEAR_SLOT_NAMES[this._slot]}` : '',
            gearPickMessage: this._message,
        };
        const actives: Record<string, boolean> = {};
        for (let i = 0; i < GEAR_PICK_ROW_SLOTS; i++) {
            texts[`gearPickLabel${i}`] = rows[i] ? (rows[i].quality ? `${rows[i].quality}｜${rows[i].name}` : rows[i].name) : '';
            actives[`btnGearPick${i}`] = rows[i] !== undefined;
        }
        const equipped = this._slot !== null && hasEquippedInSlot(this._deps.records(), this._deps.generalUid(), this._slot);
        actives.btnGearUnequip = equipped;
        actives.gearPickPanel = this._slot !== null;
        const selected = this.selectedRow();
        texts.gearManageLabel = this._manage ? '管理：開' : '管理：關';
        texts.gearLockLabel = selected && this._isLocked(selected.gearUid) ? '解鎖' : '鎖定';
        texts.gearDecomposeLabel = '分解';
        actives.btnGearManage = this._slot !== null;
        actives.btnGearLock = selected !== null;
        actives.btnGearDecompose = selected !== null;
        return { texts, actives };
    }

    private _finish(result: GearEquipResult, okText: string): void {
        if (result.ok === true) {
            this.close();
            this._message = okText;
            return;
        }
        this._message = REJECT_TEXT[result.reason];
        this._refreshRows();
    }

    private _isLocked(gearUid: string): boolean {
        return this._deps.records().find((record) => record.Inventory_ID === gearUid)?.isLocked === true;
    }

    private _refreshRows(): void {
        this._rows = this._slot === null ? [] : buildGearPickerRows(this._deps.records(), this._deps.generalUid(), this._slot);
    }
}
