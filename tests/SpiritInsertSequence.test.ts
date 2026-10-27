/**
 * SpiritInsertSequence.test.ts — 英靈插卡四段演出時間軸 headless 測試（TRP-18 / PROG-2-1306）
 *
 * 鎖住：四段依規格順序排列且首尾相接；播放頭在段落邊界上正確切換；
 * Sigil_Pattern_ID 不合規不組時間軸；同一家徽的四處檢查通過，混用或空值不通過。
 *
 * Unity 對照：像 Timeline 的播放頭，每個 frame 問「現在是哪一段」，邊界上只屬於下一段。
 */
import { assert, TestSuite } from './TestRunner';
import {
    buildSpiritInsertPlan,
    sameSigilFamily,
    SPIRIT_INSERT_STAGE_DURATION_MS,
    spiritInsertStageAt,
} from '../assets/scripts/core/systems/SpiritInsertSequence';

export function createSpiritInsertSequenceSuite(): TestSuite {
    const suite = new TestSuite('SpiritInsertSequence (英靈插卡四段演出 TRP-18 / PROG-2-1306)');

    suite.test('四段依規格順序排列，首尾相接，總長為各段加總', () => {
        const plan = buildSpiritInsertPlan('zhao-long');
        assert.isTrue(plan !== null);
        const ids = plan!.stages.map((s) => s.id);
        assert.equals('sigil-ignite,beast-shadow,spirit-face,army-enter', ids.join(','));
        for (let i = 1; i < plan!.stages.length; i++) {
            assert.equals(plan!.stages[i - 1].startMs + plan!.stages[i - 1].durationMs, plan!.stages[i].startMs);
        }
        const sum = Object.values(SPIRIT_INSERT_STAGE_DURATION_MS).reduce((a, b) => a + b, 0);
        assert.equals(sum, plan!.totalMs);
    });

    suite.test('播放頭在段落邊界上屬於下一段；尚未開始為 null；播完為 done', () => {
        const plan = buildSpiritInsertPlan('zhao-long')!;
        const second = plan.stages[1];
        assert.equals('sigil-ignite', spiritInsertStageAt(plan, 0)!);
        assert.equals('sigil-ignite', spiritInsertStageAt(plan, second.startMs - 1)!);
        assert.equals('beast-shadow', spiritInsertStageAt(plan, second.startMs)!);
        assert.isTrue(spiritInsertStageAt(plan, -1) === null);
        assert.equals('done', spiritInsertStageAt(plan, plan.totalMs)!);
    });

    suite.test('Sigil_Pattern_ID 不合規不組時間軸', () => {
        assert.isTrue(buildSpiritInsertPlan('') === null);
        assert.isTrue(buildSpiritInsertPlan('Zhao Long') === null);
        assert.isTrue(buildSpiritInsertPlan('../fx') === null);
    });

    suite.test('同一家徽的四處檢查通過；混用、空值或不合規 ID 不通過', () => {
        assert.isTrue(sameSigilFamily(['zhao-long', 'zhao-long', 'zhao-long', 'zhao-long']));
        assert.isFalse(sameSigilFamily(['zhao-long', 'guan-yu']));
        assert.isFalse(sameSigilFamily(['zhao-long', '']));
        assert.isFalse(sameSigilFamily([]));
        assert.isFalse(sameSigilFamily(['Zhao Long']));
    });

    return suite;
}
