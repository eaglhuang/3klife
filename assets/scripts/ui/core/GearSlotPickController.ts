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

/** 選取面板的列節點數（與 layout 固定列對應，之後接 layout 時使用）。 */
export const GEAR_PICK_ROW_SLOTS = 8;

export interface GearSlotPickDeps {
    records: () => readonly InventoryRecord[];
    generalUid: () => string;
    equip: (gearUid: string, generalUid: string, slotId: EquipSlot) => GearEquipResult;
    unequip: (generalUid: string, slotId: EquipSlot) => GearEquipResult;
}

export interface GearSlotPickFlowView {
    texts: Record<string, string>;
    actives: Record<string, boolean>;
}

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

    constructor(private readonly _deps: GearSlotPickDeps) {}

    /** 目前開啟的格位；未開啟為 null。 */
    public slot(): EquipSlot | null {
        return this._slot;
    }

    /** 開啟某一格，重新列出可放入的裝備。 */
    public open(slot: EquipSlot): void {
        this._slot = slot;
        this._message = '';
        this._refreshRows();
    }

    public close(): void {
        this._slot = null;
        this._rows = [];
        this._message = '';
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
            texts[`gearPickLabel${i}`] = rows[i]?.name ?? '';
            actives[`btnGearPick${i}`] = rows[i] !== undefined;
        }
        const equipped = this._slot !== null && hasEquippedInSlot(this._deps.records(), this._deps.generalUid(), this._slot);
        actives.btnGearUnequip = equipped;
        actives.gearPickPanel = this._slot !== null;
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

    private _refreshRows(): void {
        this._rows = this._slot === null ? [] : buildGearPickerRows(this._deps.records(), this._deps.generalUid(), this._slot);
    }
}
