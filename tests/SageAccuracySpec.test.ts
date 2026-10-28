/**
 * SageAccuracySpec.test.ts — 名士準確率規格示例（ORAC-10，名士預言系統 §驗證示例）headless 測試
 *
 * Unity 對照：EditMode Test，用固定亂數（相當於 Random.InitState 固定種子）跑規格上的三個示例。
 * 鎖住：Random ≤ accuracy 為正確（Is_Distorted = false），否則扭曲。
 *   示例 1：Random 0.10，諸葛亮 0.85 → 正確
 *   示例 2：Random 0.90，諸葛亮 0.85 → 扭曲
 *   示例 3：Random 0.50，諸葛亮 0.85 → 正確
 */
import { TestSuite, assert } from './TestRunner';
import { divineFactor } from '../assets/scripts/core/systems/SageDivination';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

/** 依序回傳給定值的亂數替身；第一顆骰是準確率判定，之後的骰值給偏好加權用 */
function seq(...values: number[]): () => number {
    let n = 0;
    return () => values[Math.min(n++, values.length - 1)];
}

/** 藍、綠、紅、紫各一顆鎖定因子，與 SageDivination.test.ts 的學士一致 */
function scholar(): GeneralConfig {
    return {
        id: 'sch', name: '學士', faction: 'shu', gender: '男', age: 30, hp: 1000,
        vitality: 100, maxVitality: 100,
        str: 50, int: 90, lea: 60, pol: 80, cha: 60, luk: 40,
        genes: [
            { id: 'gene_command', type: 'blue', level: 2, isLocked: true, discoveryLevel: 1 },
            { id: 'gene_strategy', type: 'green', level: 3, isLocked: true, discoveryLevel: 20 },
            { id: 'gene_vitality', type: 'red', level: 2, isLocked: true, discoveryLevel: 45 },
            { id: 'gene_destiny', type: 'purple', level: 4, isLocked: true, discoveryLevel: 45 },
        ],
    } as unknown as GeneralConfig;
}

export function createSageAccuracySpecSuite(): TestSuite {
    const suite = new TestSuite('SageAccuracySpec (名士準確率規格示例 ORAC-10)');

    suite.test('規格示例 1：Random 0.10 ≤ 0.85 → 預言正確（未扭曲）', () => {
        const result = divineFactor(scholar(), 'zhuge-liang', 1, seq(0.1, 0));
        assert.equals('awakened', result.outcome);
    });

    suite.test('規格示例 2：Random 0.90 > 0.85 → 預言扭曲', () => {
        const result = divineFactor(scholar(), 'zhuge-liang', 1, seq(0.9));
        assert.equals('distorted', result.outcome);
    });

    suite.test('規格示例 3：Random 0.50 ≤ 0.85 → 預言正確（未扭曲）', () => {
        const result = divineFactor(scholar(), 'zhuge-liang', 1, seq(0.5, 0));
        assert.equals('awakened', result.outcome);
    });

    return suite;
}
