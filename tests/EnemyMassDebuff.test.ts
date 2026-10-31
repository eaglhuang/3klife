/**
 * EnemyMassDebuff.test.ts — 奧義敵方全體減益（SYS-SKILL-ULT-0004）
 */
import { StatusEffect } from '../assets/scripts/shared/CommonEnums';
import { TestSuite, assert } from './TestRunner';
import {
    ENEMY_MASS_DEBUFF_PARAMS,
    dispelPick,
    enemyMassDebuffNoticeText,
    massDebuffAccuracyDelta,
    massDebuffDotDamage,
    massDebuffStatusesFor,
    massDebuffTargets,
    startEnemyMassDebuff,
    tickEnemyMassDebuff,
    type MassDebuffTarget,
} from '../assets/scripts/battle/shared/EnemyMassDebuff';

function u(id: string, dead = false, effects: StatusEffect[] = []): MassDebuffTarget {
    return { id, isDead: () => dead, effects };
}

export function createEnemyMassDebuffSuite(): TestSuite {
    const suite = new TestSuite('EnemyMassDebuff (奧義敵方全體減益 SYS-SKILL-ULT-0004)');

    suite.test('目標完整：全體排除死亡與無敵，且與輸入順序無關', () => {
        const p = ENEMY_MASS_DEBUFF_PARAMS['ult-zhou-yu-1'];
        const a = massDebuffTargets([u('c'), u('a'), u('x', true), u('b', false, [StatusEffect.Invincible])], p);
        const b = massDebuffTargets([u('a'), u('b', false, [StatusEffect.Invincible]), u('x', true), u('c')], p);
        assert.equals('a,c', a.map((t) => t.id).join(','));
        assert.equals('a,c', b.map((t) => t.id).join(','));
    });

    suite.test('郭嘉奇策連環：3 名目標輪流拿不同減益', () => {
        const p = ENEMY_MASS_DEBUFF_PARAMS['ult-guo-jia-3'];
        const ts = massDebuffTargets([u('a'), u('b'), u('c'), u('d')], p, 0.5);
        assert.equals('c,d,a', ts.map((t) => t.id).join(','));
        assert.equals('slow|weak|rooted', [0, 1, 2].map((i) => massDebuffStatusesFor(p, i).join('')).join('|'));
    });

    suite.test('刷新規則：重複施放取較強值並受上限約束', () => {
        let d = startEnemyMassDebuff(null, 'ult-zhou-yu-1');
        d = startEnemyMassDebuff(d, 'ult-diao-chan-5');
        assert.equals(0.05, d!.dotPct);
        assert.equals(2, d!.turnsLeft);
        d = startEnemyMassDebuff(d, 'ult-diao-chan-3');
        assert.equals(-0.25, massDebuffAccuracyDelta(d));
        assert.equals(50, massDebuffDotDamage(d, 1000));
        assert.equals(null, startEnemyMassDebuff(null, 'ult-sima-yi-4'));
    });

    suite.test('持續：倒數到 0 結束', () => {
        const d = startEnemyMassDebuff(null, 'ult-guo-jia-5');
        const t1 = tickEnemyMassDebuff(d);
        assert.equals('active', t1.phase);
        assert.equals('ended', tickEnemyMassDebuff(t1.debuff).phase);
        assert.equals('none', tickEnemyMassDebuff(null).phase);
    });

    suite.test('驅散只清白名單正面狀態，不碰無敵與負面', () => {
        const out = dispelPick([StatusEffect.Invincible, StatusEffect.Weak, StatusEffect.Fortified, StatusEffect.Haste]);
        assert.equals('haste,fortified', out.join(','));
    });

    suite.test('戰報摘要', () => {
        const d = startEnemyMassDebuff(null, 'ult-zhang-fei-4');
        assert.equals('敵方全體受減益：攻擊 ×0.8（2 回合）', enemyMassDebuffNoticeText({ faction: 'enemy', phase: 'started', debuff: d }, false));
        assert.equals('我方全體減益解除', enemyMassDebuffNoticeText({ faction: 'player', phase: 'ended', debuff: null }, true));
    });

    return suite;
}
