// @spec-source docs/cross-reference-index.md
/**
 * SandtableTerritoryComposite — 天下沙盤領地選擇彈窗（PROG-2-0967）
 *
 * 畫面規格：ui-spec/screens/sandtable-territory-screen.json。
 * 列狀態與文字由 SandtableTerritoryPicker 純邏輯產生；點擊可放置的領地時交給呼叫端 onPlace。
 *
 * Unity 對照：Popup Prefab 的 Controller。點按鈕 → 呼叫 Session 放置 → 依結果重畫列。
 */
import { _decorator, Button } from 'cc';
import { CompositePanel } from '../core/CompositePanel';
import type { UITemplateBinder } from '../core/UITemplateBinder';
import {
    buildSandtableTerritoryPickerTexts,
    sandtableTerritoryRowStates,
    SANDTABLE_PICKER_ROWS,
} from '../../core/systems/SandtableTerritoryPicker';
import { sandtableTerritories, type SandtableTerritory } from '../../core/systems/SandtableTerritories';
import type { OfficerUnlocks } from '../../core/systems/OfficerSnapshot';

const { ccclass } = _decorator;

const SCREEN_ID = 'sandtable-territory-screen';

export interface SandtableTerritoryOpenPayload {
    stage: OfficerUnlocks['sandtableStage'];
    /** 已放置標記的領地 id */
    markerTerritories: readonly string[];
    /** 放置一個標記；回傳 false 表示被拒絕（呼叫端負責提示） */
    onPlace: (territoryId: string) => boolean;
    /** 語系查詢：key 為 territory.<id>.name */
    nameOf: (territoryId: string) => string;
    onRequestClose?: () => void;
}

@ccclass('SandtableTerritoryComposite')
export class SandtableTerritoryComposite extends CompositePanel {
    public onRequestClose: (() => void) | null = null;

    private _templateBinder: UITemplateBinder | null = null;
    private _payload: SandtableTerritoryOpenPayload | null = null;
    private _markers: string[] = [];
    private _isMounted = false;

    public async show(payload: SandtableTerritoryOpenPayload): Promise<void> {
        if (!this._isMounted) {
            await this.mount(SCREEN_ID);
            this._isMounted = true;
        }
        this._payload = payload;
        this._markers = [...payload.markerTerritories];
        this.onRequestClose = payload.onRequestClose ?? null;
        this._applyTexts();
        this.node.active = true;
    }

    public hide(): void {
        this.node.active = false;
    }

    protected override _onAfterBuildReady(binder: UITemplateBinder): void {
        this._templateBinder = binder;
        for (const id of ['overlayMask', 'btnClose']) {
            this._bindClick(id, () => this._close());
        }
        for (let i = 0; i < SANDTABLE_PICKER_ROWS; i += 1) {
            this._bindClick(`territoryRow${i}`, () => this._onRowClick(i));
        }
    }

    private _onRowClick(index: number): void {
        const payload = this._payload;
        const territory = this._territories()[index];
        if (!payload || !territory) return;
        const state = this._rowStates().find(row => row.territoryId === territory.id)?.state;
        if (state !== 'available') return;
        if (payload.onPlace(territory.id)) {
            this._markers = [...this._markers, territory.id];
            this._applyTexts();
        }
    }

    private _territories(): readonly SandtableTerritory[] {
        return sandtableTerritories();
    }

    private _rowStates() {
        const payload = this._payload;
        return sandtableTerritoryRowStates(this._territories(), this._markers, payload?.stage ?? null);
    }

    private _applyTexts(): void {
        const payload = this._payload;
        if (!payload) return;
        const rows = this._rowStates();
        this._templateBinder?.setTextsByPath(buildSandtableTerritoryPickerTexts(rows, payload.nameOf, payload.stage, this._markers.length));
    }

    private _close(): void {
        if (this.onRequestClose) {
            this.onRequestClose();
            return;
        }
        this.hide();
    }

    private _bindClick(id: string, handler: () => void): void {
        const button: Button | null = this._templateBinder?.getButton(id) ?? null;
        if (!button) return;
        button.node.on(Button.EventType.CLICK, handler, this);
    }
}
