/**
 * DaughterComingOfAge.test.ts — 子嗣女兒 14 歲及笄分流（PROG-2-0514 / FEM-06，headless）
 *
 * Unity 對照：EditMode Test 直接餵年齡與選項，驗證事件只發一次、非法輸入被擋。
 */
import { TestSuite, assert } from './TestRunner';
import {
    chooseDaughterRoute,
    COMING_OF_AGE_AGE,
    DAUGHTER_ROUTES,
    isComingOfAge,
} from '../assets/scripts/core/systems/DaughterComingOfAge';

function daughter(extra: Record<string, unknown> = {}): { gender: string; age: number; daughterRoute?: string | null } {
    return { gender: '女', age: 14, ...extra };
}

export function createDaughterComingOfAgeSuite(): TestSuite {
    const suite = new TestSuite('DaughterComingOfAge (子嗣女兒及笄分流 PROG-2-0514)');

    suite.test('年齡跨過 14 歲時觸發一次（含剛好 14）', () => {
        assert.equals(14, COMING_OF_AGE_AGE);
        assert.isTrue(isComingOfAge(daughter(), 13, 14));
        assert.isTrue(isComingOfAge(daughter(), 13, 15), '一季跨多歲也算跨過');
        assert.isFalse(isComingOfAge(daughter(), 12, 13), '未滿 14 不觸發');
        assert.isFalse(isComingOfAge(daughter(), 14, 15), '已經 14 歲不重複觸發');
    });

    suite.test('男性與已選過路線的不觸發；非法年齡不觸發', () => {
        assert.isFalse(isComingOfAge({ gender: '男' }, 13, 14));
        assert.isFalse(isComingOfAge(daughter({ daughterRoute: 'palace' }), 13, 14));
        assert.isFalse(isComingOfAge(daughter(), NaN, 14));
        assert.isFalse(isComingOfAge(daughter(), 13, Infinity));
    });

    suite.test('路線白名單：前線武將 / 後宮女官 / 教官儲備', () => {
        assert.equals('frontline,palace,mentor_reserve', DAUGHTER_ROUTES.join(','));
    });

    suite.test('選擇路線：寫入 daughterRoute，回傳新物件、不改輸入', () => {
        const input = Object.freeze(daughter());
        const result = chooseDaughterRoute(input, 'palace');
        assert.isTrue(result.ok);
        if (!result.ok) return;
        assert.equals('palace', result.general.daughterRoute);
        assert.isTrue(input.daughterRoute === undefined, '輸入不變');
    });

    suite.test('選擇後再觸發就不會再回報（同一女兒只分流一次）', () => {
        const chosen = chooseDaughterRoute(daughter(), 'frontline');
        assert.isTrue(chosen.ok);
        if (!chosen.ok) return;
        assert.isFalse(isComingOfAge(chosen.general, 13, 14));
        const again = chooseDaughterRoute(chosen.general, 'palace');
        assert.isTrue(!again.ok && again.reason === 'already-chosen');
    });

    suite.test('被擋的情況：非女性、未滿 14、非法路線都回報原因', () => {
        const male = chooseDaughterRoute({ gender: '男', age: 20 }, 'palace');
        assert.isTrue(!male.ok && male.reason === 'not-female');
        const young = chooseDaughterRoute(daughter({ age: 13 }), 'palace');
        assert.isTrue(!young.ok && young.reason === 'not-of-age');
        const bad = chooseDaughterRoute(daughter(), 'general');
        assert.isTrue(!bad.ok && bad.reason === 'invalid-route');
    });

    return suite;
}
