// @spec-source → 軍師戰場HUD四摘要情資調度規格書.md（doc_spec_0352）；PROG-2-2038
/**
 * StrategistHudBridge — 軍師 HUD 的事件驅動狀態橋（純邏輯，不依賴 cc）
 *
 * - §3 只在事件回調時更新，且內容真的變了才通知；不提供每幀輪詢介面。
 * - §2 迷霧：隱匿／迷霧中的敵軍不進 HUD（座標、血量、兵種都不帶）。
 * - §4-3 戰後打撈：HUD 累計值直接交給結算報告用同一份數字。
 * 文字組成沿用 core/systems/StrategistHud；本檔只管狀態與通知。
 */

export interface StrategistHudHazard {
    tag: string;
    label: string;
    turnsLeft: number;
}

export interface StrategistHudObject {
    name: string;
    hpPercent: number;
    state: string;
}

export interface StrategistHudSalvage {
    wood: number;
    stone: number;
    grain: number;
}

export interface StrategistHudState {
    themeHazards: StrategistHudHazard[];
    interactiveObjects: StrategistHudObject[];
    accumulatedSalvage: StrategistHudSalvage;
    loadoutGaps: string[];
}

export type StrategistHudField = keyof StrategistHudState;

/** 增量通知：只帶有變動的欄位 */
export type StrategistHudListener = (patch: Partial<StrategistHudState>) => void;

function emptyState(): StrategistHudState {
    return { themeHazards: [], interactiveObjects: [], accumulatedSalvage: { wood: 0, stone: 0, grain: 0 }, loadoutGaps: [] };
}

function clampPercent(value: number): number {
    return Math.max(0, Math.min(100, Math.round(value)));
}

export class StrategistHudBridge {
    private _state: StrategistHudState = emptyState();
    private readonly _listeners: StrategistHudListener[] = [];

    public subscribe(listener: StrategistHudListener): () => void {
        this._listeners.push(listener);
        return () => {
            const index = this._listeners.indexOf(listener);
            if (index >= 0) this._listeners.splice(index, 1);
        };
    }

    /** 唯讀快照（複製一份，避免外部改到內部狀態） */
    public snapshot(): StrategistHudState {
        return JSON.parse(JSON.stringify(this._state));
    }

    public onTileStateChanged(hazards: readonly StrategistHudHazard[]): void {
        this._set('themeHazards', hazards.map((h) => ({ ...h })));
    }

    /** 新增或更新一個已揭露的物件 */
    public onObjectChanged(name: string, hpPercent: number, state: string): void {
        const next = this._state.interactiveObjects.map((o) => ({ ...o }));
        const target = next.find((o) => o.name === name);
        const percent = clampPercent(hpPercent);
        if (target) {
            target.hpPercent = percent;
            target.state = state;
        } else {
            next.push({ name, hpPercent: percent, state });
        }
        this._set('interactiveObjects', next);
    }

    public onSalvageGained(gain: Partial<StrategistHudSalvage>): void {
        const cur = this._state.accumulatedSalvage;
        this._set('accumulatedSalvage', {
            wood: cur.wood + Math.max(0, gain.wood ?? 0),
            stone: cur.stone + Math.max(0, gain.stone ?? 0),
            grain: cur.grain + Math.max(0, gain.grain ?? 0),
        });
    }

    public onLoadoutGapsChanged(gaps: readonly string[]): void {
        this._set('loadoutGaps', Array.from(gaps));
    }

    /** §4-3 戰後結算直接取這份累計值 */
    public salvageForReport(): StrategistHudSalvage {
        return { ...this._state.accumulatedSalvage };
    }

    public reset(): void {
        this._state = emptyState();
    }

    private _set<K extends StrategistHudField>(field: K, value: StrategistHudState[K]): void {
        if (JSON.stringify(this._state[field]) === JSON.stringify(value)) return;
        this._state = { ...this._state, [field]: value };
        const patch = { [field]: JSON.parse(JSON.stringify(value)) } as Partial<StrategistHudState>;
        for (const listener of this._listeners.slice()) listener(patch);
    }
}

export interface HudUnitIntel {
    unitId: string;
    isEnemy: boolean;
    /** 處於 Stealth（林地等）或迷霧中、我方尚未發現 */
    concealed: boolean;
    [field: string]: unknown;
}

/** §2 迷霧過濾：隱匿中的敵軍整筆剔除，其餘原樣保留 */
export function filterHudVisibleUnits<T extends HudUnitIntel>(units: readonly T[]): T[] {
    return units.filter((unit) => !(unit.isEnemy && unit.concealed));
}
