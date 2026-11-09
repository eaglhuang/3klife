/**
 * ZoneOfControl — STR 壓制產生高移動成本／不可通行區域（FORM-09，PROG-2-2130）
 */
import { TestSuite, assert } from './TestRunner';
import { Faction, TroopType } from '../assets/scripts/core/config/Constants';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { BattleState } from '../assets/scripts/battle/models/BattleState';
import { executeBattleAutoMovePhase, type BattleAutoMovePhaseContext } from '../assets/scripts/battle/runtime/phases/BattleAutoMovePhase';
import { EMPTY_ZOC_FIELD, buildZocField, zocLevelOf } from '../assets/scripts/battle/shared/ZoneOfControl';
import { services } from '../assets/scripts/core/managers/ServiceLoader';

const ENEMY_GENERAL_ID = 'enemy-general';
const PLAYER_GENERAL_ID = 'player-general';

function stats(str: number, int: number): GeneralUnit {
    return { str, int } as unknown as GeneralUnit;
}

function realGeneral(id: string, faction: Faction, str: number): GeneralUnit {
    return new GeneralUnit({
        id, name: id, faction, hp: 100000, maxSp: 100, initialSp: 0, str, int: 30, lea: 90,
        skillId: 'cao-cao-tactics', battlePrimarySkillId: 'cao-cao-tactics', tacticSlots: [],
    });
}

function makeUnit(id: string, faction: Faction, lane: number, depth: number, moveRange = 3, type = TroopType.Cavalry): TroopUnit {
    const unit = new TroopUnit(id, type, faction, { hp: 100, attack: 30, defense: 5, moveRange, attackRange: 1 } as never);
    unit.moveTo(lane, depth);
    return unit;
}

function context(state: BattleState, actingFaction: Faction): BattleAutoMovePhaseContext {
    return {
        state,
        actingFaction,
        turnManager: { markUnitMoved: () => undefined } as unknown as BattleAutoMovePhaseContext['turnManager'],
        consumeTileBuff: () => undefined,
        getFactionUnits: (faction) => [...state.units.values()].filter((unit) => unit.faction === faction),
        isCellMovementBlocked: () => false,
        isGeneralUnit: (id) => id === ENEMY_GENERAL_ID || id === PLAYER_GENERAL_ID,
        applyGhostPassDamage: () => undefined,
    };
}

/** 玩家部隊從 (2,0) 前進 3 格；敵將在 (3,2)，所以 (2,2) 落在壓制區 */
function advance(player: GeneralUnit, enemy: GeneralUnit, tweak?: (mover: TroopUnit, source: TroopUnit) => void): TroopUnit {
    services().initialize();
    const state = new BattleState();
    state.playerGeneral = player;
    state.enemyGeneral = enemy;
    const mover = makeUnit('mover', Faction.Player, 2, 0);
    const source = makeUnit(ENEMY_GENERAL_ID, Faction.Enemy, 3, 2);
    state.addUnit(mover);
    state.addUnit(source);
    tweak?.(mover, source);
    executeBattleAutoMovePhase(context(state, Faction.Player));
    return mover;
}

export function createZoneOfControlSuite(): TestSuite {
    const suite = new TestSuite('ZoneOfControl (動態 ZOC FORM-09 PROG-2-2130)');

    suite.test('倍率門檻：未達、高移動成本、不可通行', () => {
        assert.equals(zocLevelOf(stats(100, 0), stats(70, 0)), 'none');
        assert.equals(zocLevelOf(stats(100, 0), stats(66, 0)), 'high-cost');
        assert.equals(zocLevelOf(stats(100, 0), stats(50, 0)), 'impassable');
    });

    suite.test('智力反制：INT 高於 STR 時以 INT 抵抗', () => {
        assert.equals(zocLevelOf(stats(100, 0), stats(20, 90)), 'none');
    });

    suite.test('屬性全 0 不會除以零', () => {
        assert.equals(zocLevelOf(stats(0, 0), stats(0, 0)), 'none');
        assert.equals(zocLevelOf(stats(5, 0), stats(0, 0)), 'impassable');
    });

    suite.test('範圍只含距離 1 的格子，不含來源所在格與斜角', () => {
        const field = buildZocField(stats(100, 0), stats(50, 0), [{ lane: 3, depth: 2 }]);
        assert.isTrue(field.at(2, 2).blocksEntry, '左');
        assert.isTrue(field.at(3, 3).blocksEntry, '前');
        assert.isFalse(field.at(3, 2).blocksEntry, '來源本身');
        assert.isFalse(field.at(2, 3).blocksEntry, '斜角');
    });

    suite.test('缺武將或沒有來源時無區域', () => {
        assert.equals(buildZocField(null, stats(1, 1), [{ lane: 0, depth: 0 }]), EMPTY_ZOC_FIELD);
        assert.equals(buildZocField(stats(100, 0), null, [{ lane: 0, depth: 0 }]), EMPTY_ZOC_FIELD);
        assert.equals(buildZocField(stats(100, 0), stats(1, 1), []), EMPTY_ZOC_FIELD);
    });

    suite.test('屬性接近：照常走滿 3 格', () => {
        assert.equals(advance(stats(90, 50), stats(100, 50)).depth, 3);
    });

    suite.test('高移動成本：進入後多扣 1 點，走 2 格就停', () => {
        assert.equals(advance(stats(60, 50), stats(100, 50)).depth, 2);
    });

    suite.test('不可通行：停在區域前一格', () => {
        assert.equals(advance(stats(40, 30), stats(100, 50)).depth, 1);
    });

    suite.test('高智力武將不受壓制', () => {
        assert.equals(advance(stats(30, 95), stats(100, 50)).depth, 3);
    });

    suite.test('壓制方主將陣亡後區域消失', () => {
        const mover = advance(stats(40, 30), stats(100, 50), (_, source) => { source.currentHp = 0; });
        assert.equals(mover.depth, 3);
    });

    suite.test('七進七出無視 ZOC', () => {
        const mover = advance(stats(40, 30), stats(100, 50), (unit) => { unit.tallyTemplateId = 'tiger-tally-long-dan'; });
        assert.equals(mover.depth, 3);
    });

    suite.test('敵方前進時同樣受玩家主將壓制', () => {
        services().initialize();
        const state = new BattleState();
        state.playerGeneral = stats(100, 50);
        state.enemyGeneral = stats(40, 30);
        const mover = makeUnit('e-mover', Faction.Enemy, 2, 7);
        state.addUnit(mover);
        state.addUnit(makeUnit(PLAYER_GENERAL_ID, Faction.Player, 3, 5));
        executeBattleAutoMovePhase(context(state, Faction.Enemy));
        assert.equals(mover.depth, 6);
    });

    suite.test('區域內有敵軍擋路時，盾兵仍會舉盾牆', () => {
        services().initialize();
        const state = new BattleState();
        state.playerGeneral = stats(40, 30);
        state.enemyGeneral = stats(100, 50);
        const shield = makeUnit('shield', Faction.Player, 2, 0, 2, TroopType.Shield);
        state.addUnit(shield);
        state.addUnit(makeUnit(ENEMY_GENERAL_ID, Faction.Enemy, 3, 1));
        state.addUnit(makeUnit('blocker', Faction.Enemy, 2, 1));
        executeBattleAutoMovePhase(context(state, Faction.Player));
        assert.equals(shield.depth, 0);
        assert.isTrue(shield.isShieldWallActive);
    });

    suite.test('真實回合流程：玩家主將上棋盤後壓制敵軍前進', () => {
        const runEnemyTurn = (playerStr: number): number => {
            services().initialize();
            services().session.setRandomSource(() => 0.99);
            const ctrl = new BattleController();
            ctrl.initBattle(realGeneral('p', Faction.Player, playerStr), realGeneral('e', Faction.Enemy, 30));
            assert.equals(ctrl.startGeneralDuel(), 'ok');
            const general = ctrl.placeGeneralOnBoard(3, 2);
            assert.isTrue(general !== null, '主將要能上棋盤');
            const enemy = makeUnit('e-mover', Faction.Enemy, 2, 7);
            ctrl.state.addUnit(enemy);
            ctrl.resolvePlayerTurn();
            assert.equals(general!.depth, 4, '主將先前進到 (3,4)，壓制 (2,4)');
            ctrl.resolveEnemyTurn();
            return enemy.depth;
        };
        assert.isTrue(runEnemyTurn(40) <= 4, '屬性接近：穿過 (2,4)');
        assert.equals(runEnemyTurn(100), 5, '壓制：停在區域前一格');
    });

    return suite;
}
