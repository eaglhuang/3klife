/**
 * SpiritSlotFlow.test.ts — 命槽卸下與設為主卡的純邏輯（GDUI-05，PROG-2-1280）headless 測試
 */
import { assert, TestSuite } from './TestRunner';
import type { InventoryRecord } from '../assets/scripts/core/systems/InventoryProjection';
import {
    insertSpiritCard,
    replaceSpiritCard,
    setPrimarySpiritCard,
    unequipSpiritCard,
    spiritPickerPage,
    spiritPickerRows,
    unequippedSpiritCards,
} from '../assets/scripts/core/systems/SpiritSlotFlow';
import { SPIRIT_SLOT_ID } from '../assets/scripts/core/systems/SpiritSlotState';

function spiritCard(id: string, overrides: Partial<InventoryRecord> = {}): InventoryRecord {
    return {
        Inventory_ID: id,
        Item_Type: 'SPIRIT_CARD',
        Slot_Type: 'SPIRIT',
        Bound_General_UID: null,
        Quantity: 1,
        Quality: 'N',
        Source_Type: 'TEST',
        Display_Bucket: 'SPIRIT',
        Is_Displayed: true,
        Attributes: {},
        equippedBy: null,
        slotId: null,
        ...overrides,
    };
}

export function createSpiritSlotFlowSuite(): TestSuite {
    const suite = new TestSuite('SpiritSlotFlow (命槽卸下與設主卡 GDUI-05 PROG-2-1280)');

    suite.test('卸下命槽英靈卡：列保留，裝配與主卡欄位清空', () => {
        const records = [spiritCard('S-1', { equippedBy: 'G-1', slotId: SPIRIT_SLOT_ID, isPrimary: true })];
        const result = unequipSpiritCard(records, 'G-1', false);
        assert.isTrue(result.ok);
        if (!result.ok) return;
        assert.equals(1, result.records.length);
        assert.equals(null, result.records[0].equippedBy);
        assert.equals(null, result.records[0].slotId);
        assert.equals(null, result.records[0].isPrimary);
    });

    suite.test('命槽沒有英靈卡時卸下回 NOT_FOUND', () => {
        const result = unequipSpiritCard([], 'G-1', false);
        assert.isFalse(result.ok);
        if (result.ok) return;
        assert.equals('NOT_FOUND', result.reason);
    });

    suite.test('戰鬥鎖定時卸下與設主卡都回 BATTLE_LOCKED，records 不變', () => {
        const records = [spiritCard('S-1', { equippedBy: 'G-1', slotId: SPIRIT_SLOT_ID })];
        const unequip = unequipSpiritCard(records, 'G-1', true);
        const primary = setPrimarySpiritCard(records, 'G-1', true);
        assert.isFalse(unequip.ok);
        assert.isFalse(primary.ok);
        if (!unequip.ok) assert.equals('BATTLE_LOCKED', unequip.reason);
        if (!primary.ok) assert.equals('BATTLE_LOCKED', primary.reason);
        assert.equals(SPIRIT_SLOT_ID, records[0].slotId);
    });

    suite.test('設為主卡：該卡 isPrimary 為 true', () => {
        const records = [spiritCard('S-1', { equippedBy: 'G-1', slotId: SPIRIT_SLOT_ID })];
        const result = setPrimarySpiritCard(records, 'G-1', false);
        assert.isTrue(result.ok);
        if (!result.ok) return;
        assert.isTrue(result.records[0].isPrimary === true);
    });

    suite.test('已是主卡再設一次回 ALREADY_PRIMARY', () => {
        const records = [spiritCard('S-1', { equippedBy: 'G-1', slotId: SPIRIT_SLOT_ID, isPrimary: true })];
        const result = setPrimarySpiritCard(records, 'G-1', false);
        assert.isFalse(result.ok);
        if (result.ok) return;
        assert.equals('ALREADY_PRIMARY', result.reason);
    });

    suite.test('設主卡不影響其他武將的英靈卡', () => {
        const records = [
            spiritCard('S-1', { equippedBy: 'G-1', slotId: SPIRIT_SLOT_ID }),
            spiritCard('S-2', { equippedBy: 'G-2', slotId: SPIRIT_SLOT_ID, isPrimary: true }),
        ];
        const result = setPrimarySpiritCard(records, 'G-1', false);
        assert.isTrue(result.ok);
        if (!result.ok) return;
        assert.isTrue(result.records[1].isPrimary === true);
    });

    suite.test('選卡清單只列未裝在任何武將身上的英靈卡', () => {
        const records = [
            spiritCard('S-1'),
            spiritCard('S-2', { equippedBy: 'G-1', slotId: SPIRIT_SLOT_ID }),
            spiritCard('O-1', { Item_Type: 'OTHER' }),
        ];
        const list = unequippedSpiritCards(records);
        assert.equals(1, list.length);
        assert.equals('S-1', list[0].Inventory_ID);
    });

    suite.test('選卡面板列表：卡號與血脈分數，只列未裝配的英靈卡', () => {
        const records = [
            spiritCard('S-1', { Attributes: { LineageScore: 42 } }),
            spiritCard('S-2', { equippedBy: 'G-1', slotId: SPIRIT_SLOT_ID, Attributes: { LineageScore: 7 } }),
            spiritCard('S-3'),
        ];
        const rows = spiritPickerRows(records);
        assert.equals('S-1,S-3', rows.map((row) => row.spiritId).join(','));
        assert.equals('S-1（血脈 42）', rows[0].label);
        assert.equals('S-3', rows[1].label);
    });

    suite.test('插入：空命槽放入未裝配的卡，新卡不是主卡', () => {
        const records = [spiritCard('S-1')];
        const result = insertSpiritCard(records, 'G-1', 'S-1', false);
        assert.isTrue(result.ok);
        if (!result.ok) return;
        assert.equals('G-1', result.records[0].equippedBy);
        assert.equals(SPIRIT_SLOT_ID, result.records[0].slotId);
        assert.isFalse(result.records[0].isPrimary === true);
        assert.equals(null, records[0].equippedBy);
    });

    suite.test('插入：命槽已有卡回 SLOT_OCCUPIED', () => {
        const records = [
            spiritCard('S-1', { equippedBy: 'G-1', slotId: SPIRIT_SLOT_ID }),
            spiritCard('S-2'),
        ];
        const result = insertSpiritCard(records, 'G-1', 'S-2', false);
        assert.isFalse(result.ok);
        if (result.ok) return;
        assert.equals('SLOT_OCCUPIED', result.reason);
    });

    suite.test('插入：卡已在別的武將命槽上回 OWNED_ELSEWHERE', () => {
        const records = [spiritCard('S-1', { equippedBy: 'G-2', slotId: SPIRIT_SLOT_ID })];
        const result = insertSpiritCard(records, 'G-1', 'S-1', false);
        assert.isFalse(result.ok);
        if (result.ok) return;
        assert.equals('OWNED_ELSEWHERE', result.reason);
    });

    suite.test('插入：指定的不是英靈卡列回 NOT_SPIRIT_CARD', () => {
        const records = [spiritCard('O-1', { Item_Type: 'OTHER' })];
        const missing = insertSpiritCard(records, 'G-1', 'NOPE', false);
        const gear = insertSpiritCard(records, 'G-1', 'O-1', false);
        assert.isFalse(missing.ok);
        assert.isFalse(gear.ok);
        if (!missing.ok) assert.equals('NOT_SPIRIT_CARD', missing.reason);
        if (!gear.ok) assert.equals('NOT_SPIRIT_CARD', gear.reason);
    });

    suite.test('插入：戰鬥鎖定回 BATTLE_LOCKED', () => {
        const result = insertSpiritCard([spiritCard('S-1')], 'G-1', 'S-1', true);
        assert.isFalse(result.ok);
        if (result.ok) return;
        assert.equals('BATTLE_LOCKED', result.reason);
    });

    suite.test('替換：舊卡卸回倉庫、新卡裝入命槽，同一筆結果寫回', () => {
        const records = [
            spiritCard('S-1', { equippedBy: 'G-1', slotId: SPIRIT_SLOT_ID, isPrimary: true }),
            spiritCard('S-2'),
        ];
        const result = replaceSpiritCard(records, 'G-1', 'S-2', false);
        assert.isTrue(result.ok);
        if (!result.ok) return;
        assert.equals(null, result.records[0].equippedBy);
        assert.equals(null, result.records[0].isPrimary);
        assert.equals('G-1', result.records[1].equippedBy);
        assert.equals(SPIRIT_SLOT_ID, result.records[1].slotId);
    });

    suite.test('替換：命槽是空的回 NOT_FOUND，應改用插入', () => {
        const result = replaceSpiritCard([spiritCard('S-1')], 'G-1', 'S-1', false);
        assert.isFalse(result.ok);
        if (result.ok) return;
        assert.equals('NOT_FOUND', result.reason);
    });

    suite.test('替換：選到命槽現有的同一張卡回 SAME_CARD', () => {
        const records = [spiritCard('S-1', { equippedBy: 'G-1', slotId: SPIRIT_SLOT_ID })];
        const result = replaceSpiritCard(records, 'G-1', 'S-1', false);
        assert.isFalse(result.ok);
        if (result.ok) return;
        assert.equals('SAME_CARD', result.reason);
    });

    suite.test('替換：新卡在別的武將命槽上回 OWNED_ELSEWHERE，舊卡不動', () => {
        const records = [
            spiritCard('S-1', { equippedBy: 'G-1', slotId: SPIRIT_SLOT_ID }),
            spiritCard('S-2', { equippedBy: 'G-2', slotId: SPIRIT_SLOT_ID }),
        ];
        const result = replaceSpiritCard(records, 'G-1', 'S-2', false);
        assert.isFalse(result.ok);
        if (result.ok) return;
        assert.equals('OWNED_ELSEWHERE', result.reason);
        assert.equals('G-1', records[0].equippedBy);
    });

    suite.test('替換：戰鬥鎖定回 BATTLE_LOCKED', () => {
        const records = [
            spiritCard('S-1', { equippedBy: 'G-1', slotId: SPIRIT_SLOT_ID }),
            spiritCard('S-2'),
        ];
        const result = replaceSpiritCard(records, 'G-1', 'S-2', true);
        assert.isFalse(result.ok);
        if (result.ok) return;
        assert.equals('BATTLE_LOCKED', result.reason);
    });

    suite.test('選卡分頁：每頁 6 列，最後一頁只剩餘下的列', () => {
        const rows = Array.from({ length: 13 }, (_, i) => ({ spiritId: `sp-${i}`, label: `sp-${i}` }));
        const first = spiritPickerPage(rows, 0);
        assert.equals(3, first.pageCount);
        assert.equals(6, first.rows.length);
        assert.equals('sp-0', first.rows[0].spiritId);
        const last = spiritPickerPage(rows, 2);
        assert.equals(1, last.rows.length);
        assert.equals('sp-12', last.rows[0].spiritId);
    });

    suite.test('選卡分頁：頁碼超出範圍時夾回合法範圍', () => {
        const rows = Array.from({ length: 7 }, (_, i) => ({ spiritId: `sp-${i}`, label: `sp-${i}` }));
        assert.equals(1, spiritPickerPage(rows, 9).page);
        assert.equals(0, spiritPickerPage(rows, -1).page);
    });

    suite.test('選卡分頁：沒有列時仍是一頁、列表為空', () => {
        const empty = spiritPickerPage([], 3);
        assert.equals(1, empty.pageCount);
        assert.equals(0, empty.page);
        assert.equals(0, empty.rows.length);
    });

    return suite;
}
