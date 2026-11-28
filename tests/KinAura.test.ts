/**
 * KinAura.test.ts — 兄弟齊心光環（羈絆戰場效果整併方案規格書 doc_spec_1358 §2.2 ②）
 * 切比雪夫距離 ≤ 3 格有、> 3 格無（含斜角）；3 位兄弟仍只 +25%；暴擊 +15%；狀態圖示。
 */
import { Faction } from '../assets/scripts/core/config/Constants';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { KIN_BATTLE_CONFIG } from '../assets/scripts/core/systems/KinBattleConfig';
import { chebyshevDistance, kinAuraUnitIds, type KinLevel } from '../assets/scripts/core/systems/KinBattleEffects';
import { STATUS_ICON_DEFS, computeUnitStatusIcons, emptyStatusContext } from '../assets/scripts/battle/shared/UnitStatusIcons';
import { COMRADE_PAIR, SWORN_PAIR, kinResolverOf, kinTroop, openKinBattle } from './KinTestFixtures';
import { TestSuite, assert } from './TestRunner';

const unit = (id: string, lane: number, depth: number, faction = 'player') => ({ id, faction, lane, depth, isDead: () => false });
const swornOnly = (a: string, b: string): KinLevel => ([a, b].every((x) => ['a', 'b', 'c'].includes(x)) ? 'SWORN' : 'NONE');

export function createKinAuraSuite(): TestSuite {
    const suite = new TestSuite('KinAura (兄弟齊心光環 doc_spec_1358)');

    suite.test('資料檔數值：半徑 3、攻防 +25%、暴擊 +15%', () => {
        assert.equals(3, KIN_BATTLE_CONFIG.aura.radius);
        assert.equals(0.25, KIN_BATTLE_CONFIG.aura.attackDefenseRatio);
        assert.equals(0.15, KIN_BATTLE_CONFIG.aura.critBonus);
    });

    suite.test('切比雪夫距離：斜角算 1 格', () => {
        assert.equals(1, chebyshevDistance(0, 0, 1, 1));
        assert.equals(3, chebyshevDistance(0, 0, 3, 2));
    });

    suite.test('距離 ≤ 3 有光環（含斜角）、> 3 無光環', () => {
        const near = kinAuraUnitIds([unit('a', 1, 1), unit('b', 4, 4)], swornOnly);
        assert.isTrue(near.has('a') && near.has('b'), '斜角 3 格有');
        const far = kinAuraUnitIds([unit('a', 0, 0), unit('b', 0, 4)], swornOnly);
        assert.equals(0, far.size, '4 格無');
    });

    suite.test('敵我陣營不互相提供；死亡的義兄弟不提供', () => {
        assert.equals(0, kinAuraUnitIds([unit('a', 1, 1), unit('b', 1, 2, 'enemy')], swornOnly).size);
        const dead = { id: 'b', faction: 'player', lane: 1, depth: 2, isDead: () => true };
        assert.equals(0, kinAuraUnitIds([unit('a', 1, 1), dead], swornOnly).size);
    });

    suite.test('戰友、非兄弟不提供光環', () => {
        const levelOf = (): KinLevel => 'COMRADE';
        assert.equals(0, kinAuraUnitIds([unit('a', 1, 1), unit('b', 1, 2)], levelOf).size);
    });

    suite.test('三位兄弟同在光環內：攻防仍只 ×1.25（同名只算一次）', () => {
        const ctrl = openKinBattle([SWORN_PAIR('a', 'b'), SWORN_PAIR('b', 'c'), SWORN_PAIR('a', 'c')]);
        const ua = kinTroop('ua', Faction.Player, 2, 1, 'a');
        const ub = kinTroop('ub', Faction.Player, 2, 2, 'b');
        const uc = kinTroop('uc', Faction.Player, 2, 3, 'c');
        for (const u of [ua, ub, uc]) ctrl.state.addUnit(u);
        const baseAttack = ua.getEffectiveAttack();
        const baseDefense = ua.getEffectiveDefense();
        ctrl.refreshKinAura();
        assert.isTrue(ua.kinAura && ub.kinAura && uc.kinAura);
        assert.equals(Math.round(baseAttack * 1.25 * 1000), Math.round(ua.getEffectiveAttack() * 1000));
        assert.equals(Math.round(baseDefense * 1.25 * 1000), Math.round(ua.getEffectiveDefense() * 1000));
    });

    suite.test('兄弟走遠（> 3 格）光環消失，走近恢復；敵軍部隊不受影響', () => {
        const ctrl = openKinBattle([SWORN_PAIR('a', 'b')]);
        const ua = kinTroop('ua', Faction.Player, 2, 1, 'a');
        const ub = kinTroop('ub', Faction.Player, 2, 6, 'b');
        const foe = kinTroop('foe', Faction.Enemy, 2, 4, 'a');
        for (const u of [ua, ub, foe]) ctrl.state.addUnit(u);
        ctrl.refreshKinAura();
        assert.isTrue(!ua.kinAura && !ub.kinAura, '相距 5 格');
        ub.moveTo(2, 4);
        ctrl.refreshKinAura();
        assert.isTrue(ua.kinAura && ub.kinAura, '相距 3 格');
        assert.isTrue(!foe.kinAura, '敵軍不吃羈絆表');
    });

    suite.test('戰友（非義兄弟）相鄰不給光環', () => {
        const ctrl = openKinBattle([COMRADE_PAIR('a', 'b')]);
        const ua = kinTroop('ua', Faction.Player, 2, 1, 'a');
        const ub = kinTroop('ub', Faction.Player, 2, 2, 'b');
        ctrl.state.addUnit(ua);
        ctrl.state.addUnit(ub);
        ctrl.refreshKinAura();
        assert.isTrue(!ua.kinAura && !ub.kinAura);
    });

    suite.test('暴擊 +15%：同一個擲骰 0.15，有光環暴擊（傷害 ×1.4 以上）、無光環不暴擊', () => {
        const run = (aura: boolean, roll: number): number => {
            const ctrl = openKinBattle(aura ? [SWORN_PAIR('a', 'b')] : []);
            const attacker = kinTroop('att', Faction.Player, 2, 2, aura ? 'a' : null);
            if (aura) ctrl.state.addUnit(kinTroop('bro', Faction.Player, 4, 1, 'b'));
            const target = kinTroop('tgt', Faction.Enemy, 2, 3, null, 100000);
            ctrl.state.addUnit(attacker);
            ctrl.state.addUnit(target);
            const resolver = kinResolverOf(ctrl);
            resolver.hitRandom = () => roll;
            resolver.resolveCombat(attacker, target, services());
            return target.maxHp - target.currentHp;
        };
        const noCrit = run(true, 0.3);
        const withCrit = run(true, 0.15);
        const plainAtRoll = run(false, 0.15);
        const plainNoCrit = run(false, 0.3);
        assert.isTrue(noCrit > plainNoCrit, `光環攻擊 +25% (${noCrit} vs ${plainNoCrit}, crit ${withCrit}/${plainAtRoll})`);
        assert.isTrue(withCrit >= Math.floor(noCrit * 1.4), `有光環 0.15 暴擊（${withCrit} vs ${noCrit}）`);
        assert.equals(plainNoCrit, plainAtRoll, '無光環 0.15 不暴擊（基礎暴擊率低於 15%）');
    });

    suite.test('狀態圖示：有光環顯示「義」', () => {
        const base = { attackBonus: 0, maxHpBonus: 0, shield: 0, morale: 0, moraleTurns: 0 };
        const none = computeUnitStatusIcons(base, emptyStatusContext());
        assert.isTrue(!none.icons.some((i) => i.kind === 'kin-aura'));
        const aura = computeUnitStatusIcons({ ...base, kinAura: true }, emptyStatusContext());
        assert.isTrue(aura.icons.some((i) => i.kind === 'kin-aura'));
        assert.equals('義', STATUS_ICON_DEFS['kin-aura'].glyph);
    });

    return suite;
}
