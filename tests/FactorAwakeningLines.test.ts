/**
 * FactorAwakeningLines.test.ts — 因子覺醒文案（PROG-2-1783）
 */
import { assert, TestSuite } from './TestRunner';
import { awakenFactor, factorAwakeningLines } from '../assets/scripts/core/systems/FactorAwakening';

const lines = (color: 'green' | 'purple' | 'white' | 'blue' | 'pink' | 'red' | null) =>
    factorAwakeningLines({ displayName: '騎戰直覺', level: 3, color }).join('|');

export function createFactorAwakeningLinesSuite(): TestSuite {
    const suite = new TestSuite('FactorAwakeningLines');

    suite.test('每個覺醒都有名字與星等；綠紫白多一句', () => {
        const head = '【覺醒因子：騎戰直覺★3】';
        assert.equals(`${head}|祖傳戰法種子萌發！習得 綠色戰法 所需 TP 減半！`, lines('green'));
        assert.equals(`${head}|天命之力覺醒！未來爆發力將不可限量！`, lines('purple'));
        assert.equals(`${head}|隱藏天賦顯現：騎戰直覺。`, lines('white'));
        for (const color of ['blue', 'pink', 'red', null] as const) assert.equals(head, lines(color));
    });

    suite.test('真實覺醒事件的等級與名字會進句子', () => {
        const general = { id: 'g', genes: [{ id: 'gene_x', type: '戰法', displayName: '戰吼傳承', level: 2, isLocked: true }] };
        const result = awakenFactor(general as never, 'gene_x', 'sage', 99);
        assert.isTrue(result.ok);
        if (result.ok) {
            // 舊資料的中文類型也要認得出是綠因子
            assert.equals('【覺醒因子：戰吼傳承★2】|祖傳戰法種子萌發！習得 綠色戰法 所需 TP 減半！', factorAwakeningLines(result.event).join('|'));
        }
    });

    return suite;
}
