import { assert, TestSuite } from './TestRunner';
import { buildDestinyOpeningResults } from '../assets/scripts/ui/core/DestinyOpeningResult';
import { fitContain, pickTopGachaResult } from '../assets/scripts/ui/core/GachaResultRanking';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

const general = (id: string, name: string, rarityTier?: string) => ({ id, name, rarityTier }) as unknown as GeneralConfig;

export function createDestinyOpeningResultSuite(): TestSuite {
    const suite = new TestSuite('DestinyOpeningResult 開場十連結算資料（PROG-2-2236）');
    suite.test('照抽到順序轉成結果條目，未知 id 略過、序號連續', () => {
        const generals = [general('a', '甲', 'legendary'), general('b', '乙')];
        const results = buildDestinyOpeningResults(['a', 'x', 'b'], generals);
        assert.equals(2, results.length);
        assert.equals('a', results[0].general.id);
        assert.equals(1, results[0].drawIndex);
        assert.equals(2, results[1].drawIndex);
        assert.equals('rare', results[1].rarityTier);
        assert.equals('destiny-pool', results[0].poolId);
        assert.isTrue(results[1].displayText.includes('乙'));
    });
    suite.test('pickTopGachaResult 取最高稀有度，同階取先抽到的', () => {
        const generals = [general('c', '丙', 'rare'), general('d', '丁', 'epic'), general('e', '戊', 'epic')];
        const results = buildDestinyOpeningResults(['c', 'd', 'e'], generals);
        assert.equals('d', pickTopGachaResult(results)?.general.id);
    });
    suite.test('fitContain 等比放進框內，不拉伸', () => {
        const tall = fitContain(660, 980, 720, 1280);
        assert.equals(980, Math.round(tall.height));
        assert.equals(551, Math.round(tall.width));
        const wide = fitContain(660, 980, 1024, 1024);
        assert.equals(660, Math.round(wide.width));
        assert.equals(660, Math.round(wide.height));
    });
    return suite;
}
