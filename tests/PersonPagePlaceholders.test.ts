/**
 * PersonPagePlaceholders.test.ts — 人物頁分頁空欄位規劃（GDUI-13，PROG-2-1025）
 *
 * 鎖住：對照表涵蓋 §10 除 defaultTab 外的 15 個欄位；General_Fame 同時屬於將與命；
 * 空武將時每頁列出正確欄位；完整武將時每頁為空。
 */
import { TestSuite, assert } from './TestRunner';
import { mapGeneralReadModel, PERSON_PAGE_TABS, type GeneralReadModel } from '../assets/scripts/core/systems/GeneralReadModel';
import { PERSON_PAGE_FIELD_TABS, listEmptyFieldsByTab } from '../assets/scripts/core/systems/PersonPagePlaceholders';

const FULL_RAW: Record<string, unknown> = {
    Profile_Presentation: { Default_Tab: 'Bloodline', Story_Strip_Cells: ['a', 'b', 'c', 'd', 'e'], Bloodline_StoryDock_State: 'HALF' },
    Ancestors_JSON: { root: 'x' },
    Bloodline_Beast: { id: 'b' },
    Bloodline_Ultimate: { id: 'u' },
    Equipped_Spirit_UID: 'spirit',
    General_Fame: 1,
    General_Rank: 2,
    Command_Capacity: 3,
    Talent_Stats: [1],
    Prowess_Stats: [1],
    Learned_Tactics: [1],
    Equipment_Loadout: [1],
    Equipped_Tally_UID: 'tally',
    Aptitudes: [1],
};

export function createPersonPagePlaceholdersSuite(): TestSuite {
    const suite = new TestSuite('PersonPagePlaceholders (人物頁分頁空欄位規劃 GDUI-13)');

    suite.test('對照表涵蓋 §10 除 defaultTab 外的 15 個欄位', () => {
        const fields = Object.keys(PERSON_PAGE_FIELD_TABS);
        assert.equals(15, fields.length);
        assert.isFalse(fields.includes('defaultTab'));
        for (const tabs of Object.values(PERSON_PAGE_FIELD_TABS)) {
            assert.isTrue(tabs.length > 0);
        }
    });

    suite.test('General_Fame 同時屬於將（Overview）與命（Bloodline）', () => {
        assert.equals('Overview,Bloodline', PERSON_PAGE_FIELD_TABS.generalFame.join(','));
    });

    suite.test('空武將：每頁列出的欄位正確', () => {
        const empty = listEmptyFieldsByTab(mapGeneralReadModel({}));
        assert.equals('storyStripCells,storyDockState,ancestors,bloodlineBeast,bloodlineUltimate,equippedSpiritUid,generalFame', empty.Bloodline.join(','));
        assert.equals('generalFame,generalRank,commandCapacity', empty.Overview.join(','));
        assert.equals('talentStats,prowessStats', empty.Stats.join(','));
        assert.equals('learnedTactics', empty.Tactics.join(','));
        assert.equals('equipmentLoadout', empty.Equip.join(','));
        assert.equals('equippedTallyUid,aptitudes', empty.Aptitude.join(','));
    });

    suite.test('完整武將：每頁都沒有空欄位', () => {
        const empty = listEmptyFieldsByTab(mapGeneralReadModel(FULL_RAW));
        for (const tab of PERSON_PAGE_TABS) {
            assert.equals(0, empty[tab].length, `${tab} 應沒有空欄位`);
        }
    });

    suite.test('只缺 General_Rank 時，只有 Overview 出現空欄位', () => {
        const raw = { ...FULL_RAW, General_Rank: undefined };
        const empty = listEmptyFieldsByTab(mapGeneralReadModel(raw));
        assert.equals('generalRank', empty.Overview.join(','));
        assert.equals(0, empty.Bloodline.length);
    });

    suite.test('規劃結果只讀 readModel，不改變傳入的模型', () => {
        const model: GeneralReadModel = mapGeneralReadModel({});
        const before = JSON.stringify(model);
        listEmptyFieldsByTab(model);
        assert.equals(before, JSON.stringify(model));
    });

    return suite;
}
