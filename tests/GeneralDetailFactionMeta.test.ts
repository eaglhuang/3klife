import { TestSuite, assert } from './TestRunner';
import { buildGeneralDetailOverview } from '../assets/scripts/ui/components/GeneralDetailOverviewMapper';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function metaOf(faction: string): string {
    const config = { id: 'test', name: '測試', faction, role: 'Combat' } as unknown as GeneralConfig;
    return buildGeneralDetailOverview(config).header.meta;
}

export function createGeneralDetailFactionMetaSuite(): TestSuite {
    const suite = new TestSuite('GeneralDetailFactionMeta');

    suite.test('勢力代碼顯示為勢力名', () => {
        assert.equals('蜀．先鋒', metaOf('shu'));
        assert.equals('魏．先鋒', metaOf('wei'));
        assert.equals('吳．先鋒', metaOf('wu'));
    });

    suite.test('在野與既有對照不變', () => {
        assert.equals('在野．先鋒', metaOf('neutral'));
        assert.equals('敵軍．先鋒', metaOf('enemy'));
    });

    return suite;
}
