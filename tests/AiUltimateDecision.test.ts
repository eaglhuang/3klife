/**
 * AiUltimateDecision.test.ts — AI 奧義施放決策（AIS-07，PROG-2-9723 精力門檻改比例）
 *
 * 鎖住：低 IQ 不施放；中 IQ 需精力 > 最大精力 × 50% 且敵方 > 3；
 * 高 IQ 擊殺 ≥ 2 或落後且精力 > 最大精力 × 30%。
 * 比例值從 assets/resources/data/ai-difficulty.json 的 ultimateRules 讀取。
 * 男將（上限 120）與女將（上限 100）同比例時判斷一致；邊界（50%、30%、3 支、2 支）都不成立。
 *
 * Unity 對照：像 AI 的 Ability 條件節點，IQ 決定用哪一組條件，條件不成立就不 Cast。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { aiShouldUseUltimate, parseAiUltimateRules, type AiUltimateRules } from '../assets/scripts/core/systems/AiUltimateDecision';

const DIFFICULTY_PATH = path.join(__dirname, '..', 'assets', 'resources', 'data', 'ai-difficulty.json');
const RULES: AiUltimateRules = parseAiUltimateRules(JSON.parse(fs.readFileSync(DIFFICULTY_PATH, 'utf8'))) ?? { mediumVitalityRatio: 0.5, highLosingVitalityRatio: 0.3 };

/** 預設女將（上限 100）、敵方 5 支、無擊殺、未落後 */
const base = { vitality: 100, maxVitality: 100, enemyCount: 5, estimatedKills: 0, isLosing: false, rules: RULES };

export function createAiUltimateDecisionSuite(): TestSuite {
    const suite = new TestSuite('AiUltimateDecision (AI 奧義施放 AIS-07 / PROG-2-9723)');

    suite.test('低 IQ 不主動施放，即使條件都滿足', () => {
        assert.isFalse(aiShouldUseUltimate({ ...base, iq: 'LOW', estimatedKills: 9, isLosing: true }));
    });

    suite.test('中 IQ：精力 > 最大精力 50% 且敵方 > 3 才施放；邊界 50%、3 不成立', () => {
        assert.isTrue(aiShouldUseUltimate({ ...base, iq: 'MEDIUM', vitality: 51, enemyCount: 4 }));
        assert.isFalse(aiShouldUseUltimate({ ...base, iq: 'MEDIUM', vitality: 50, enemyCount: 4 }));
        assert.isFalse(aiShouldUseUltimate({ ...base, iq: 'MEDIUM', vitality: 51, enemyCount: 3 }));
    });

    suite.test('中 IQ：男將（上限 120）與女將（上限 100）同比例判斷一致', () => {
        // 男將 61/120 ≈ 50.8% 過門檻；女將 51/100 同樣過門檻
        assert.isTrue(aiShouldUseUltimate({ ...base, iq: 'MEDIUM', vitality: 61, maxVitality: 120, enemyCount: 4 }));
        assert.isTrue(aiShouldUseUltimate({ ...base, iq: 'MEDIUM', vitality: 51, maxVitality: 100, enemyCount: 4 }));
        // 男將 60/120 = 50% 邊界不成立；女將 50/100 同樣不成立（絕對值 50 不再是門檻）
        assert.isFalse(aiShouldUseUltimate({ ...base, iq: 'MEDIUM', vitality: 60, maxVitality: 120, enemyCount: 4 }));
        assert.isFalse(aiShouldUseUltimate({ ...base, iq: 'MEDIUM', vitality: 50, maxVitality: 100, enemyCount: 4 }));
    });

    suite.test('高 IQ：擊殺 ≥ 2 即施放；擊殺 1 且未落後不施放', () => {
        assert.isTrue(aiShouldUseUltimate({ ...base, iq: 'HIGH', estimatedKills: 2 }));
        assert.isFalse(aiShouldUseUltimate({ ...base, iq: 'HIGH', estimatedKills: 1 }));
    });

    suite.test('高 IQ：落後且精力 > 最大精力 30% 施放；邊界 30% 不成立（女將與男將同比例）', () => {
        assert.isTrue(aiShouldUseUltimate({ ...base, iq: 'HIGH', isLosing: true, vitality: 31 }));
        assert.isFalse(aiShouldUseUltimate({ ...base, iq: 'HIGH', isLosing: true, vitality: 30 }));
        // 男將 37/120 ≈ 30.8% 施放；36/120 = 30% 不施放
        assert.isTrue(aiShouldUseUltimate({ ...base, iq: 'HIGH', isLosing: true, vitality: 37, maxVitality: 120 }));
        assert.isFalse(aiShouldUseUltimate({ ...base, iq: 'HIGH', isLosing: true, vitality: 36, maxVitality: 120 }));
    });

    suite.test('EXTREME、PERFECT 暫與 HIGH 同規則', () => {
        assert.isTrue(aiShouldUseUltimate({ ...base, iq: 'EXTREME', estimatedKills: 2 }));
        assert.isTrue(aiShouldUseUltimate({ ...base, iq: 'PERFECT', estimatedKills: 2 }));
    });

    suite.test('比例值來自 rules（改 JSON 就改門檻，不寫死）', () => {
        const strict: AiUltimateRules = { mediumVitalityRatio: 0.8, highLosingVitalityRatio: 0.1 };
        assert.isFalse(aiShouldUseUltimate({ ...base, iq: 'MEDIUM', vitality: 60, enemyCount: 4, rules: strict }));
        assert.isTrue(aiShouldUseUltimate({ ...base, iq: 'HIGH', isLosing: true, vitality: 11, rules: strict }));
    });

    suite.test('parseAiUltimateRules：缺欄位或超出 0~1 回傳 null', () => {
        assert.equals(null, parseAiUltimateRules({}));
        assert.equals(null, parseAiUltimateRules({ ultimateRules: { mediumVitalityRatio: 0.5 } }));
        assert.equals(null, parseAiUltimateRules({ ultimateRules: { mediumVitalityRatio: 1.5, highLosingVitalityRatio: 0.3 } }));
        assert.equals(0.5, parseAiUltimateRules({ ultimateRules: { mediumVitalityRatio: 0.5, highLosingVitalityRatio: 0.3 } })?.mediumVitalityRatio ?? -1);
    });

    return suite;
}
