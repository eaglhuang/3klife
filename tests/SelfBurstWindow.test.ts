/**
 * SelfBurstWindow.test.ts — 奧義自身爆發窗口（SYS-SKILL-ULT-0001）
 */
import * as fs from 'fs';
import * as path from 'path';
import { TestSuite, assert } from './TestRunner';
import {
    SELF_BURST_PARAMS,
    consumeSelfBurstExtraAction,
    isSelfBurstControlImmune,
    selfBurstAttackMultiplier,
    selfBurstCritBonus,
    selfBurstPhaseOf,
    startSelfBurst,
    tickSelfBurst,
} from '../assets/scripts/battle/shared/SelfBurstWindow';

export function createSelfBurstWindowSuite(): TestSuite {
    const suite = new TestSuite('SelfBurstWindow (奧義自身爆發 SYS-SKILL-ULT-0001)');

    suite.test('開始、持續、結束三段：關羽戰神 3 回合 ×2，結束當回合回報 ended 後倍率回 1', () => {
        let w = startSelfBurst(null, 'ult-guan-yu-5');
        assert.equals('active', selfBurstPhaseOf(w));
        assert.equals(2, selfBurstAttackMultiplier(w));
        let t = tickSelfBurst(w);
        assert.equals('active', t.phase);
        t = tickSelfBurst(t.window);
        assert.equals('active', t.phase);
        t = tickSelfBurst(t.window);
        assert.equals('ended', t.phase);
        w = t.window;
        assert.equals(null, w);
        assert.equals(1, selfBurstAttackMultiplier(w));
        assert.equals('inactive', tickSelfBurst(w).phase);
    });

    suite.test('再行動不能無限連鎖：趙雲窗口只給 1 次，重複施放刷新也不補', () => {
        let w = startSelfBurst(null, 'ult-zhao-yun-1');
        const first = consumeSelfBurstExtraAction(w);
        assert.isTrue(first.allowed);
        w = first.window;
        assert.isFalse(consumeSelfBurstExtraAction(w).allowed);
        w = startSelfBurst(w, 'ult-zhao-yun-1');
        assert.isFalse(consumeSelfBurstExtraAction(w).allowed);
        assert.isFalse(consumeSelfBurstExtraAction(startSelfBurst(null, 'ult-guan-yu-5')).allowed);
    });

    suite.test('免控只在窗口期間生效；張飛暴擊加成到期歸零；非爆發奧義不開窗', () => {
        let w = startSelfBurst(null, 'ult-zhao-yun-1');
        assert.isTrue(isSelfBurstControlImmune(w));
        w = tickSelfBurst(tickSelfBurst(w).window).window;
        assert.isFalse(isSelfBurstControlImmune(w));
        assert.isFalse(isSelfBurstControlImmune(startSelfBurst(null, 'ult-guan-yu-5')));
        const zf = startSelfBurst(null, 'ult-zhang-fei-2');
        assert.equals(0.3, selfBurstCritBonus(zf));
        assert.equals(0, selfBurstCritBonus(tickSelfBurst(tickSelfBurst(zf).window).window));
        assert.equals(null, startSelfBurst(null, 'ult-diao-chan-1'));
    });

    suite.test('重複施放刷新：回合取長、倍率取高', () => {
        const lu = startSelfBurst(null, 'ult-lu-bu-3');
        const ticked = tickSelfBurst(lu).window;
        const refreshed = startSelfBurst(ticked, 'ult-guan-yu-5');
        assert.equals(SELF_BURST_PARAMS['ult-guan-yu-5'].durationTurns, refreshed!.remainingTurns);
        assert.equals(2, refreshed!.attackMultiplier);
    });

    suite.test('參數表每一筆都對得到 self-burst 家族的奧義', () => {
        const raw = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../assets/resources/data/master/ultimate-definitions.json'), 'utf8'));
        const list: Array<{ id: string; family?: string }> = raw.data ?? raw;
        for (const id of Object.keys(SELF_BURST_PARAMS)) {
            assert.equals('self-burst', list.find((u) => u.id === id)?.family, id);
        }
    });

    return suite;
}
