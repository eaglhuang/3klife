/**
 * RelationEventsBreeding.test.ts — 結緣時治理場景的宿敵配種事件（KIN-08 / PROG-2-1071）headless 測試
 *
 * Unity 對照：EditMode Test。配種流程本身由 BreedingService 處理，這裡只驗證事件的判定與一次性。
 */
import { assert, TestSuite } from './TestRunner';
import { HistoricalPairTable } from '../assets/scripts/core/systems/HistoricalPairs';
import { relationEventsForBreeding, RelationEventLedger } from '../assets/scripts/core/systems/RelationEvents';

function tableOf(): HistoricalPairTable {
    const base = { epBonus: 0, extraEffects: {} };
    return HistoricalPairTable.load({
        relations: [
            { ...base, relationId: 'T_RIVAL', templateA: 'zhuge-liang', templateB: 'sima-yi', type: 'RIVAL', loreKey: 'L3' },
            { ...base, relationId: 'T_COUPLE', templateA: 'zhou-yu', templateB: 'xiao-qiao', type: 'COUPLE', loreKey: 'L1' },
        ],
    }).table;
}

export function createRelationEventsBreedingSuite(): TestSuite {
    const suite = new TestSuite('RelationEventsBreeding (結緣宿敵配種事件 KIN-08)');

    suite.test('宿敵配種：同季第一次結緣觸發，同季第二次不再觸發', () => {
        const ledger = new RelationEventLedger();
        const first = relationEventsForBreeding(tableOf(), ledger, 'season-3', 'sima-yi', 'zhuge-liang');
        assert.equals(1, first.length);
        assert.equals('rival-breed', first[0].eventId);
        assert.equals(0, relationEventsForBreeding(tableOf(), ledger, 'season-3', 'zhuge-liang', 'sima-yi').length);
    });

    suite.test('隔季再結緣同一對宿敵，事件可再次觸發', () => {
        const ledger = new RelationEventLedger();
        relationEventsForBreeding(tableOf(), ledger, 'season-3', 'zhuge-liang', 'sima-yi');
        assert.equals(1, relationEventsForBreeding(tableOf(), ledger, 'season-4', 'zhuge-liang', 'sima-yi').length);
    });

    suite.test('夫妻配對不屬於治理事件；沒有配對表時不觸發', () => {
        const ledger = new RelationEventLedger();
        assert.equals(0, relationEventsForBreeding(tableOf(), ledger, 'season-3', 'zhou-yu', 'xiao-qiao').length);
        assert.equals(0, relationEventsForBreeding(null, ledger, 'season-3', 'zhuge-liang', 'sima-yi').length);
    });

    return suite;
}
