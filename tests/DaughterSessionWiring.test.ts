/**
 * DaughterSessionWiring.test.ts — 子嗣女兒清單、分流與年度掛點（FEM-06 / PROG-2-0715）headless 測試
 *
 * Unity 對照：像 EditMode 測試，驗 Command（新增、分流、年度推進）的拒絕條件與舊檔相容。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
import { normalizeFemaleSystemState } from '../assets/scripts/core/systems/FemaleSystemState';
import { advanceDaughtersOneYear } from '../assets/scripts/core/systems/DaughterComingOfAge';

export function createDaughterSessionWiringSuite(): TestSuite {
    const suite = new TestSuite('DaughterSessionWiring (子嗣女兒 FEM-06)');

    suite.test('新增女兒：第一次成功，相同 id 回傳 false 且清單不變', async () => {
        const session = new GameSession(3);
        assert.isTrue(await session.addDaughter({ id: 'd1', age: 10, role: null }));
        assert.isFalse(await session.addDaughter({ id: 'd1', age: 12, role: null }));
        assert.equals(1, session.daughters.length);
        assert.equals(10, session.daughters[0].age);
    });

    suite.test('年度掛點：每年長一歲，只有跨過 14 歲的那一年回傳', async () => {
        const session = new GameSession(3);
        await session.addDaughter({ id: 'd1', age: 13, role: null });
        const first = await session.onYearAdvanced();
        assert.equals(1, first.length);
        assert.equals(14, session.daughters[0].age);
        const second = await session.onYearAdvanced();
        assert.equals(0, second.length);
        assert.equals(15, session.daughters[0].age);
    });

    suite.test('分流：未滿 14 歲拒絕；滿 14 歲可選前線，職能為 Combat，第二次拒絕', async () => {
        const session = new GameSession(3);
        await session.addDaughter({ id: 'd1', age: 13, role: null });
        assert.equals('NOT_OF_AGE', (await session.assignDaughterRouteFor('d1', 'frontline') as { reason: string }).reason);
        await session.onYearAdvanced();
        const ok = await session.assignDaughterRouteFor('d1', 'frontline');
        assert.isTrue(ok.ok);
        assert.equals('frontline', session.daughters[0].route);
        assert.equals('Combat', session.daughters[0].role as string);
        assert.equals('ALREADY_ROUTED', (await session.assignDaughterRouteFor('d1', 'instructor') as { reason: string }).reason);
        assert.equals('NOT_FOUND', (await session.assignDaughterRouteFor('nope', 'palace') as { reason: string }).reason);
    });

    suite.test('舊檔相容：缺欄位回傳空清單；壞資料與重複 id 會被丟掉', () => {
        assert.equals(0, normalizeFemaleSystemState({}).daughters.length);
        const cleaned = normalizeFemaleSystemState({
            daughters: [{ id: 'a', age: 15, role: null, route: 'bogus' }, { id: 'a', age: 16 }, { id: '', age: 14 }, { id: 'b', age: 'x' }],
        });
        assert.equals(1, cleaned.daughters.length);
        assert.equals(null, cleaned.daughters[0].route);
    });

    suite.test('純函式：年度推進不改傳入清單', () => {
        const input = [{ id: 'd1', age: 13, role: null }];
        const result = advanceDaughtersOneYear(input);
        assert.equals(13, input[0].age);
        assert.equals(14, result.daughters[0].age);
        assert.equals(1, result.newlyOfAge.length);
    });

    return suite;
}
