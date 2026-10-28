/**
 * WarInjury — 戰傷減損（武將壽命系統 §E-1，PROG-2-1570）
 * 覆蓋：重傷門檻、重傷扣 1 年壽命上限、未重傷原樣回傳、缺壽命上限時先依公式算再扣、不改輸入。
 */
import { assert, TestSuite } from './TestRunner';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { resolveMaxLifespan, AgingGeneral } from '../assets/scripts/core/systems/GeneralAging';
import { applyWarInjury, isSevereWarInjury, WAR_INJURY_LIFESPAN_PENALTY_YEARS } from '../assets/scripts/core/systems/WarInjury';

function general(extra: Partial<AgingGeneral>): AgingGeneral {
    return { id: 'g', name: 'g', age: 30, ...extra } as unknown as GeneralConfig as AgingGeneral;
}

export function createWarInjurySuite(): TestSuite {
    const suite = new TestSuite('WarInjury (戰傷減損 PROG-2-1570)');

    suite.test('重傷門檻：血量 ≤ 25% 或歸零為重傷', () => {
        assert.equals(true, isSevereWarInjury(0));
        assert.equals(true, isSevereWarInjury(0.25));
        assert.equals(false, isSevereWarInjury(0.26));
        assert.equals(false, isSevereWarInjury(Number.NaN));
    });

    suite.test('重傷扣壽命上限 1 年，不改輸入', () => {
        const g = general({ maxLifespan: 70 });
        const next = applyWarInjury(g, 0.1);
        assert.equals(70 - WAR_INJURY_LIFESPAN_PENALTY_YEARS, next.maxLifespan);
        assert.equals(70, g.maxLifespan);
    });

    suite.test('未重傷原樣回傳', () => {
        const g = general({ maxLifespan: 70 });
        assert.equals(g, applyWarInjury(g, 0.8));
    });

    suite.test('缺壽命上限時先依公式算再扣', () => {
        const g = general({ id: 'zhao-yun', redGeneLevel: 2 });
        assert.equals(resolveMaxLifespan(g) - 1, applyWarInjury(g, 0).maxLifespan);
    });

    return suite;
}
