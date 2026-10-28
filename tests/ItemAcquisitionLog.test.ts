/**
 * ItemAcquisitionLog.test.ts — 道具取得來源紀錄（ITM-05，PROG-2-1383）：增量比對、上限、來源查詢、存讀檔相容。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
import type { PlayerSaveSnapshot } from '../assets/scripts/core/services/PlayerSaveService';
import {
    appendAcquisitions, diffAcquisitions, ITEM_ACQUISITION_LOG_LIMIT, normalizeAcquisitionLog, normalizeItemSource, queryAcquisitions,
    type ItemAcquisitionRecord,
} from '../assets/scripts/core/systems/ItemAcquisitionLog';
import { ITEM_JOB_CHANGE_ORDER } from '../assets/scripts/core/systems/PlayerInventory';

export function createItemAcquisitionLogSuite(): TestSuite {
    const suite = new TestSuite('ItemAcquisitionLog (道具取得來源 ITM-05)');

    suite.test('diffAcquisitions 只取增加的數量，扣除不記錄', () => {
        const records = diffAcquisitions({ a: 2, b: 5 }, { a: 5, b: 1, c: 3 }, 'DROP');
        assert.equals('a:3:DROP,c:3:DROP', records.map((r) => `${r.itemId}:${r.amount}:${r.source}`).join(','));
    });

    suite.test('來源不認識時正規化為 UNKNOWN', () => {
        assert.equals('UNKNOWN', normalizeItemSource('BOGUS'));
        assert.equals('UNKNOWN', normalizeItemSource(undefined));
        assert.equals('SHOP', normalizeItemSource('SHOP'));
    });

    suite.test('紀錄超過上限時只留最後的筆數', () => {
        const batch = Array.from({ length: ITEM_ACQUISITION_LOG_LIMIT + 5 }, (_, i): ItemAcquisitionRecord => ({ itemId: `i${i}`, amount: 1, source: 'TASK' }));
        const log = appendAcquisitions([], batch);
        assert.equals(ITEM_ACQUISITION_LOG_LIMIT, log.length);
        assert.equals(`i${ITEM_ACQUISITION_LOG_LIMIT + 4}`, log[log.length - 1].itemId);
    });

    suite.test('依道具與來源篩選，未給條件不篩', () => {
        const log: ItemAcquisitionRecord[] = [
            { itemId: 'A', amount: 1, source: 'SHOP' },
            { itemId: 'B', amount: 2, source: 'SHOP' },
            { itemId: 'A', amount: 3, source: 'DROP' },
        ];
        assert.equals(3, queryAcquisitions(log).length);
        assert.equals(2, queryAcquisitions(log, { itemId: 'A' }).length);
        assert.equals(2, queryAcquisitions(log, { source: 'SHOP' }).length);
        assert.equals(1, queryAcquisitions(log, { itemId: 'A', source: 'DROP' }).length);
    });

    suite.test('存檔正規化：濾掉壞資料，缺來源的舊紀錄視為 UNKNOWN', () => {
        const raw = [
            { itemId: 'A', amount: 2, source: 'EVENT' },
            { itemId: 'B', amount: 1 },
            { itemId: '', amount: 1, source: 'SHOP' },
            { itemId: 'C', amount: 0, source: 'SHOP' },
            { itemId: 'D', amount: 1.5, source: 'SHOP' },
            'bad',
            null,
        ];
        const log = normalizeAcquisitionLog(raw);
        assert.equals('A:2:EVENT,B:1:UNKNOWN', log.map((r) => `${r.itemId}:${r.amount}:${r.source}`).join(','));
        assert.equals(0, normalizeAcquisitionLog('x').length);
    });

    suite.test('GameSession：入庫依來源記錄；不給來源為 UNKNOWN；沒有紀錄時不寫欄位', () => {
        const session = new GameSession(1);
        assert.isTrue(new GameSession(1).createSnapshot(new Date(0)).itemAcquisitionLog === undefined);
        void session.addItem(ITEM_JOB_CHANGE_ORDER, 2, 'SHOP');
        void session.addItem(ITEM_JOB_CHANGE_ORDER, 1);
        assert.equals(2, session.queryItemAcquisitions({ source: 'SHOP' })[0].amount);
        assert.equals(1, session.queryItemAcquisitions({ source: 'UNKNOWN' })[0].amount);
        assert.equals(2, session.itemAcquisitionLog.length);
    });

    suite.test('取得紀錄跨存讀檔保留；舊檔沒有欄位時為空', () => {
        const session = new GameSession(1);
        void session.addItem(ITEM_JOB_CHANGE_ORDER, 3, 'DROP');
        const snapshot = JSON.parse(JSON.stringify(session.createSnapshot(new Date(0)))) as PlayerSaveSnapshot;
        assert.equals(`${ITEM_JOB_CHANGE_ORDER}:3:DROP`, snapshot.itemAcquisitionLog!.map((r) => `${r.itemId}:${r.amount}:${r.source}`).join(','));
        const restored = new GameSession(1);
        restored.restoreLifespanState(snapshot);
        assert.equals(1, restored.itemAcquisitionLog.length);
        assert.equals(3, restored.queryItemAcquisitions({ source: 'DROP' })[0].amount);

        const legacy = new GameSession(1);
        const { itemAcquisitionLog: _omit, ...withoutField } = snapshot;
        legacy.restoreLifespanState(withoutField as PlayerSaveSnapshot);
        assert.equals(0, legacy.itemAcquisitionLog.length);
    });

    return suite;
}
