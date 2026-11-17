import { EVENT_NAMES, Faction, GAME_CONFIG, TroopType } from '../assets/scripts/core/config/Constants';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { BattleState } from '../assets/scripts/battle/models/BattleState';
import { BattleCombatResolver, generalMinDamage, type BattleCombatAction } from '../assets/scripts/battle/runtime/BattleCombatResolver';
import { executeBattleCombatPhase } from '../assets/scripts/battle/runtime/phases/BattleCombatPhase';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { TestSuite, assert } from './TestRunner';

function createGeneral(id: string, faction: Faction, skillId: string): GeneralUnit {
    return new GeneralUnit({
        id,
        name: id,
        faction,
        hp: 1000,
        maxSp: 100,
        initialSp: 100,
        str: 100,
        int: 90,
        lea: 90,
        luk: 0,
        skillId,
        battlePrimarySkillId: skillId,
    });
}

function createTroop(id: string, faction: Faction, attackRange: number): TroopUnit {
    const unit = new TroopUnit(id, TroopType.Infantry, faction, {
        hp: 100,
        attack: 30,
        defense: 10,
        moveRange: 0,
        attackRange,
    });
    unit.moveTo(2, faction === Faction.Player ? 2 : 3);
    return unit;
}

export function createBattleCombatRegressionSuite(): TestSuite {
    const suite = new TestSuite('BattleCombatRegression');

    suite.test('executeBattleCombatPhase：已死亡 attacker 不應排入攻擊或後續處理', () => {
        services().initialize();
        const state = new BattleState();

        const deadAttacker = createTroop('dead-attacker', Faction.Player, 1);
        deadAttacker.currentHp = 0;
        const idleDefender = createTroop('idle-defender', Faction.Enemy, 0);

        state.addUnit(deadAttacker);
        state.addUnit(idleDefender);

        const counters = {
            build: 0,
            damageGeneral: 0,
            resolve: 0,
            reset: 0,
            generalKilled: 0,
            unitKilled: 0,
        };

        executeBattleCombatPhase({
            state,
            actingFaction: Faction.Player,
            playerGeneralUnitId: null,
            enemyGeneralUnitId: null,
            buildAttackAction: (unit) => {
                counters.build += 1;
                if (unit.id === deadAttacker.id) {
                    return { attackerId: deadAttacker.id, targetId: idleDefender.id };
                }
                return null;
            },
            damageEnemyGeneral: () => {
                counters.damageGeneral += 1;
            },
            resolveCombat: () => {
                counters.resolve += 1;
            },
            advanceAfterKill: () => {},
            resolveActionResetAfterAttack: () => {
                counters.reset += 1;
            },
            onGeneralUnitKilled: () => {
                counters.generalKilled += 1;
            },
            onUnitKilled: () => {
                counters.unitKilled += 1;
            },
        });

        assert.equals(0, counters.build);
        assert.equals(0, counters.damageGeneral);
        assert.equals(0, counters.resolve);
        assert.equals(0, counters.reset);
        assert.equals(0, counters.generalKilled);
        assert.equals(0, counters.unitKilled);
    });

    // 使用者 2026-11-17（PROG-2-9397）：擊殺後不踏進空出的格子，下一次行動才前進
    suite.test('executeBattleCombatPhase：擊殺後留在原格，空出的格子不佔位', () => {
        services().initialize();
        const state = new BattleState();
        const attacker = createTroop('advance-attacker', Faction.Player, 1);
        const defender = createTroop('advance-defender', Faction.Enemy, 0);
        defender.currentHp = 1;

        state.addUnit(attacker);
        state.addUnit(defender);

        const resolver = new BattleCombatResolver({
            state,
            getPlayerGeneralUnitId: () => null,
            getEnemyGeneralUnitId: () => null,
            setPlayerGeneralUnitId: () => {},
            setEnemyGeneralUnitId: () => {},
        });

        executeBattleCombatPhase({
            state,
            actingFaction: Faction.Player,
            playerGeneralUnitId: null,
            enemyGeneralUnitId: null,
            buildAttackAction: (unit, options) => resolver.buildAttackAction(unit, options),
            damageEnemyGeneral: () => {},
            resolveCombat: (attackUnit, defendUnit, svc) => resolver.resolveCombat(attackUnit, defendUnit, svc),
            advanceAfterKill: (unit, svc) => resolver.advanceAfterKill(unit, svc),
            resolveActionResetAfterAttack: (unit, didKill, actions) => resolver.resolveActionResetAfterAttack(unit, didKill, actions),
            onGeneralUnitKilled: (faction, svc) => resolver.onGeneralUnitKilled(faction, svc),
            onUnitKilled: (unit, killer, svc) => resolver.onUnitKilled(unit, killer, svc),
        });

        assert.equals(attacker.id, state.getCell(2, 2)?.occupantId ?? null);
        assert.equals(null, state.getCell(2, 3)?.occupantId ?? null);
        assert.equals(2, attacker.lane);
        assert.equals(2, attacker.depth);
        assert.isFalse(state.units.has(defender.id));
    });

    suite.test('resolveActionResetAfterAttack：已死亡 attacker 不應再產生 follow-up action', () => {
        services().initialize();
        const state = new BattleState();
        const attacker = createTroop('reset-attacker', Faction.Player, 1);
        attacker.currentHp = 0;
        state.addUnit(attacker);
        state.setActionReset({
            unitUid: attacker.id,
            battleSkillId: 'wei-zhen-reset',
            firstHitMultiplier: 2,
            firstHitPending: true,
            remainingExtraActions: 2,
        });

        const resolver = new BattleCombatResolver({
            state,
            getPlayerGeneralUnitId: () => null,
            getEnemyGeneralUnitId: () => null,
            setPlayerGeneralUnitId: () => {},
            setEnemyGeneralUnitId: () => {},
        });

        const actions: BattleCombatAction[] = [];
        resolver.resolveActionResetAfterAttack(attacker, true, actions);

        assert.equals(0, actions.length);
        assert.equals(null, state.getActionReset(attacker.id));
    });

    suite.test('buildAttackAction：弓兵可穿過前排友軍鎖定兩格外敵軍', () => {
        services().initialize();
        const state = new BattleState();
        const resolver = new BattleCombatResolver({
            state,
            getPlayerGeneralUnitId: () => null,
            getEnemyGeneralUnitId: () => null,
            setPlayerGeneralUnitId: () => {},
            setEnemyGeneralUnitId: () => {},
        });

        const archer = new TroopUnit('player-archer', TroopType.Archer, Faction.Player, {
            hp: 80,
            attack: 30,
            defense: 15,
            moveRange: 0,
            attackRange: 2,
        });
        archer.moveTo(2, 2);

        const allyFront = new TroopUnit('player-front', TroopType.Infantry, Faction.Player, {
            hp: 100,
            attack: 30,
            defense: 10,
            moveRange: 0,
            attackRange: 1,
        });
        allyFront.moveTo(2, 3);

        const enemyBack = new TroopUnit('enemy-back', TroopType.Infantry, Faction.Enemy, {
            hp: 100,
            attack: 30,
            defense: 10,
            moveRange: 0,
            attackRange: 1,
        });
        enemyBack.moveTo(2, 4);

        state.addUnit(archer);
        state.addUnit(allyFront);
        state.addUnit(enemyBack);

        const action = resolver.buildAttackAction(archer);

        assert.isDefined(action);
        assert.equals(enemyBack.id, action!.targetId);
    });

    suite.test('buildAttackAction：小兵不打旁邊的敵軍，武將棋子經過旁邊才會打（PROG-2-9336）', () => {
        services().initialize();
        const make = (id: string, faction: Faction, lane: number, depth: number): TroopUnit => {
            const unit = new TroopUnit(id, TroopType.Infantry, faction, { hp: 100, attack: 30, defense: 10, moveRange: 0, attackRange: 1 });
            unit.moveTo(lane, depth);
            return unit;
        };
        const targetOf = (attackerIsGeneral: boolean, enemyLane: number, enemyDepth: number): string | null => {
            const state = new BattleState();
            const resolver = new BattleCombatResolver({
                state,
                getPlayerGeneralUnitId: () => (attackerIsGeneral ? 'mover' : null),
                getEnemyGeneralUnitId: () => null,
                setPlayerGeneralUnitId: () => {},
                setEnemyGeneralUnitId: () => {},
            });
            const mover = make('mover', Faction.Player, 2, 3);
            state.addUnit(mover);
            state.addUnit(make('foe', Faction.Enemy, enemyLane, enemyDepth));
            const action = resolver.buildAttackAction(mover);
            return action && action.targetId === 'foe' ? 'foe' : null;
        };
        assert.equals(null, targetOf(false, 3, 3), '小兵：側面的敵軍不打');
        assert.equals(null, targetOf(false, 3, 4), '小兵：斜前方的敵軍不打');
        assert.equals('foe', targetOf(false, 2, 4), '小兵：同一路正面照打');
        assert.equals('foe', targetOf(true, 3, 3), '武將棋子：側面的小兵會打');
        assert.equals('foe', targetOf(true, 3, 4), '武將棋子：斜前方的小兵會打');
    });

    suite.test('buildAttackAction：小兵會主動打旁邊的敵方武將棋子（PROG-2-9340）', () => {
        services().initialize();
        const targetOf = (foeIsGeneral: boolean, enemyLane: number, enemyDepth: number): string | null => {
            const state = new BattleState();
            const resolver = new BattleCombatResolver({
                state,
                getPlayerGeneralUnitId: () => null,
                getEnemyGeneralUnitId: () => (foeIsGeneral ? 'foe' : null),
                setPlayerGeneralUnitId: () => {},
                setEnemyGeneralUnitId: () => {},
            });
            const make = (id: string, faction: Faction, lane: number, depth: number): TroopUnit => {
                const unit = new TroopUnit(id, TroopType.Infantry, faction, { hp: 100, attack: 30, defense: 10, moveRange: 0, attackRange: 1 });
                unit.moveTo(lane, depth);
                return unit;
            };
            const mover = make('mover', Faction.Player, 2, 3);
            state.addUnit(mover);
            state.addUnit(make('foe', Faction.Enemy, enemyLane, enemyDepth));
            const action = resolver.buildAttackAction(mover);
            return action && action.targetId === 'foe' ? 'foe' : null;
        };
        assert.equals('foe', targetOf(true, 3, 3), '側面的敵方武將：小兵主動打');
        assert.equals('foe', targetOf(true, 3, 4), '斜前方的敵方武將：小兵主動打');
        assert.equals(null, targetOf(true, 4, 3), '隔一路的敵方武將：打不到');
        assert.equals(null, targetOf(false, 3, 3), '側面的敵方小兵：仍然不打');
    });

    suite.test('BattleController：技能傷害打死武將化身時應清除 general unit id', () => {
        services().initialize();
        const ctrl = new BattleController();
        const playerGeneral = createGeneral('guan-yu', Faction.Player, 'guan-yu-slash');
        const enemyGeneral = createGeneral('sima-yi', Faction.Enemy, 'sima-yi-shadow');
        ctrl.initBattle(playerGeneral, enemyGeneral);

        playerGeneral.currentHp = 1;
        assert.equals('ok', ctrl.startGeneralDuel());
        const generalUnit = ctrl.placeGeneralOnBoard(2, 2);
        assert.isDefined(generalUnit);

        enemyGeneral.currentSp = enemyGeneral.maxSp;
        ctrl.advanceTurn();

        assert.equals(null, ctrl.playerGeneralUnitId);
        assert.isFalse(ctrl.state.units.has(generalUnit!.id));
    });

    suite.test('BattleController：enemy turn finalize 應延後到 resolve 後再執行', () => {
        services().initialize();
        const ctrl = new BattleController();
        const playerGeneral = createGeneral('guan-yu', Faction.Player, 'guan-yu-slash');
        const enemyGeneral = createGeneral('sima-yi', Faction.Enemy, 'sima-yi-shadow');
        ctrl.initBattle(playerGeneral, enemyGeneral);

        const originalNextTurn = services().battle.nextTurn;
        let nextTurnCalls = 0;
        services().battle.nextTurn = (() => {
            nextTurnCalls += 1;
        }) as never;

        try {
            ctrl.resolveEnemyTurn();
            assert.equals(0, nextTurnCalls);

            ctrl.finalizeEnemyTurn();
            assert.equals(1, nextTurnCalls);
        } finally {
            services().battle.nextTurn = originalNextTurn;
        }
    });

    suite.test('BattleController：advanceTurn 的 nextTurn 也應延後到 finalize 之後', () => {
        services().initialize();
        const ctrl = new BattleController();
        const playerGeneral = createGeneral('guan-yu', Faction.Player, 'guan-yu-slash');
        const enemyGeneral = createGeneral('sima-yi', Faction.Enemy, 'sima-yi-shadow');
        ctrl.initBattle(playerGeneral, enemyGeneral);

        const originalNextTurn = services().battle.nextTurn;
        let nextTurnCalls = 0;
        services().battle.nextTurn = (() => {
            nextTurnCalls += 1;
        }) as never;

        try {
            ctrl.advanceTurn();
            assert.equals(0, nextTurnCalls);

            ctrl.finalizeAdvanceTurn();
            assert.equals(1, nextTurnCalls);
        } finally {
            services().battle.nextTurn = originalNextTurn;
        }
    });

    suite.test('damageEnemyGeneral：對主將傷害為整數且至少 1（PROG-2-9304）', () => {
        services().initialize();
        const fixture = createGeneralDamageFixture(40, 92);
        const before = fixture.general.currentHp;
        fixture.resolver.damageEnemyGeneral(fixture.attacker, fixture.svc);
        const damage = before - fixture.general.currentHp;
        assert.equals(Math.round(damage), damage, '主將 HP 扣減不得有小數');
        assert.greaterOrEqual(1, damage);
        // 騎兵攻 40 × 管線乘數 1.5 − 主將防禦（統率 92 × 0.3 = 27.6）→ floor(32.4) = 32
        assert.equals(32, damage);

        const weak = createGeneralDamageFixture(1, 92);
        const weakBefore = weak.general.currentHp;
        weak.resolver.damageEnemyGeneral(weak.attacker, weak.svc);
        assert.equals(1, weakBefore - weak.general.currentHp, '攻擊不足以破防時仍至少扣 1');
    });

    suite.test('damageEnemyGeneral：破防不足時保底打出攻擊力的兩成（PROG-2-9318）', () => {
        services().initialize();
        // 攻 20 × 1.5 − 27.6 = 2.4 → 管線只剩 2；保底 round(20 × 0.2) = 4
        const fixture = createGeneralDamageFixture(20, 92);
        const before = fixture.general.currentHp;
        fixture.resolver.damageEnemyGeneral(fixture.attacker, fixture.svc);
        assert.equals(4, before - fixture.general.currentHp);
        assert.equals(1, generalMinDamage(2), '攻擊力很低時保底仍至少 1');
        assert.equals(8, generalMinDamage(40));
    });

    suite.test('造成傷害也給 SP：打主將與打部隊各給一次，打自己人不給（PROG-2-9321）', () => {
        services().initialize();
        const fixture = createGeneralDamageFixture(40, 92);
        const mine = new GeneralUnit({ id: 'sp-owner', name: 'sp-owner', faction: Faction.Player, hp: 1000, maxSp: 100, initialSp: 0,
            str: 80, int: 80, lea: 80, luk: 0, skillId: 'sima-yi-shadow', battlePrimarySkillId: 'sima-yi-shadow' });
        (fixture.resolver as unknown as { context: { state: BattleState } }).context.state.playerGeneral = mine;
        fixture.resolver.damageEnemyGeneral(fixture.attacker, fixture.svc);
        assert.equals(GAME_CONFIG.spPerDamagingHit, mine.currentSp, '打主將');
        const victim = new TroopUnit('sp-victim', TroopType.Infantry, Faction.Enemy, { hp: 100, attack: 10, defense: 0, moveRange: 0, attackRange: 1 });
        const hit = { attackerId: fixture.attacker.id, attackerLane: 2, attackerDepth: 2, allowDamageLink: false };
        fixture.resolver.applyUnitDamage(victim, 5, Faction.Player, hit);
        assert.equals(GAME_CONFIG.spPerDamagingHit * 2, mine.currentSp, '打部隊');
        fixture.resolver.applyUnitDamage(fixture.attacker, 5, Faction.Player, hit);
        assert.equals(GAME_CONFIG.spPerDamagingHit * 2, mine.currentSp, '打到自己人不給');
    });

    suite.test('damageEnemyGeneral：關閉管線時維持舊行為，只多了取整（PROG-2-9304）', () => {
        services().initialize();
        const original = GAME_CONFIG.generalDamageUsesUnitPipeline;
        GAME_CONFIG.generalDamageUsesUnitPipeline = false;
        try {
            // 士氣 3 → 攻擊力 40 × 1.03 = 41.2，舊行為直接扣 41.2；取整後為 41
            const fixture = createGeneralDamageFixture(40, 92, 3);
            const before = fixture.general.currentHp;
            fixture.resolver.damageEnemyGeneral(fixture.attacker, fixture.svc);
            assert.equals(41, before - fixture.general.currentHp);
        } finally {
            GAME_CONFIG.generalDamageUsesUnitPipeline = original;
        }
    });

    suite.test('damageEnemyGeneral：開啟管線時防禦高的主將受傷較低（PROG-2-9304）', () => {
        services().initialize();
        const tough = createGeneralDamageFixture(40, 96);
        const frail = createGeneralDamageFixture(40, 40);
        const toughBefore = tough.general.currentHp;
        const frailBefore = frail.general.currentHp;
        tough.resolver.damageEnemyGeneral(tough.attacker, tough.svc);
        frail.resolver.damageEnemyGeneral(frail.attacker, frail.svc);
        const toughDamage = toughBefore - tough.general.currentHp;
        const frailDamage = frailBefore - frail.general.currentHp;
        assert.isTrue(toughDamage < frailDamage, `統率 96 應比統率 40 受傷少（${toughDamage} vs ${frailDamage}）`);
    });

    suite.test('damageEnemyGeneral：暴擊時 GeneralDamaged 的 isCrit 為 true（PROG-2-9304）', () => {
        services().initialize();
        const fixture = createGeneralDamageFixture(40, 92);
        fixture.resolver.hitRandom = () => 0;
        const payloads: Array<{ isCrit?: boolean; damage?: number }> = [];
        const off = services().event.on(EVENT_NAMES.GeneralDamaged, (d: unknown) => {
            payloads.push(d as { isCrit?: boolean; damage?: number });
        });
        try {
            fixture.resolver.damageEnemyGeneral(fixture.attacker, fixture.svc);
        } finally {
            off();
        }
        assert.equals(1, payloads.length);
        assert.isTrue(payloads[0].isCrit === true, '暴擊應寫入 isCrit');
    });

    return suite;
}

/** 部隊打主將的測試夾具：固定閃避不觸發、統率可指定；回傳的 svc 只覆寫 rollDodge */
function createGeneralDamageFixture(attackerAttack: number, generalLea: number, morale = 0) {
    const state = new BattleState();
    const general = new GeneralUnit({
        id: `general-lea-${generalLea}`,
        name: `general-lea-${generalLea}`,
        faction: Faction.Enemy,
        hp: 1000,
        maxSp: 100,
        initialSp: 0,
        str: 80,
        int: 80,
        lea: generalLea,
        luk: 0,
        skillId: 'sima-yi-shadow',
        battlePrimarySkillId: 'sima-yi-shadow',
    });
    state.enemyGeneral = general;
    const attacker = new TroopUnit(`attacker-${attackerAttack}-${morale}`, TroopType.Cavalry, Faction.Player, {
        hp: 100,
        attack: attackerAttack,
        defense: 10,
        moveRange: 0,
        attackRange: 1,
    });
    attacker.morale = morale;
    attacker.moveTo(2, 2);
    state.addUnit(attacker);
    const resolver = new BattleCombatResolver({
        state,
        getPlayerGeneralUnitId: () => null,
        getEnemyGeneralUnitId: () => null,
        setPlayerGeneralUnitId: () => {},
        setEnemyGeneralUnitId: () => {},
    });
    resolver.hitRandom = () => 0.99;
    const real = services();
    const svc = Object.assign(Object.create(real), {
        formula: Object.assign(Object.create(real.formula), { rollDodge: () => false }),
    }) as ReturnType<typeof services>;
    return { state, general, attacker, resolver, svc };
}
