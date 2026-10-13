import { assert, TestSuite } from './TestRunner';
import { createInitialGameTimeState } from '../assets/scripts/core/systems/GameClock';
import {
    createPlayerSaveSnapshot,
    validatePlayerSaveSnapshot,
} from '../assets/scripts/core/services/PlayerSaveService';
import { MercenarySaveBundle } from '../assets/scripts/core/systems/MercenarySaveModel';

const BUNDLE: MercenarySaveBundle = {
    mercenaries: [{ uid: 'merc-1', daysLeft: 3, bond: 30, status: 'Trial' }],
    upkeep: [{ uid: 'merc-1', status: 'Frozen', unpaidDays: 1, frozenDaysLeft: 1 }],
    cooldowns: [{ uid: 'merc-2', availableOnDay: 45 }],
};

export function createMercenarySaveWireSuite(): TestSuite {
    const suite = new TestSuite('MercenarySaveWire (MERC-01 傭兵存檔接線)');

    suite.test('存檔快照帶入傭兵包，讀回後內容一致', () => {
        const snapshot = createPlayerSaveSnapshot(
            createInitialGameTimeState(), [], new Date(0), undefined, [], null, 1, undefined, 0, undefined, 0, [], {}, {}, {}, BUNDLE,
        );
        const restored = validatePlayerSaveSnapshot(JSON.parse(JSON.stringify(snapshot)));
        assert.equals(JSON.stringify(BUNDLE), JSON.stringify(restored.mercenaries));
    });

    suite.test('未傳入傭兵包時快照不含 mercenaries 欄位（舊行為不變）', () => {
        const snapshot = createPlayerSaveSnapshot(createInitialGameTimeState(), [], new Date(0));
        assert.isTrue(snapshot.mercenaries === undefined);
    });

    suite.test('舊檔沒有 mercenaries 欄位時讀回為 undefined，不補假資料', () => {
        const snapshot = createPlayerSaveSnapshot(createInitialGameTimeState(), [], new Date(0));
        const restored = validatePlayerSaveSnapshot(JSON.parse(JSON.stringify(snapshot)));
        assert.isTrue(restored.mercenaries === undefined);
    });

    suite.test('讀檔時壞掉的傭兵項目被丟棄，其餘保留', () => {
        const raw = JSON.parse(JSON.stringify(createPlayerSaveSnapshot(createInitialGameTimeState(), [], new Date(0), undefined, [], null, 1, undefined, 0, undefined, 0, [], {}, {}, {}, BUNDLE)));
        raw.mercenaries.mercenaries.push({ uid: 'bad', daysLeft: 99, bond: 0, status: 'Trial' });
        const restored = validatePlayerSaveSnapshot(raw);
        assert.equals(1, restored.mercenaries!.mercenaries.length);
    });

    return suite;
}
