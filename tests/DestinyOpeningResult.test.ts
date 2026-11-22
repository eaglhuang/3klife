import { assert, TestSuite } from './TestRunner';
import { buildDestinyOpeningResults } from '../assets/scripts/ui/core/DestinyOpeningResult';
import {
    countPullResultRarities, coverCropRect, fitContain, pickTopGachaResult, pullResultRarityLabel,
    raritySummarySlots, renderedBoxAspect,
} from '../assets/scripts/ui/core/GachaResultRanking';
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
    suite.test('統計含 N：十連 1 SSR + 1 N + 8 R，N 不會被算進 R', () => {
        const tiers = ['legendary', 'common', ...Array(8).fill('rare')];
        const counts = countPullResultRarities(tiers);
        assert.equals('SSR', counts[0].label);
        assert.equals(1, counts[0].count);
        assert.equals('R', counts[1].label);
        assert.equals(8, counts[1].count);
        assert.equals('N', counts[2].label);
        assert.equals(1, counts[2].count);
        assert.equals(3, counts.length);
    });
    suite.test('統計只列出實際出現的稀有度，由高到低，不寫死三種', () => {
        const counts = countPullResultRarities(['rare', 'rare', 'mythic', 'epic']);
        assert.equals('UR,SR,R', counts.map((c) => c.label).join(','));
        assert.equals(2, counts[2].count);
        assert.equals(0, countPullResultRarities([]).length);
    });
    suite.test('稀有度標籤與角標一致', () => {
        assert.equals('N', pullResultRarityLabel('common'));
        assert.equals('R', pullResultRarityLabel('rare'));
        assert.equals('SR', pullResultRarityLabel('epic'));
        assert.equals('SSR', pullResultRarityLabel('legendary'));
        assert.equals('UR', pullResultRarityLabel('mythic'));
    });
    suite.test('統計列槽位：三格依序放，超出的收進最後一格', () => {
        assert.equals('SSR ×1|SR ×2|N ×1', raritySummarySlots(['SSR ×1', 'SR ×2', 'N ×1'], 3).join('|'));
        const four = raritySummarySlots(['SSR ×1', 'SR ×2', 'R ×6', 'N ×1'], 3);
        assert.equals('SSR ×1', four[0]);
        assert.equals('SR ×2', four[1]);
        assert.equals('R ×6　N ×1', four[2]);
        assert.equals('||', raritySummarySlots([], 3).join('|'));
    });
    suite.test('頭像裁切比例：父層非等比縮放時用世界縮放補正，不壓扁', () => {
        // 本地 188×248，父層 X 縮 0.5、Y 不縮：世界框 94×248，比例 94/248
        assert.equals(Math.round(94 / 248 * 1000), Math.round(renderedBoxAspect(188, 248, 0.5, 1) * 1000));
        // 等比縮放不改變比例
        assert.equals(Math.round(188 / 248 * 1000), Math.round(renderedBoxAspect(188, 248, 0.75, 0.75) * 1000));
        assert.equals(1, renderedBoxAspect(0, 248, 1, 1));
    });
    suite.test('coverCropRect 取寬高比後置中裁切（接在補正比例後）', () => {
        const crop = coverCropRect(512, 512, renderedBoxAspect(188, 248, 0.5, 1));
        assert.equals(512, crop.height);
        assert.equals(Math.round(512 * 94 / 248), Math.round(crop.width));
    });
    return suite;
}
