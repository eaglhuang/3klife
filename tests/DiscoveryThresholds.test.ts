/**
 * DiscoveryThresholds.test.ts — 發現等級門檻鍵名對齊（PROG-2-0508，headless）
 *
 * Unity 對照：EditMode Test 驗證 ScriptableObject 的欄位名與常數表一致，不開場景。
 */
import { TestSuite, assert } from './TestRunner';
import {
    discoveryThresholdsFromConstants,
    matchesFactorConstants,
    parseDiscoveryThresholds,
} from '../assets/scripts/core/systems/DiscoveryThresholds';
import { factorRequiredLevel } from '../assets/scripts/core/systems/FactorMask';

export function createDiscoveryThresholdsSuite(): TestSuite {
    const suite = new TestSuite('DiscoveryThresholds (發現等級門檻鍵名對齊 PROG-2-0508)');

    suite.test('對齊後的鍵名 Phase2 / Phase3 解析成功，值與常數一致', () => {
        const result = parseDiscoveryThresholds({ Phase2: 20, Phase3: 45 });
        assert.isTrue(result.ok);
        if (!result.ok) return;
        assert.equals(20, result.value.phase2);
        assert.equals(45, result.value.phase3);
        assert.isTrue(matchesFactorConstants(result.value));
        assert.equals(20, factorRequiredLevel({ type: 'green', id: 'g' }));
        assert.equals(45, factorRequiredLevel({ type: 'red', id: 'r' }));
    });

    suite.test('讀取相容：舊示例 { Phase1: 20, Phase2: 45 } 被拒，不會把 20 誤讀成階段 1', () => {
        const result = parseDiscoveryThresholds({ Phase1: 20, Phase2: 45 });
        assert.isFalse(result.ok);
        if (result.ok) return;
        assert.isTrue(result.errors.some((e) => e.includes('Phase1')), '要指出舊鍵已停用');
        assert.isTrue(result.errors.some((e) => e.includes('Phase3')), '缺少 Phase3 也要列出');
    });

    suite.test('缺鍵、非整數、小於 1 都會被擋，錯誤一次全部列出', () => {
        const missing = parseDiscoveryThresholds({ Phase2: 20 });
        assert.isFalse(missing.ok);
        const fractional = parseDiscoveryThresholds({ Phase2: 20.5, Phase3: 45 });
        assert.isFalse(fractional.ok);
        const zero = parseDiscoveryThresholds({ Phase2: 0, Phase3: 45 });
        assert.isFalse(zero.ok);
        const all = parseDiscoveryThresholds({ Phase1: 20 });
        assert.isFalse(all.ok);
        if (!all.ok) assert.isTrue(all.errors.length >= 3);
    });

    suite.test('Phase2 必須小於 Phase3', () => {
        const result = parseDiscoveryThresholds({ Phase2: 45, Phase3: 20 });
        assert.isFalse(result.ok);
    });

    suite.test('非物件輸入直接拒絕', () => {
        assert.isFalse(parseDiscoveryThresholds(null).ok);
        assert.isFalse(parseDiscoveryThresholds([20, 45]).ok);
        assert.isFalse(parseDiscoveryThresholds('Phase2').ok);
    });

    suite.test('不一致的設定會被 matchesFactorConstants 判出', () => {
        assert.isTrue(matchesFactorConstants(discoveryThresholdsFromConstants()));
        assert.isFalse(matchesFactorConstants({ phase2: 25, phase3: 45 }));
    });

    return suite;
}
