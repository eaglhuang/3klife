/**
 * TallyFearCharge.test.ts — 虎符「鐵騎」恐懼衝鋒：攻擊時周圍敵軍士氣 -20（PROG-2-1514）
 */
import { Faction, TroopType } from '../assets/scripts/core/config/Constants';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { applyFearCharge, tallyDamageGuardOf, tallyDefenseMultiplierOf, tallyHealsAllies, tallySplashTargetsOf } from '../assets/scripts/battle/shared/TallyPassive';
import { MORALE_DURATION_TURNS } from '../assets/scripts/battle/shared/Morale';
import { TestSuite, assert } from './TestRunner';

function unitAt(id: string, faction: Faction, lane: number, depth: number, template?: string): TroopUnit {
    const u = new TroopUnit(id, TroopType.Cavalry, faction, { hp: 100, attack: 30, defense: 20, moveRange: 2, attackRange: 1 });
    u.moveTo(lane, depth);
    if (template) u.tallyTemplateId = template;
    return u;
}

export function createTallyFearChargeSuite(): TestSuite {
    const suite = new TestSuite('TallyFearCharge (鐵騎恐懼衝鋒 PROG-2-1514)');

    suite.test('周圍 1 格（含斜角）敵軍士氣 -20 並開始計時；遠處、友軍、先登不受影響', () => {
        const tieQi = unitAt('t', Faction.Player, 2, 3, 'tiger-tally-tie-qi');
        const near = unitAt('n', Faction.Enemy, 3, 4);
        const far = unitAt('f', Faction.Enemy, 2, 5);
        const ally = unitAt('a', Faction.Player, 2, 4);
        const xianDeng = unitAt('x', Faction.Enemy, 1, 4, 'tiger-tally-xian-deng');
        const affected = applyFearCharge(tieQi, [tieQi, near, far, ally, xianDeng]);
        assert.equals(1, affected.length);
        assert.equals(-20, near.morale);
        assert.equals(MORALE_DURATION_TURNS, near.moraleTurns);
        assert.equals(0, far.morale);
        assert.equals(0, ally.morale);
        assert.equals(0, xianDeng.morale);
    });

    suite.test('已有士氣的敵軍只扣減、不重設計時；非鐵騎攻擊無效果', () => {
        const tieQi = unitAt('t', Faction.Player, 2, 3, 'tiger-tally-tie-qi');
        const near = unitAt('n', Faction.Enemy, 2, 4);
        near.morale = 30;
        near.moraleTurns = 1;
        applyFearCharge(tieQi, [near]);
        assert.equals(10, near.morale);
        assert.equals(1, near.moraleTurns);
        assert.equals(0, applyFearCharge(unitAt('p', Faction.Player, 2, 3), [near]).length);
    });

    suite.test('大喬士氣不降（PROG-2-1525）：恐懼衝鋒不扣士氣', () => {
        const tieQi = unitAt('t', Faction.Player, 2, 3, 'tiger-tally-tie-qi');
        const daQiao = unitAt('d', Faction.Enemy, 2, 4, 'tiger-tally-da-qiao');
        daQiao.morale = 30;
        assert.equals(0, applyFearCharge(tieQi, [daQiao]).length);
        assert.equals(30, daQiao.morale);
    });

    suite.test('常山女治療友軍（PROG-2-1526）：只有常山女騎帶治療被動', () => {
        assert.isTrue(tallyHealsAllies(unitAt('c', Faction.Player, 0, 0, 'tiger-tally-changshan-nu')));
        assert.isTrue(!tallyHealsAllies(unitAt('t', Faction.Player, 0, 0, 'tiger-tally-tie-qi')));
        assert.isTrue(!tallyHealsAllies(unitAt('p', Faction.Player, 0, 0)));
    });

    suite.test('南蠻濺射（PROG-2-1527）：目標周圍 1 格其他敵軍、50%；友軍與遠處不波及', () => {
        const nanMan = unitAt('m', Faction.Player, 2, 3, 'tiger-tally-nan-man');
        const target = unitAt('t', Faction.Enemy, 2, 4);
        const side = unitAt('s', Faction.Enemy, 3, 5);
        const far = unitAt('f', Faction.Enemy, 2, 6);
        const ally = unitAt('a', Faction.Player, 1, 4);
        const { targets, ratio } = tallySplashTargetsOf(nanMan, target, [nanMan, target, side, far, ally]);
        assert.equals(0.5, ratio);
        assert.equals(1, targets.length);
        assert.equals('s', targets[0].id);
        assert.equals(0, tallySplashTargetsOf(unitAt('p', Faction.Player, 2, 3), target, [side]).targets.length);
    });

    suite.test('元戎範圍傷害（PROG-2-1528）：沿用濺射 1 格 50%', () => {
        const yuanRong = unitAt('y', Faction.Player, 2, 3, 'tiger-tally-yuan-rong');
        const target = unitAt('t', Faction.Enemy, 2, 4);
        const side = unitAt('s', Faction.Enemy, 1, 4);
        const { targets, ratio } = tallySplashTargetsOf(yuanRong, target, [target, side]);
        assert.equals(0.5, ratio);
        assert.equals(1, targets.length);
    });

    suite.test('白耳替主將承傷（PROG-2-1529）：主將周圍 1 格同陣營白耳才代傷', () => {
        const general = unitAt('g', Faction.Player, 2, 0);
        const baiEr = unitAt('b', Faction.Player, 3, 1, 'tiger-tally-bai-er');
        const farBaiEr = unitAt('fb', Faction.Player, 2, 3, 'tiger-tally-bai-er');
        const enemyBaiEr = unitAt('eb', Faction.Enemy, 1, 0, 'tiger-tally-bai-er');
        assert.equals('b', tallyDamageGuardOf(general, [general, enemyBaiEr, farBaiEr, baiEr], () => true)?.id);
        assert.equals(null, tallyDamageGuardOf(general, [general, enemyBaiEr, farBaiEr], () => true));
        assert.equals(null, tallyDamageGuardOf(general, [general, baiEr], () => false), '非主將不受白耳保護');
    });

    suite.test('惡來捨命護主（PROG-2-1530）：替周圍友軍承傷、自己不轉移；血低防高', () => {
        const eLai = unitAt('e', Faction.Player, 2, 2, 'tiger-tally-e-lai-fu');
        const ally = unitAt('a', Faction.Player, 3, 3);
        assert.equals('e', tallyDamageGuardOf(ally, [ally, eLai], () => false)?.id);
        assert.equals(null, tallyDamageGuardOf(eLai, [ally, eLai], () => false));
        assert.equals(1, tallyDefenseMultiplierOf(eLai));
        eLai.takeDamage(50);
        assert.equals(1.5, tallyDefenseMultiplierOf(eLai));
    });

    return suite;
}
