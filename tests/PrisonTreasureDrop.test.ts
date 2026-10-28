/**
 * PrisonTreasureDrop.test.ts — 無期徒刑傳家寶物掉落（EQP-09，PROG-2-1385）：道具定義與每季擲骰。
 *
 * 鎖住：傳家寶物有定義且屬寶物分類；每位關押俘虜各擲一次；機率邊界與空監獄。
 */
import { assert, TestSuite } from './TestRunner';
import { ITEM_TREASURE, itemDefOf } from '../assets/scripts/core/systems/ItemDef';
import { PRISON_TREASURE_DROP_RATE, rollPrisonTreasures, type PrisonEntry } from '../assets/scripts/core/systems/PrisonerOfWar';

const PRISONER: PrisonEntry = {
    targetUid: 'g1',
    targetName: '俘將',
    imprisonedSeason: 0,
    yieldPerSeason: { intel: 1, resource: 1 },
};

export function createPrisonTreasureDropSuite(): TestSuite {
    const suite = new TestSuite('PrisonTreasureDrop (無期徒刑傳家寶物 EQP-09)');

    suite.test('傳家寶物有定義，分類為寶物', () => {
        const def = itemDefOf(ITEM_TREASURE);
        assert.isTrue(def !== null);
        assert.equals('寶物', def!.category);
        assert.equals('傳家寶物', def!.name);
    });

    suite.test('每位關押俘虜各擲一次：骰值低於機率就掉一件', () => {
        const prisoners = [PRISONER, PRISONER, PRISONER];
        assert.equals(3, rollPrisonTreasures(prisoners, () => 0));
        assert.equals(0, rollPrisonTreasures(prisoners, () => 0.999));
    });

    suite.test('骰值剛好等於機率時不掉（嚴格小於）；空監獄為 0', () => {
        assert.equals(0, rollPrisonTreasures([PRISONER], () => PRISON_TREASURE_DROP_RATE));
        assert.equals(0, rollPrisonTreasures([], () => 0));
    });

    return suite;
}
