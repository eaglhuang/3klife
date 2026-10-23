/**
 * GeneralReadModel.test.ts — 人物頁 Data Read Model 映射層（GDUI-13，PROG-2-1022）
 *
 * 鎖住：§10 的 16 個欄位都有 mapper；合法值為 VALUE、缺漏或不合法為 NO_DATA；
 * 屬性揭露四階與保守退回 HIDDEN；單一欄位壞掉不影響其他欄位。
 *
 * Unity 對照：像 ViewModel 單元測試：餵一份髒資料進去，每個 UI 欄位獨立判斷要顯示值還是空狀態。
 */
import { TestSuite, assert } from './TestRunner';
import {
    mapDefaultTab,
    mapFiniteNumber,
    mapGeneralReadModel,
    mapNonEmptyList,
    mapOptionalRecord,
    mapOptionalString,
    mapStatDisclosure,
    mapStoryDockState,
    mapStoryStripCells,
} from '../assets/scripts/core/systems/GeneralReadModel';

const FIVE_CELLS = ['a', 'b', 'c', 'd', 'e'];

function fullRaw(): Record<string, unknown> {
    return {
        Profile_Presentation: { Default_Tab: 'Bloodline', Story_Strip_Cells: FIVE_CELLS, Bloodline_StoryDock_State: 'HALF' },
        Ancestors_JSON: { root: 'liu-bei' },
        Bloodline_Beast: { id: 'beast-1' },
        Bloodline_Ultimate: { id: 'ult-1' },
        Equipped_Spirit_UID: 'spirit-1',
        General_Fame: 120,
        General_Rank: 3,
        Command_Capacity: 800,
        Talent_Stats: [{ key: 'str' }],
        Prowess_Stats: [{ key: 'int' }],
        Learned_Tactics: ['tactic-a'],
        Equipment_Loadout: ['sword'],
        Equipped_Tally_UID: 'tally-1',
        Aptitudes: ['cavalry'],
    };
}

export function createGeneralReadModelSuite(): TestSuite {
    const suite = new TestSuite('GeneralReadModel (人物頁讀取模型 GDUI-13)');

    suite.test('完整資料：16 個欄位都是 VALUE', () => {
        const model = mapGeneralReadModel(fullRaw());
        for (const [name, field] of Object.entries(model)) {
            assert.equals('VALUE', field.state, `${name} 應有值`);
        }
        assert.equals(16, Object.keys(model).length);
    });

    suite.test('空物件：16 個欄位都是 NO_DATA，不填假資料', () => {
        const model = mapGeneralReadModel({});
        for (const [name, field] of Object.entries(model)) {
            assert.equals('NO_DATA', field.state, `${name} 應為空狀態`);
        }
    });

    suite.test('Default_Tab：只允許六個分頁，其他字串為 NO_DATA', () => {
        assert.equals('VALUE', mapDefaultTab({ Profile_Presentation: { Default_Tab: 'Equip' } }).state);
        assert.equals('NO_DATA', mapDefaultTab({ Profile_Presentation: { Default_Tab: 'Inventory' } }).state);
        assert.equals('NO_DATA', mapDefaultTab({ Profile_Presentation: { Default_Tab: 42 } }).state);
    });

    suite.test('Story_Strip_Cells：5~6 格才有值，4 格或 7 格為 NO_DATA', () => {
        assert.equals('VALUE', mapStoryStripCells({ Profile_Presentation: { Story_Strip_Cells: FIVE_CELLS } }).state);
        assert.equals('VALUE', mapStoryStripCells({ Profile_Presentation: { Story_Strip_Cells: [...FIVE_CELLS, 'f'] } }).state);
        assert.equals('NO_DATA', mapStoryStripCells({ Profile_Presentation: { Story_Strip_Cells: ['a', 'b', 'c', 'd'] } }).state);
        assert.equals('NO_DATA', mapStoryStripCells({ Profile_Presentation: { Story_Strip_Cells: [...FIVE_CELLS, 'f', 'g'] } }).state);
        assert.equals('NO_DATA', mapStoryStripCells({ Profile_Presentation: { Story_Strip_Cells: [1, 2, 3, 4, 5] } }).state);
    });

    suite.test('Bloodline_StoryDock_State：三態以外為 NO_DATA', () => {
        assert.equals('VALUE', mapStoryDockState({ Profile_Presentation: { Bloodline_StoryDock_State: 'COLLAPSED' } }).state);
        assert.equals('NO_DATA', mapStoryDockState({ Profile_Presentation: { Bloodline_StoryDock_State: 'OPEN' } }).state);
    });

    suite.test('數值欄位：非有限數為 NO_DATA，0 仍是有效值', () => {
        assert.equals('VALUE', mapFiniteNumber({ General_Fame: 0 }, 'General_Fame').state);
        assert.equals('NO_DATA', mapFiniteNumber({ General_Fame: NaN }, 'General_Fame').state);
        assert.equals('NO_DATA', mapFiniteNumber({ General_Fame: '120' }, 'General_Fame').state);
    });

    suite.test('物件與字串欄位：空物件、空字串、空陣列都視為沒有資料', () => {
        assert.equals('NO_DATA', mapOptionalRecord({ Bloodline_Beast: {} }, 'Bloodline_Beast').state);
        assert.equals('NO_DATA', mapOptionalString({ Equipped_Spirit_UID: '' }, 'Equipped_Spirit_UID').state);
        assert.equals('NO_DATA', mapNonEmptyList({ Aptitudes: [] }, 'Aptitudes').state);
        assert.equals('VALUE', mapNonEmptyList({ Aptitudes: ['cavalry'] }, 'Aptitudes').state);
    });

    suite.test('屬性揭露四階：沿用 StatRevelation，數值缺漏為 NO_DATA', () => {
        const hidden = mapStatDisclosure(88, 'HIDDEN');
        assert.equals('REVEALED', hidden.state);
        if (hidden.state === 'REVEALED') assert.equals('HIDDEN', hidden.revealed.level);

        const tendency = mapStatDisclosure(88, 'TENDENCY');
        if (tendency.state === 'REVEALED' && tendency.revealed.level === 'TENDENCY') assert.equals('高', tendency.revealed.tendency);
        else throw new Error('TENDENCY 應回傳傾向');

        const range = mapStatDisclosure(88, 'RANGE');
        if (range.state === 'REVEALED' && range.revealed.level === 'RANGE') {
            assert.equals(80, range.revealed.low);
            assert.equals(89, range.revealed.high);
        } else throw new Error('RANGE 應回傳區間');

        const exact = mapStatDisclosure(88, 'EXACT');
        if (exact.state === 'REVEALED' && exact.revealed.level === 'EXACT') assert.equals(88, exact.revealed.value);
        else throw new Error('EXACT 應回傳精確值');

        assert.equals('NO_DATA', mapStatDisclosure(undefined, 'EXACT').state);
    });

    suite.test('揭露層級不合法時退回 HIDDEN，不洩漏精確值', () => {
        const fallback = mapStatDisclosure(88, 'SECRET');
        if (fallback.state === 'REVEALED') assert.equals('HIDDEN', fallback.revealed.level);
        else throw new Error('非法層級應回傳 HIDDEN');
    });

    suite.test('單一欄位壞掉不影響其他欄位', () => {
        const raw = { ...fullRaw(), General_Fame: 'bad', Profile_Presentation: { Default_Tab: 'Stats', Story_Strip_Cells: ['x'] } };
        const model = mapGeneralReadModel(raw);
        assert.equals('NO_DATA', model.generalFame.state);
        assert.equals('NO_DATA', model.storyStripCells.state);
        assert.equals('VALUE', model.defaultTab.state);
        assert.equals('VALUE', model.generalRank.state);
    });

    suite.test('mapDefaultTab 不接受 Profile_Presentation 缺漏', () => {
        assert.equals('NO_DATA', mapDefaultTab({}).state);
    });

    return suite;
}
