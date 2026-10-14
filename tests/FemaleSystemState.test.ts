// @spec-source → FEM 接線存檔狀態（PROG-2-0564）
/**
 * FemaleSystemState — 女性來源存檔狀態正規化與送禮 headless 測試（PROG-2-0564）
 */
import { assert, TestSuite } from './TestRunner';
import {
    EMPTY_FEMALE_SYSTEM_STATE,
    giftToFemale,
    normalizeFemaleSystemState,
} from '../assets/scripts/core/systems/FemaleSystemState';

export function createFemaleSystemStateSuite(): TestSuite {
    const suite = new TestSuite('FemaleSystemState (女性來源存檔狀態 FEM 接線)');

    suite.test('舊檔沒有欄位：讀回預設值（時間 null、好感空表）', () => {
        const state = normalizeFemaleSystemState(undefined);
        assert.isTrue(state.poolRefreshedAtMs === null);
        assert.isTrue(state.rescueRefreshedAtMs === null);
        assert.equals(0, Object.keys(state.giftAffection).length);
        assert.isTrue(EMPTY_FEMALE_SYSTEM_STATE.poolRefreshedAtMs === null);
    });

    suite.test('好感讀檔夾回 0~100，非數字丟棄', () => {
        const state = normalizeFemaleSystemState({
            poolRefreshedAtMs: 123,
            giftAffection: { a: 150, b: -20, c: 'x', d: 40 },
        });
        assert.equals(123, state.poolRefreshedAtMs);
        assert.equals(100, state.giftAffection.a);
        assert.equals(0, state.giftAffection.b);
        assert.isFalse('c' in state.giftAffection);
        assert.equals(40, state.giftAffection.d);
    });

    suite.test('送禮：回傳新物件，不改原狀態，好感照規則累加並夾限', () => {
        const before = normalizeFemaleSystemState({ giftAffection: { a: 90 } });
        const after = giftToFemale(before, 'a', 30);
        assert.equals(100, after.giftAffection.a);
        assert.equals(90, before.giftAffection.a);
        const fresh = giftToFemale(before, 'new', 25);
        assert.equals(25, fresh.giftAffection.new);
    });

    return suite;
}
