/**
 * PhaseOfficerLines.test.ts — 因子階段解鎖提示與官職劇本句（PROG-2-1779）
 *
 * Unity 對照：EditMode Test，只驗句子挑選，不開 Scene。
 */
import { assert, TestSuite } from './TestRunner';
import { discoveryPhaseUnlockLines } from '../assets/scripts/core/systems/DiscoveryProgress';
import { officerPromotionScriptLines } from '../assets/scripts/core/systems/OfficerSnapshot';

const PHASE2 = '新因子類型已解鎖：⚪天賦因子 + 🔴體魄因子';
const PHASE3 = '終極因子已解鎖：🟣天命因子';
const PROMOTED = '朝議已定，今授你新官印，職權更重。';
const SANDTABLE = '官職既進，沙盤又展開更遠方的疆界。';

export function createPhaseOfficerLinesSuite(): TestSuite {
    const suite = new TestSuite('PhaseOfficerLines');

    suite.test('階段提示：只在跨階時出現，一次跨兩階兩句都有', () => {
        assert.equals(0, discoveryPhaseUnlockLines({ phaseBefore: 1, phaseAfter: 1 }).length);
        assert.equals(PHASE2, discoveryPhaseUnlockLines({ phaseBefore: 1, phaseAfter: 2 }).join('|'));
        assert.equals(PHASE3, discoveryPhaseUnlockLines({ phaseBefore: 2, phaseAfter: 3 }).join('|'));
        assert.equals(`${PHASE2}|${PHASE3}`, discoveryPhaseUnlockLines({ phaseBefore: 1, phaseAfter: 3 }).join('|'));
    });

    suite.test('官職句：沒解鎖沙盤只有晉升句；有解鎖才多一句；多階各說一次', () => {
        assert.equals(0, officerPromotionScriptLines([]).length);
        assert.equals(PROMOTED, officerPromotionScriptLines([2]).join('|'));
        assert.equals(`${PROMOTED}|${SANDTABLE}`, officerPromotionScriptLines([3]).join('|'));
        assert.equals(`${PROMOTED}|${SANDTABLE}`, officerPromotionScriptLines([2, 3, 4]).join('|'));
    });

    return suite;
}
