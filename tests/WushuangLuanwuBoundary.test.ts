/**
 * 無雙亂舞邊界組合測試（PROG-2-0632，補 PROG-2-0799 的多目標／受阻／友軍情境）
 */
import { Faction } from '../assets/scripts/core/config/Constants';
import { PushSkillResolver } from '../assets/scripts/battle/skills/resolvers/PushSkillResolver';
import { BattleSkillTargetMode, BattleSkillTiming, SkillSourceType } from '../assets/scripts/shared/SkillRuntimeContract';
import { TestSuite, assert } from './TestRunner';
import { createBattleSkillTestContext, createTestGeneral, createTestUnit } from './BattleSkillTestUtils';

const request = {
    sourceType: SkillSourceType.TigerTally,
    ownerUid: Faction.Player,
    battleSkillId: 'tally-wushuang',
    targetMode: BattleSkillTargetMode.AroundSelf,
    timing: BattleSkillTiming.ActiveCast,
};

type Move = { id: string; lane: number; depth: number };

function run(units: ReturnType<typeof createTestUnit>[], free: (lane: number, depth: number) => boolean = () => true) {
    const bundle = createBattleSkillTestContext({
        playerGeneral: createTestGeneral('wushuang', Faction.Player),
        enemyGeneral: createTestGeneral('enemy-general', Faction.Enemy),
        units,
    });
    const moves: Move[] = [];
    const context = {
        ...bundle.context,
        getCasterCell: () => ({ lane: 2, depth: 4 }),
        isCellFreeForPush: free,
        pushUnitTo: (unit: { id: string }, lane: number, depth: number) => { moves.push({ id: unit.id, lane, depth }); },
    };
    const result = new PushSkillResolver().execute(request as never, context as never);
    return { bundle, moves, result };
}

export function createWushuangLuanwuBoundarySuite(): TestSuite {
    const suite = new TestSuite('WushuangLuanwu 邊界組合 (PROG-2-0632)');

    suite.test('多目標混合：致死者不擊退、存活者受傷並擊退，兩者都有傷害紀錄', () => {
        const doomed = createTestUnit('doomed', Faction.Enemy, 2, 5, { hp: 1 });
        const sturdy = createTestUnit('sturdy', Faction.Enemy, 3, 4, { hp: 5000 });
        const { bundle, moves, result } = run([doomed, sturdy]);
        assert.isTrue(result.applied);
        assert.equals(2, bundle.damageLog.length);
        assert.isTrue(doomed.isDead());
        assert.isFalse(sturdy.isDead());
        assert.equals(1, moves.length);
        assert.equals('sturdy', moves[0].id);
        assert.equals(4, moves[0].lane, '從施放者(2,4)向 lane+ 方向被推開');
    });

    suite.test('周身八格全是敵軍：八個都受傷，且都被推離中心一格', () => {
        const units = [];
        for (let lane = 1; lane <= 3; lane += 1) {
            for (let depth = 3; depth <= 5; depth += 1) {
                if (lane === 2 && depth === 4) continue;
                units.push(createTestUnit(`e-${lane}-${depth}`, Faction.Enemy, lane, depth, { hp: 5000 }));
            }
        }
        const { bundle, moves } = run(units);
        assert.equals(8, bundle.damageLog.length);
        assert.equals(8, moves.length);
        for (const move of moves) {
            const distance = Math.max(Math.abs(move.lane - 2), Math.abs(move.depth - 4));
            assert.equals(2, distance, `${move.id} 應離中心 2 格`);
        }
    });

    suite.test('友軍站在周身：不受傷、不位移', () => {
        const ally = createTestUnit('ally', Faction.Player, 2, 5, { hp: 1000 });
        const foe = createTestUnit('foe', Faction.Enemy, 1, 4, { hp: 5000 });
        const { bundle, moves } = run([ally, foe]);
        assert.equals(1, bundle.damageLog.length);
        assert.equals('foe', bundle.damageLog[0].unitId);
        assert.equals(1000, ally.currentHp);
        assert.equals(1, moves.length);
        assert.equals('foe', moves[0].id);
    });

    suite.test('擊退被擋：先吃技能傷害，再吃受阻傷害，位置不變', () => {
        const foe = createTestUnit('foe', Faction.Enemy, 2, 5, { hp: 5000 });
        const { bundle, moves, result } = run([foe], () => false);
        assert.isTrue(result.applied);
        assert.equals(0, moves.length, '擋住就不位移');
        assert.equals(2, bundle.damageLog.length, '技能傷害 + 受阻傷害');
        const blocked = result.deltas.filter((d) => d.notes === 'push-blocked');
        assert.equals(1, blocked.length);
        assert.equals(250, bundle.damageLog[1].damage, '受阻 1 步 = 最大 HP 5%');
    });

    suite.test('技能傷害後只剩殘血又被擋住：受阻傷害可補刀，不報錯', () => {
        const probe = createTestUnit('probe', Faction.Enemy, 2, 5, { hp: 100000 });
        const skillDamage = run([probe]).bundle.damageLog[0].damage;
        const foe = createTestUnit('foe', Faction.Enemy, 2, 5, { hp: skillDamage + 1 });
        const { bundle, result } = run([foe], () => false);
        assert.isTrue(result.applied);
        assert.isTrue(foe.isDead(), '殘血 1 點，被擋的受阻傷害補刀');
        assert.equals(2, bundle.damageLog.length);
    });

    suite.test('施放者主將缺席：不結算傷害，仍按舊規則擊退', () => {
        const foe = createTestUnit('foe', Faction.Enemy, 2, 5, { hp: 1000 });
        const bundle = createBattleSkillTestContext({ enemyGeneral: createTestGeneral('enemy-general', Faction.Enemy), units: [foe] });
        const moves: Move[] = [];
        const context = {
            ...bundle.context,
            getCasterCell: () => ({ lane: 2, depth: 4 }),
            isCellFreeForPush: () => true,
            pushUnitTo: (unit: { id: string }, lane: number, depth: number) => { moves.push({ id: unit.id, lane, depth }); },
        };
        const result = new PushSkillResolver().execute(request as never, context as never);
        assert.isTrue(result.applied);
        assert.equals(0, bundle.damageLog.length);
        assert.equals(1, moves.length);
    });

    suite.test('敵方施放：陣營對調，打的是玩家軍', () => {
        const mine = createTestUnit('mine', Faction.Player, 2, 5, { hp: 5000 });
        const bundle = createBattleSkillTestContext({
            playerGeneral: createTestGeneral('p', Faction.Player),
            enemyGeneral: createTestGeneral('e', Faction.Enemy),
            units: [mine],
        });
        const moves: Move[] = [];
        const context = {
            ...bundle.context,
            getCasterCell: () => ({ lane: 2, depth: 4 }),
            isCellFreeForPush: () => true,
            pushUnitTo: (unit: { id: string }, lane: number, depth: number) => { moves.push({ id: unit.id, lane, depth }); },
        };
        const enemyRequest = { ...request, ownerUid: Faction.Enemy };
        const result = new PushSkillResolver().execute(enemyRequest as never, context as never);
        assert.isTrue(result.applied);
        assert.equals(Faction.Enemy, bundle.damageLog[0].casterFaction);
        assert.equals('mine', moves[0].id);
    });

    return suite;
}
