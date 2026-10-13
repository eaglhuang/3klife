import { assert, TestSuite } from './TestRunner';
import {
    createEmptyMercenaryBundle,
    MercenarySaveBundle,
    normalizeMercenaryBundle,
    serializeMercenaryBundle,
} from '../assets/scripts/core/systems/MercenarySaveModel';

const SAMPLE: MercenarySaveBundle = {
    mercenaries: [
        { uid: 'merc-1', daysLeft: 4, bond: 20, status: 'Trial' },
        { uid: 'merc-2', daysLeft: 0, bond: 60, status: 'Bonded' },
    ],
    upkeep: [{ uid: 'merc-1', status: 'Frozen', unpaidDays: 2, frozenDaysLeft: 1 }],
    cooldowns: [{ uid: 'merc-3', availableOnDay: 40 }],
};

export function createMercenarySaveModelSuite(): TestSuite {
    const suite = new TestSuite('MercenarySaveModel (MERC-01 傭兵存檔往返)');

    suite.test('往返序列化：serialize 後 normalize 內容不變', () => {
        const restored = normalizeMercenaryBundle(JSON.parse(JSON.stringify(serializeMercenaryBundle(SAMPLE))));
        assert.equals(JSON.stringify(SAMPLE), JSON.stringify(restored));
    });

    suite.test('serialize 輸出副本，修改副本不影響來源', () => {
        const copy = serializeMercenaryBundle(SAMPLE);
        copy.mercenaries[0].daysLeft = 0;
        assert.equals(4, SAMPLE.mercenaries[0].daysLeft);
    });

    suite.test('非物件輸入回傳空包', () => {
        const empty = createEmptyMercenaryBundle();
        assert.equals(JSON.stringify(empty), JSON.stringify(normalizeMercenaryBundle(null)));
        assert.equals(JSON.stringify(empty), JSON.stringify(normalizeMercenaryBundle('bad')));
    });

    suite.test('未知狀態與超出範圍的傭兵被丟棄，其餘保留', () => {
        const restored = normalizeMercenaryBundle({
            mercenaries: [
                { uid: 'ok', daysLeft: 6, bond: 0, status: 'Trial' },
                { uid: 'bad-status', daysLeft: 1, bond: 0, status: 'Retired' },
                { uid: 'bad-days', daysLeft: 7, bond: 0, status: 'Trial' },
                { uid: 'neg-bond', daysLeft: 1, bond: -5, status: 'Trial' },
            ],
        });
        assert.equals(1, restored.mercenaries.length);
        assert.equals('ok', restored.mercenaries[0].uid);
    });

    suite.test('凍結倒數非零但狀態不是 Frozen 的薪水紀錄被丟棄', () => {
        const restored = normalizeMercenaryBundle({
            upkeep: [{ uid: 'x', status: 'Active', unpaidDays: 0, frozenDaysLeft: 1 }],
        });
        assert.equals(0, restored.upkeep.length);
    });

    suite.test('冷卻紀錄必須為非負整數日序', () => {
        const restored = normalizeMercenaryBundle({
            cooldowns: [
                { uid: 'a', availableOnDay: 30 },
                { uid: 'b', availableOnDay: 1.5 },
                { uid: '', availableOnDay: 3 },
            ],
        });
        assert.equals(1, restored.cooldowns.length);
        assert.equals('a', restored.cooldowns[0].uid);
    });

    suite.test('陣列欄位不是陣列時視為空，不影響其他欄位', () => {
        const restored = normalizeMercenaryBundle({ mercenaries: 'oops', cooldowns: [{ uid: 'a', availableOnDay: 2 }] });
        assert.equals(0, restored.mercenaries.length);
        assert.equals(1, restored.cooldowns.length);
    });

    return suite;
}
