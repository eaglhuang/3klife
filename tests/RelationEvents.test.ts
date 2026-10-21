/**
 * RelationEvents.test.ts — 關係組合場景事件（WBS KIN-08 / PROG-2-1068）headless 測試
 *
 * Unity 對照：EditMode Test 用假資料表驗證規則，不載入場景。
 */
import { assert, TestSuite } from './TestRunner';
import { HistoricalPairTable } from '../assets/scripts/core/systems/HistoricalPairs';
import {
    detectRelationEvents,
    RelationEventLedger,
    relationPairKey,
} from '../assets/scripts/core/systems/RelationEvents';

function tableOf(): HistoricalPairTable {
    const base = { epBonus: 0, extraEffects: {} };
    const result = HistoricalPairTable.load({
        relations: [
            { ...base, relationId: 'T_COUPLE', templateA: 'zhou-yu', templateB: 'xiao-qiao', type: 'COUPLE', loreKey: 'L1' },
            { ...base, relationId: 'T_SWORN', templateA: 'liu-bei', templateB: 'guan-yu', type: 'SWORN', loreKey: 'L2' },
            { ...base, relationId: 'T_RIVAL', templateA: 'zhuge-liang', templateB: 'sima-yi', type: 'RIVAL', loreKey: 'L3' },
        ],
    });
    assert.equals(3, result.loaded);
    return result.table;
}

export function createRelationEventsSuite(): TestSuite {
    const suite = new TestSuite('RelationEvents (KIN-08 關係事件觸發)');

    suite.test('戰場：夫妻配對觸發名將契合，順序無關', () => {
        const hits = detectRelationEvents(tableOf(), { scene: 'battle', templateIds: ['xiao-qiao', 'zhou-yu', 'cao-cao'] });
        assert.equals(1, hits.length);
        assert.equals('famous-match', hits[0].eventId);
        assert.equals('LORE_REL_EVENT_FAMOUS_MATCH', hits[0].loreKey);
        assert.equals('xiao-qiao|zhou-yu', hits[0].pairKey);
    });

    suite.test('戰場：義兄弟同場觸發義兄弟合攻事件；治理場景不觸發', () => {
        const battle = detectRelationEvents(tableOf(), { scene: 'battle', templateIds: ['liu-bei', 'guan-yu'] });
        assert.equals('sworn-combo', battle[0].eventId);
        const governance = detectRelationEvents(tableOf(), { scene: 'governance', templateIds: ['liu-bei', 'guan-yu'] });
        assert.equals(0, governance.length);
    });

    suite.test('治理：宿敵配種觸發宿敵事件；戰場不觸發', () => {
        const governance = detectRelationEvents(tableOf(), { scene: 'governance', templateIds: ['sima-yi', 'zhuge-liang'] });
        assert.equals(1, governance.length);
        assert.equals('rival-breed', governance[0].eventId);
        assert.equals(0, detectRelationEvents(tableOf(), { scene: 'battle', templateIds: ['sima-yi', 'zhuge-liang'] }).length);
    });

    suite.test('沒有史實關係或只有一人在場：不觸發', () => {
        assert.equals(0, detectRelationEvents(tableOf(), { scene: 'battle', templateIds: ['cao-cao', 'lu-bu'] }).length);
        assert.equals(0, detectRelationEvents(tableOf(), { scene: 'battle', templateIds: ['liu-bei'] }).length);
        assert.equals(0, detectRelationEvents(tableOf(), { scene: 'battle', templateIds: [] }).length);
    });

    suite.test('同一武將重複列出只比對一次，不會自己跟自己配對', () => {
        const hits = detectRelationEvents(tableOf(), { scene: 'battle', templateIds: ['liu-bei', 'liu-bei', 'guan-yu'] });
        assert.equals(1, hits.length);
        assert.equals('guan-yu|liu-bei', hits[0].pairKey);
    });

    suite.test('配對鍵排序後與順序無關', () => {
        assert.equals(relationPairKey('a', 'b'), relationPairKey('b', 'a'));
    });

    suite.test('一次性：同一場戰役、同一對、同一事件只觸發一次', () => {
        const ledger = new RelationEventLedger();
        const hits = detectRelationEvents(tableOf(), { scene: 'battle', templateIds: ['liu-bei', 'guan-yu'] });
        assert.equals(1, ledger.takeNew('battle-1', hits).length);
        assert.equals(0, ledger.takeNew('battle-1', hits).length);
        assert.equals(1, ledger.takeNew('battle-2', hits).length);
        assert.equals(2, ledger.size());
    });

    suite.test('存檔：snapshot 後 restore 保留觸發紀錄，無效項目略過', () => {
        const ledger = new RelationEventLedger();
        const hits = detectRelationEvents(tableOf(), { scene: 'governance', templateIds: ['sima-yi', 'zhuge-liang'] });
        ledger.takeNew('season-3', hits);
        const saved = ledger.snapshot();

        const restored = new RelationEventLedger();
        restored.restore([...saved, 42, '', null]);
        assert.equals(saved.length, restored.size());
        assert.equals(0, restored.takeNew('season-3', hits).length);
        assert.equals(1, restored.takeNew('season-4', hits).length);
    });

    suite.test('存檔缺欄位或非陣列：清空不報錯', () => {
        const ledger = new RelationEventLedger();
        ledger.restore(undefined);
        assert.equals(0, ledger.size());
    });

    return suite;
}
