// @spec-source → 官職系統.md §功能清單 #4「世界沙盤解鎖」；PROG-2-0967（領地選擇畫面的列與文字）
/**
 * SandtableTerritoryPicker — 天下沙盤領地選擇的列資料與文字（純邏輯，不依賴 cc）
 *
 * 每列是一個領地：已放置、可放置、不可放置三種狀態。
 * 不可放置的原因（未解鎖、上限已滿）統一顯示「—」，不另外列原因（暫定）。
 *
 * Unity 對照：Presenter。View 只把 texts[path] 寫進 Label，不自己判斷狀態。
 */
import type { SandtableTerritory } from './SandtableTerritories';
import { SANDTABLE_MARKER_LIMIT } from './SandtableMarkers';
import type { OfficerUnlocks } from './OfficerSnapshot';

/** 畫面最多列出的領地數（與 layouts/sandtable-territory-main.json 的列數一致） */
export const SANDTABLE_PICKER_ROWS = 13;

export type SandtableTerritoryRowState = 'placed' | 'available' | 'unavailable';

export interface SandtableTerritoryRow {
    readonly territoryId: string;
    readonly nameKey: string;
    readonly state: SandtableTerritoryRowState;
}

/** 可放置 = 已解鎖、還有名額、該領地尚未有標記 */
export function sandtableTerritoryRowStates(
    territories: readonly SandtableTerritory[],
    markerTerritories: readonly string[],
    stage: OfficerUnlocks['sandtableStage'],
): SandtableTerritoryRow[] {
    const hasRoom = stage !== null && markerTerritories.length < SANDTABLE_MARKER_LIMIT[stage];
    return territories.map(territory => {
        const placed = markerTerritories.includes(territory.id);
        const state: SandtableTerritoryRowState = placed ? 'placed' : hasRoom ? 'available' : 'unavailable';
        return { territoryId: territory.id, nameKey: territory.nameKey, state };
    });
}

/**
 * 領地選擇畫面的全部文字，key 為相對 screen 根節點的路徑。
 * name 由呼叫端以語系查詢傳入（nameOf），這裡不依賴 i18n。
 */
export function buildSandtableTerritoryPickerTexts(
    rows: readonly SandtableTerritoryRow[],
    nameOf: (territoryId: string) => string,
    stage: OfficerUnlocks['sandtableStage'],
    placedCount: number,
): Record<string, string> {
    const limit = stage ? SANDTABLE_MARKER_LIMIT[stage] : 0;
    const texts: Record<string, string> = {
        'DialogCard/HeaderBar/TitleLabel': '天下沙盤・領地',
        'DialogCard/FooterBar/HintLabel': stage
            ? `階段 ${stage}｜標記 ${placedCount}/${limit}，每領地最多一個`
            : '官職尚未達沙盤階段',
    };
    for (let i = 0; i < SANDTABLE_PICKER_ROWS; i += 1) {
        const row = rows[i];
        const base = `DialogCard/ScrollView/ScrollContent/Row${i}`;
        texts[`${base}/NameLabel`] = row ? nameOf(row.territoryId) : '—';
        texts[`${base}/StateLabel`] = row ? stateText(row.state) : '—';
    }
    return texts;
}

function stateText(state: SandtableTerritoryRowState): string {
    if (state === 'placed') return '已放置';
    if (state === 'available') return '可放置';
    return '—';
}
