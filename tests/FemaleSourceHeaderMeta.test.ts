/**
 * FemaleSourceHeaderMeta — 人物頁標頭顯示女將來源標籤的 headless 測試（PROG-2-1734）
 */
import { assert, TestSuite } from './TestRunner';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { createFemaleSource } from '../assets/scripts/core/systems/FemaleSource';
import { buildGeneralDetailOverview } from '../assets/scripts/ui/components/GeneralDetailOverviewMapper';

function general(fields: Record<string, unknown> = {}): GeneralConfig {
    return { id: 'g', name: '測試', faction: 'shu', role: 'Combat', gender: 'female', ...fields } as unknown as GeneralConfig;
}

export function createFemaleSourceHeaderMetaSuite(): TestSuite {
    const suite = new TestSuite('FemaleSourceHeaderMeta (人物頁女將來源標籤 PROG-2-1734)');

    suite.test('有來源紀錄時標頭尾端加上來源標籤', () => {
        const meta = buildGeneralDetailOverview(general(), createFemaleSource('CAPTIVE', 'SR', 2)).header.meta;
        assert.equals('蜀．先鋒．戰俘招降', meta);
    });

    suite.test('沒有來源紀錄時標頭不變', () => {
        assert.equals('蜀．先鋒', buildGeneralDetailOverview(general()).header.meta);
        assert.equals('蜀．先鋒', buildGeneralDetailOverview(general(), null).header.meta);
    });

    suite.test('來源標籤排在職業標籤之後', () => {
        const meta = buildGeneralDetailOverview(general({ age: 20, careerClass: 'Warrior' }), createFemaleSource('GACHA', 'SSR', 1)).header.meta;
        assert.equals('蜀．先鋒．武官．天命召喚', meta);
    });

    return suite;
}
