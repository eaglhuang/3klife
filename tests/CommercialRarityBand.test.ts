/**
 * CommercialRarityBand.test.ts — 商業化 7 色分層 headless 測試（PROG-2-0320 / WBS TERM-02）
 *
 * 不開 Cocos：驗證公式、規則夾限，並確認內建常數與 rarity-thresholds.json 的 commercialRarity 同值。
 *
 * Unity 對照：EditMode Test 直接驗證 ScriptableObject 表格的查表結果。
 */
import { assert, TestSuite } from './TestRunner';
import {
    CommercialBandInput,
    DEFAULT_COMMERCIAL_RARITY_CONFIG,
    resolveCommercialBand,
} from '../assets/scripts/core/utils/CommercialRarityBand';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

/** 物件鍵排序後序列化，忽略鍵的先後順序 */
function sortedJson(value: unknown): string {
    if (Array.isArray(value)) return `[${value.map(sortedJson).join(',')}]`;
    if (value && typeof value === 'object') {
        return `{${Object.keys(value as object).sort().map((key) => `${JSON.stringify(key)}:${sortedJson((value as Record<string, unknown>)[key])}`).join(',')}}`;
    }
    return JSON.stringify(value);
}

function input(extra: Partial<CommercialBandInput>): CommercialBandInput {
    return {
        id: 'test-general',
        gender: '男',
        characterCategory: 'general',
        str: 30, int: 30, lea: 30, pol: 30, cha: 30,
        tier: 'common',
        ...extra,
    };
}

export function createCommercialRarityBandSuite(): TestSuite {
    const suite = new TestSuite('CommercialRarityBand (商業化 7 色分層 TERM-02)');

    suite.test('內建常數與 rarity-thresholds.json 的 commercialRarity 區塊同值', () => {
        const json = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'assets/resources/data/rarity-thresholds.json'), 'utf8'));
        const { description: _description, ...fromJson } = json.commercialRarity;
        assert.equals(sortedJson(fromJson), sortedJson(DEFAULT_COMMERCIAL_RARITY_CONFIG));
    });

    suite.test('低數值普通男將落在白色基礎層，標籤與顏色取自表格', () => {
        const result = resolveCommercialBand(input({}));
        assert.equals(0, result.score);
        assert.equals('white', result.band);
        assert.equals('白 / 基礎', result.label);
        assert.equals('#D9D9D9', result.color);
    });

    suite.test('女將魅力走 sqrt10 補正，只用於商業分層（原始 cha 不變）', () => {
        const result = resolveCommercialBand(input({ gender: '女', cha: 100, tier: 'common' }));
        assert.equals(100, result.commercialCha);
        // 女將 +1、最高五圍 ≥95 +1（原始 cha=100）、魅力 ≥90 +1、≥95 +1，合計 4 → 藍
        assert.equals(4, result.score);
        assert.equals('blue', result.band);
    });

    suite.test('女將上限為紫色（maxBandByGender）', () => {
        const result = resolveCommercialBand(input({
            gender: '女', characterCategory: 'famed', tier: 'legendary',
            str: 60, int: 60, lea: 60, pol: 60, cha: 70,
        }));
        assert.equals('purple', result.band);
    });

    suite.test('高階色（金以上）未列入精選名單時降為紫色（premiumBandFallback）', () => {
        const result = resolveCommercialBand(input({
            id: 'not-featured', characterCategory: 'titled', tier: 'mythic',
            str: 96, int: 90, lea: 90, pol: 90, cha: 90,
        }));
        assert.isTrue(result.score >= DEFAULT_COMMERCIAL_RARITY_CONFIG.scoreBands.red);
        assert.equals(null, result.forcedBand);
        assert.equals('purple', result.band);
    });

    suite.test('精選名單直接定色，不受分數與夾限影響', () => {
        const result = resolveCommercialBand(input({ id: 'lu-bu', tier: 'mythic', characterCategory: 'mythical' }));
        assert.equals('gold', result.forcedBand);
        assert.equals('gold', result.band);
        assert.equals('金 / 招牌', result.label);
    });

    suite.test('男將平均五圍低於紫色下限（69）時往下降一階', () => {
        const result = resolveCommercialBand(input({
            tier: 'legendary', characterCategory: 'general',
            str: 80, int: 40, lea: 40, pol: 40, cha: 40,
        }));
        // 分數 6 → 紫；平均 48 < 69 → 降為藍
        assert.equals('blue', result.band);
    });

    suite.test('適性 A/S 數量達門檻時才加分（預設 aptitudeBonus 為 0，不改分數）', () => {
        const result = resolveCommercialBand(input({
            troopAptitude: { cavalry: 'A', archer: 'S' },
            terrainAptitude: { plain: 'A' },
        }));
        assert.equals(3, result.aptitudeTotal);
        assert.equals(0, result.score);
    });

    suite.test('缺欄位給安全預設：不丟錯、落在白色層', () => {
        const result = resolveCommercialBand({ id: 'bare', tier: 'unknown' });
        assert.equals('white', result.band);
        assert.equals(0, result.score);
    });

    return suite;
}
