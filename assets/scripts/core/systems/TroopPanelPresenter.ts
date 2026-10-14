// @spec-source → WBS TSK-11（戰場與治理新增軍勢欄位及人口貢獻 UI）；SortieDeploy.finishSortie、MilitaryReserve（PROG-2-0249）
/**
 * TroopPanelPresenter — 城市兵源與出征軍勢的面板列（純邏輯，不依賴 cc）
 *
 * 把 City_Troops_Current/Cap、Sortie_Troop_Pool（剩餘／上限）、Returned_Troops、Lost_Troops
 * 整理成面板要顯示的列；View 只負責擺上去。沒有出征資料（治理頁）時，只回傳城市兵源列。
 * 字串為暫定，待 P0 UI_ 字串表定案。
 *
 * 人口貢獻目前沒有對應資料欄位，本檔不輸出，留待規格定義後再補。
 */
import type { MilitaryReserve } from './MilitaryReserve';
import type { SortieSummary } from './SortieDeploy';

export interface TroopPanelRow {
    key: 'city' | 'pool' | 'returned' | 'lost';
    label: string;
    value: string;
}

/** 城市兵源與出征軍勢列；沒有出征結果時只回傳城市兵源 */
export function buildTroopPanelRows(military: Pick<MilitaryReserve, 'cityTroops' | 'cityTroopsCap'>, sortie: SortieSummary | null = null): TroopPanelRow[] {
    const rows: TroopPanelRow[] = [
        { key: 'city', label: '城市兵源', value: `${military.cityTroops} / ${military.cityTroopsCap}` },
    ];
    if (!sortie) return rows;
    rows.push(
        { key: 'pool', label: '出征軍勢', value: `${sortie.poolRemaining} / ${sortie.poolMax}` },
        { key: 'returned', label: '返還兵力', value: `${sortie.returnedTroops}` },
        { key: 'lost', label: '戰損兵力', value: `${sortie.lostTroops}` },
    );
    return rows;
}
