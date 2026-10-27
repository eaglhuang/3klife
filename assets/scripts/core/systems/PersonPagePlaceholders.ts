// @spec-source → 武將人物介面規格書 §10 Data Read Model（顯示頁欄）、§12 NO_DATA；WBS GDUI-13；PROG-2-1025
/**
 * PersonPagePlaceholders — 人物頁各分頁的空欄位規劃（純邏輯，不依賴 cc）。
 *
 * - 依 §10「顯示頁」欄，每個 readModel 欄位對應到一個或多個分頁。
 * - listEmptyFieldsByTab 回傳每頁中狀態為 NO_DATA 的欄位，讓畫面知道哪裡要顯示空狀態佔位。
 * - defaultTab 屬於外層 chrome，不列入分頁。
 *
 * Unity 對照：像每個 Tab Panel 掛一份「需要的資料欄位清單」，載入後檢查哪些欄位是空的，空的就顯示 Empty State。
 */
import type { GeneralReadModel, PersonPageTab } from './GeneralReadModel';
import { PERSON_PAGE_TABS } from './GeneralReadModel';

export type PersonPageField = Exclude<keyof GeneralReadModel, 'defaultTab'>;

export const PERSON_PAGE_FIELD_TABS: Readonly<Record<PersonPageField, readonly PersonPageTab[]>> = {
    storyStripCells: ['Bloodline'],
    storyDockState: ['Bloodline'],
    ancestors: ['Bloodline'],
    bloodlineBeast: ['Bloodline'],
    bloodlineUltimate: ['Bloodline'],
    equippedSpiritUid: ['Bloodline'],
    generalFame: ['Overview', 'Bloodline'],
    generalRank: ['Overview'],
    commandCapacity: ['Overview'],
    talentStats: ['Stats'],
    prowessStats: ['Stats'],
    learnedTactics: ['Tactics'],
    equipmentLoadout: ['Equip'],
    equippedTallyUid: ['Aptitude'],
    aptitudes: ['Aptitude'],
};

export type EmptyFieldsByTab = Record<PersonPageTab, PersonPageField[]>;

/** 每個分頁中狀態為 NO_DATA 的欄位；全部有資料時每頁為空陣列。 */
export function listEmptyFieldsByTab(model: GeneralReadModel): EmptyFieldsByTab {
    const result = Object.fromEntries(PERSON_PAGE_TABS.map((tab) => [tab, [] as PersonPageField[]])) as EmptyFieldsByTab;
    for (const field of Object.keys(PERSON_PAGE_FIELD_TABS) as PersonPageField[]) {
        if (model[field].state !== 'NO_DATA') continue;
        for (const tab of PERSON_PAGE_FIELD_TABS[field]) result[tab].push(field);
    }
    return result;
}
