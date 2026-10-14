import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, TestSuite } from './TestRunner';
import { validateSupportPool, PoolConfigLike, SupportCardLike } from '../assets/scripts/core/systems/SupportPoolValidator';

function readJson(relative: string): any {
    return JSON.parse(readFileSync(join(__dirname, '..', relative), 'utf8'));
}

function realData(): { pools: PoolConfigLike[]; cards: SupportCardLike[] } {
    return {
        pools: readJson('assets/resources/data/gacha-config.json'),
        cards: readJson('assets/resources/data/support-cards.json'),
    };
}

export function createSupportPoolValidatorSuite(): TestSuite {
    const suite = new TestSuite('SupportPoolValidator (OPEN-10 紅顏池資料)');

    suite.test('正式資料通過檢查：紅顏池與名將池分離，核心三位完整', () => {
        const { pools, cards } = realData();
        assert.equals(0, validateSupportPool(pools, cards).length);
    });

    suite.test('紅顏候選缺卡時回報', () => {
        const { pools, cards } = realData();
        const issues = validateSupportPool(pools, cards.filter(c => c.id !== 'cai-wenji'));
        assert.isTrue(issues.some(i => i.message.includes('cai-wenji')));
    });

    suite.test('紅顏卡缺預覽台詞、效果標籤或立繪鍵時回報', () => {
        const { pools, cards } = realData();
        const broken = cards.map(c => (c.id === 'da-qiao' ? { ...c, previewLine: '', effectTags: [], portraitKey: undefined } : c));
        const issues = validateSupportPool(pools, broken);
        assert.equals(3, issues.filter(i => i.path.startsWith('da-qiao')).length);
    });

    suite.test('紅顏與名將共用武將時回報', () => {
        const { pools, cards } = realData();
        const hero = pools.find(p => p.poolType === 'hero')!;
        const mixed = pools.map(p => (p.poolType === 'hero' ? { ...p, candidateIds: [...hero.candidateIds, 'da-qiao'] } : p));
        const issues = validateSupportPool(mixed, cards);
        assert.isTrue(issues.some(i => i.message.includes('同時出現')));
    });

    suite.test('缺少核心三位時回報', () => {
        const { pools, cards } = realData();
        const trimmed = pools.map(p => (p.poolType === 'support' ? { ...p, candidateIds: p.candidateIds.filter(id => id !== 'zhen-mi') } : p));
        const issues = validateSupportPool(trimmed, cards);
        assert.isTrue(issues.some(i => i.message.includes('zhen-mi')));
    });

    return suite;
}
