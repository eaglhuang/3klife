// @spec-source → 紅顏池 poolType 改名 support → heroine；PROG-2-9044
import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, TestSuite } from './TestRunner';
import { normalizeGachaPoolType, type GachaConfig } from '../assets/scripts/core/models/GachaConfig';
import { GachaSystem, type GachaPoolRule } from '../assets/scripts/core/systems/GachaSystem';
import { validateSupportPool } from '../assets/scripts/core/systems/SupportPoolValidator';

function readJson(relative: string): any {
    return JSON.parse(readFileSync(join(__dirname, '..', relative), 'utf8'));
}

function ruleTagged(tag: string, calls: string[]): GachaPoolRule {
    return { async pull() { calls.push(tag); return []; } };
}

export function createHeroinePoolTypeSuite(): TestSuite {
    const suite = new TestSuite('HeroinePoolType (紅顏池 poolType 改名與舊值相容)');

    suite.test('normalizeGachaPoolType：舊值 support 視為 heroine，其餘原樣', () => {
        assert.equals('heroine', normalizeGachaPoolType('support'));
        assert.equals('heroine', normalizeGachaPoolType('heroine'));
        assert.equals('mentor', normalizeGachaPoolType('mentor'));
        assert.equals('hero', normalizeGachaPoolType('hero'));
        assert.equals(undefined, normalizeGachaPoolType(undefined));
    });

    suite.test('正式資料：紅顏池為 heroine、沒有殘留 support，教官池仍是 mentor', () => {
        const pools: GachaConfig[] = readJson('assets/resources/data/gacha-config.json');
        assert.equals(0, pools.filter(p => (p.poolType as string) === 'support').length);
        assert.equals('heroine', pools.find(p => p.poolId === 'support-pool')!.poolType);
        assert.equals('mentor', pools.find(p => p.poolId === 'mentor-pool')!.poolType);
    });

    suite.test('舊資料 poolType: support 的紅顏池仍走 heroine 規則', async () => {
        const legacy: GachaConfig[] = readJson('assets/resources/data/gacha-config.json')
            .map((p: GachaConfig) => (p.poolId === 'support-pool' ? { ...p, poolType: 'support' } : p));
        const calls: string[] = [];
        const sys = new GachaSystem(() => legacy)
            .registerType('heroine', ruleTagged('heroine', calls))
            .registerType('hero', ruleTagged('hero', calls));
        assert.isTrue(sys.hasRule('support-pool'));
        await sys.pull({ poolId: 'support-pool', drawCount: 1, generals: [] });
        assert.equals('heroine', calls.join(','));
    });

    suite.test('舊 poolTypeHint: support 在設定未載入時仍選到 heroine 規則', async () => {
        const calls: string[] = [];
        const sys = new GachaSystem(() => []).registerType('heroine', ruleTagged('heroine', calls));
        await sys.pull({ poolId: 'support-pool', drawCount: 1, generals: [], poolTypeHint: 'support' });
        assert.equals('heroine', calls.join(','));
    });

    suite.test('驗證器接受舊 support 代號的紅顏池', () => {
        const pools = [
            { poolId: 'hero-pool', poolType: 'hero', candidateIds: ['cao-cao'] },
            { poolId: 'support-pool', poolType: 'support', candidateIds: ['da-qiao', 'xiao-qiao', 'zhen-mi'] },
        ];
        const cards = ['da-qiao', 'xiao-qiao', 'zhen-mi'].map(id => ({ id, previewLine: 'x', effectTags: ['t'], portraitKey: 'k' }));
        assert.equals(0, validateSupportPool(pools, cards).length);
    });

    return suite;
}
