/**
 * TacticVfxGroups.test.ts — 戰法分組特效（火／水／風／回復／加速／鼓舞／控制）的分組對應與預算（PROG-2-10138）
 *
 * 鎖住：
 * - 代表性戰法歸到正確的組；純傷害（衝鋒、貫穿）不歸類，維持通用光效；
 * - 7 組都有配色與粒子量，七組主色互不相同（一眼可分），命中＋餘韻總長 ≤ 1.0 秒；
 * - 預算：同時特效數、同時粒子數有上限，超過縮減或略過；單次施放命中格去重並截到上限；
 * - 暫存命中格只留最新一筆、取走後清空、skillId 不符不取。
 */
import { assert, TestSuite } from './TestRunner';
import {
    TACTIC_VFX_BUDGET, TACTIC_VFX_GROUPS, TACTIC_VFX_RECIPES, capHitCells, grantTacticParticles,
    setPendingTacticHit, takePendingTacticHit, tacticHitTotalSec, tacticVfxGroupOf,
} from '../assets/scripts/battle/shared/TacticVfxGroups';

export function createTacticVfxGroupsSuite(): TestSuite {
    const suite = new TestSuite('TacticVfxGroups (戰法分組特效 PROG-2-10138)');

    suite.test('代表性戰法歸到正確的組', () => {
        assert.equals('fire', tacticVfxGroupOf('zhou-yu-inferno'));
        assert.equals('fire', tacticVfxGroupOf('tally-fire-chain'));
        assert.equals('fire', tacticVfxGroupOf('tally-fire-god-hunt'));
        assert.equals('water', tacticVfxGroupOf('sun-quan-tide'));
        assert.equals('wind', tacticVfxGroupOf('zhuge-liang-storm'));
        assert.equals('purify', tacticVfxGroupOf('medical-aid'));
        assert.equals('rally', tacticVfxGroupOf('liu-bei-rally'));
        assert.equals('haste', tacticVfxGroupOf('insp-haste'));
        assert.equals('rally', tacticVfxGroupOf('mentor-morale'));
        assert.equals('morale', tacticVfxGroupOf('eight-formation'));
        assert.equals('warcry', tacticVfxGroupOf('insp-taunt'));
        assert.equals('confuse', tacticVfxGroupOf('diao-chan-charm'));
        assert.equals('heal', tacticVfxGroupOf('xiahou-dun-eye-devour'));
        assert.equals('stun', tacticVfxGroupOf('tally-changban-root'));
    });

    suite.test('殼戰法與不存在的戰法不歸類（沿用通用光效；純傷害招式第二批已有分組）', () => {
        assert.equals(null, tacticVfxGroupOf('tally-nan-man')); // 殼 profile（效果未實作）沒有第二批分組
        assert.equals(null, tacticVfxGroupOf('no-such-skill'));
    });

    suite.test('7 組都有配方，主色互不相同，命中＋餘韻 ≤ 1.0 秒', () => {
        assert.equals(7, TACTIC_VFX_GROUPS.length);
        const seen = new Set<string>();
        for (const group of TACTIC_VFX_GROUPS) {
            const recipe = TACTIC_VFX_RECIPES[group];
            assert.isTrue(!!recipe, `${group} 缺配方`);
            assert.isTrue(recipe.particlesPerCell > 0 && recipe.windupParticles > 0, `${group} 粒子數必須為正`);
            assert.isTrue(tacticHitTotalSec(group) <= TACTIC_VFX_BUDGET.maxTotalSec + 1e-9, `${group} 命中＋餘韻超過上限`);
            seen.add(recipe.main.join(','));
        }
        assert.equals(7, seen.size);
    });

    suite.test('單組粒子量不超過全場預算的四分之一（單格不會獨佔預算）', () => {
        for (const group of TACTIC_VFX_GROUPS) {
            assert.isTrue(TACTIC_VFX_RECIPES[group].particlesPerCell <= TACTIC_VFX_BUDGET.maxParticles / 4, `${group} 單格粒子過多`);
        }
    });

    suite.test('預算核可：滿額略過、剩餘不足縮減', () => {
        assert.equals(10, grantTacticParticles(10, 0, 0));
        assert.equals(0, grantTacticParticles(10, TACTIC_VFX_BUDGET.maxFx, 0));
        assert.equals(0, grantTacticParticles(10, 1, TACTIC_VFX_BUDGET.maxParticles - 1));
        assert.equals(6, grantTacticParticles(10, 1, TACTIC_VFX_BUDGET.maxParticles - 6));
    });

    suite.test('連續塞入多次施放：同時粒子數永遠不超過上限', () => {
        let fx = 0;
        let particles = 0;
        for (let i = 0; i < 200; i++) {
            const g = grantTacticParticles(TACTIC_VFX_RECIPES.fire.particlesPerCell, fx, particles);
            if (g > 0) { fx++; particles += g; }
            assert.isTrue(particles <= TACTIC_VFX_BUDGET.maxParticles);
            assert.isTrue(fx <= TACTIC_VFX_BUDGET.maxFx);
        }
    });

    suite.test('命中格去重並截到單次上限，保持順序', () => {
        const cells = [{ lane: 0, depth: 1 }, { lane: 0, depth: 1 }, { lane: 1, depth: 1 }, { lane: 2, depth: 1 },
            { lane: 3, depth: 1 }, { lane: 4, depth: 1 }, { lane: 5, depth: 1 }, { lane: 6, depth: 1 }];
        const capped = capHitCells(cells);
        assert.equals(TACTIC_VFX_BUDGET.maxHitCellsPerCast, capped.length);
        assert.equals(0, capped[0].lane);
        assert.equals(1, capped[1].lane);
    });

    suite.test('暫存命中格：只留最新、取走清空、skillId 不符不取', () => {
        setPendingTacticHit({ skillId: 'a', group: 'fire', cells: [] });
        setPendingTacticHit({ skillId: 'b', group: 'heal', cells: [{ lane: 1, depth: 2 }] });
        assert.equals(null, takePendingTacticHit('a'));
        const hit = takePendingTacticHit('b');
        assert.equals('heal', hit?.group);
        assert.equals(null, takePendingTacticHit('b'));
    });

    return suite;
}
