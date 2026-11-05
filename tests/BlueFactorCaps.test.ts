import { TestSuite, assert } from './TestRunner';
import { blueFactorCapLine, blueFactorCaps } from '../assets/scripts/core/systems/LineageSynergy';
import type { GeneralGeneConfig } from '../assets/scripts/core/models/GeneralUnit';

const blue = (id: string, level: number, extra: Partial<GeneralGeneConfig> = {}): GeneralGeneConfig => ({ id, type: 'blue', level, displayName: id, isLocked: true, discoveryLevel: 1, ...extra } as unknown as GeneralGeneConfig);
const options = { synergyAllowed: true, purifyIds: [] as string[], isVisible: () => true };

export function createBlueFactorCapsSuite(): TestSuite {
    const suite = new TestSuite('BlueFactorCaps');

    suite.test('單方持有：基礎顯性上限 3★；雙方同持：連攜上限 4★，星數取較高', () => {
        const rows = blueFactorCaps({ genes: [blue('a', 2), blue('b', 3)] }, { genes: [blue('b', 1)] }, options);
        assert.lengthEquals(2, rows);
        assert.equals('b', rows[0].name);
        assert.equals(3, rows[0].star);
        assert.equals(4, rows[0].cap);
        assert.equals('門風連攜 +1', rows[0].source);
        assert.equals(3, rows[1].cap);
        assert.equals('基礎顯性', rows[1].source);
    });

    suite.test('同血脈不算連攜；命中純化上限 5★', () => {
        const parent = { genes: [blue('a', 2)] };
        assert.equals('基礎顯性', blueFactorCaps(parent, parent, { ...options, synergyAllowed: false })[0].source);
        const purified = blueFactorCaps(parent, parent, { ...options, synergyAllowed: false, purifyIds: ['a'] })[0];
        assert.equals(5, purified.cap);
        assert.equals('血脈純化', purified.source);
    });

    suite.test('星數已超過上限時，上限不會比星數低', () => {
        assert.equals(5, blueFactorCaps({ genes: [blue('a', 5)] }, {}, options)[0].cap);
    });

    suite.test('非藍因子與還沒揭露的不列出', () => {
        const hidden = blue('h', 3, { discoveryLevel: 5 });
        const rows = blueFactorCaps({ genes: [blue('r', 3, { type: 'red' } as Partial<GeneralGeneConfig>), hidden] }, {}, { ...options, isVisible: (gene) => (gene.discoveryLevel ?? 1) <= 1 });
        assert.lengthEquals(0, rows);
        assert.equals('', blueFactorCapLine(rows));
    });

    suite.test('畫面句標出連攜與純化', () => {
        const parent = { genes: [blue('a', 2)] };
        assert.equals('藍因子 星數/上限：a 2★/4★（門風連攜 +1）', blueFactorCapLine(blueFactorCaps(parent, parent, options)));
        assert.equals('藍因子 星數/上限：a 2★/5★（血脈純化）', blueFactorCapLine(blueFactorCaps(parent, parent, { ...options, purifyIds: ['a'] })));
    });

    suite.test('畫面句只列前 3 項', () => {
        const line = blueFactorCapLine(blueFactorCaps({ genes: [blue('a', 4), blue('b', 3), blue('c', 2), blue('d', 1)] }, {}, options));
        assert.equals('藍因子 星數/上限：a 4★/4★｜b 3★/3★｜c 2★/3★｜另 1 項', line);
    });

    return suite;
}
