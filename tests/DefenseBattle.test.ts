// @spec-source → PROG-2-9425 守城戰場模式（使用者 11/20 年終守城裁決）
/**
 * DefenseBattle.test.ts — 守城戰：攻城戰法依守方鏡像、守城設定檔、回合上限、戰後民心與大敗判定。
 *
 * Unity 對照：一種 GameMode 的規則測試，不開場景，直接用 BattleState／GameSession。
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { TestSuite, assert } from './TestRunner';
import {
    DEFAULT_DEFENSE_BATTLE,
    defenseReinforceAllowance,
    defenseOutcomeOf,
    isDefenseBattleKind,
    parseDefenseBattleConfig,
    pickDefenseReinforceLane,
    resolveDefenseTurnLimit,
    siegeDefenderOf,
} from '../assets/scripts/core/systems/DefenseBattle';
import {
    DEFENSE_MOAT_DEPTH,
    SIEGE_CATAPULT_DAMAGE,
    SIEGE_MOAT_DEPTH,
    SIEGE_MOAT_TILE_NOTE,
    SIEGE_RAM_MULTIPLIER,
    SIEGE_WALL_DEFENSE_MULTIPLIER,
    SIEGE_WALL_RANGE_BONUS,
    applySceneCatapult,
    isSiegeWallDefender,
    resolveBattleTacticBehavior,
    sceneDefenseMultiplierOf,
    sceneLadderDefenseBypassOf,
    sceneSiegeDamageMultiplierOf,
} from '../assets/scripts/battle/shared/BattleTacticBehavior';
import { BattleState } from '../assets/scripts/battle/models/BattleState';
import { BattleTactic, EVENT_NAMES, Faction, TroopType } from '../assets/scripts/core/config/Constants';
import type { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { lifespanCommandForBattleKind } from '../assets/scripts/core/systems/LifespanWiring';
import { MORALE_DELTA } from '../assets/scripts/core/systems/CityEconomy';
import { buildYearReport, buildYearReportTexts, normalizeYearEndDefenseResult } from '../assets/scripts/core/systems/YearReport';
import { validatePlayerSaveSnapshot } from '../assets/scripts/core/services/PlayerSaveService';
import { GeneralUnit, type GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { services } from '../assets/scripts/core/managers/ServiceLoader';

const readData = (name: string): unknown => JSON.parse(readFileSync(join(__dirname, '..', 'assets/resources/data', name), 'utf8'));

function unit(faction: Faction, depth: number, extra: Record<string, unknown> = {}): TroopUnit {
    return { faction, depth, lane: 1, attackRange: 2, ...extra } as unknown as TroopUnit;
}

/** 守城戰的攻城場景狀態（玩家守） */
function defenseState(): BattleState {
    const state = new BattleState();
    state.battleTactic = BattleTactic.Siege;
    state.siegeDefender = Faction.Player;
    return state;
}

function newSession(): GameSession {
    const session = new GameSession(3);
    session.setRosterStore(new InMemoryRosterStore([{
        id: 'lead-1', name: 'lead-1', faction: 'shu', gender: '男', age: 30, hp: 1000, ep: 10,
        vitality: 100, maxVitality: 100, str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk: 40,
    } as unknown as GeneralConfig]));
    session.setRandomSource(() => 0.99);
    return session;
}

export function createDefenseBattleSuite(): TestSuite {
    const suite = new TestSuite('DefenseBattle');

    suite.test('設定檔：回合上限 12、勝利民心 +2；壞值用預設', () => {
        const real = parseDefenseBattleConfig(readData('defense-battle.json'));
        assert.equals(12, real.turnLimit);
        assert.equals(2, real.moraleOnVictory);
        const broken = parseDefenseBattleConfig({ turnLimit: -3, moraleOnVictory: 'x' });
        assert.equals(DEFAULT_DEFENSE_BATTLE.turnLimit, broken.turnLimit);
        assert.equals(DEFAULT_DEFENSE_BATTLE.moraleOnVictory, broken.moraleOnVictory);
        assert.equals(DEFAULT_DEFENSE_BATTLE.turnLimit, parseDefenseBattleConfig(null).turnLimit);
    });

    suite.test('戰場類別：defense 守方是玩家、不扣壽命；攻城仍是敵方守、扣壽命', () => {
        assert.isTrue(isDefenseBattleKind('defense'));
        assert.isFalse(isDefenseBattleKind('siege'));
        assert.equals(Faction.Player, siegeDefenderOf('defense'));
        assert.equals(Faction.Enemy, siegeDefenderOf('siege'));
        assert.equals(Faction.Enemy, siegeDefenderOf(undefined));
        assert.equals(null, lifespanCommandForBattleKind('defense'));
        assert.equals('siege', lifespanCommandForBattleKind('siege'));
    });

    suite.test('回合上限：守城沒設時用設定檔、時限到判我方勝；遭遇有設時用遭遇；非守城不動', () => {
        const config = { ...DEFAULT_DEFENSE_BATTLE, turnLimit: 12, moraleOnVictory: 2 };
        const d = resolveDefenseTurnLimit({ battleKind: 'defense' }, config);
        assert.equals(12, d.turnLimit);
        assert.equals('player-win', d.timeUpRule);
        assert.equals(10, resolveDefenseTurnLimit({ battleKind: 'defense', turnLimit: 10, timeUpRule: 'enemy-win' }, config).turnLimit);
        assert.equals('player-win', resolveDefenseTurnLimit({ battleKind: 'defense', turnLimit: 10, timeUpRule: 'enemy-win' }, config).timeUpRule);
        const field = resolveDefenseTurnLimit({ battleKind: 'field', turnLimit: 15, timeUpRule: 'by-damage' }, config);
        assert.equals(15, field.turnLimit);
        assert.equals('by-damage', field.timeUpRule);
        assert.equals(undefined, resolveDefenseTurnLimit(null, config).turnLimit);
    });

    suite.test('鏡像：玩家守時城牆區是我方前兩列，防禦 ×1.5、射程 +1；敵軍與城外不加', () => {
        const state = defenseState();
        const behavior = resolveBattleTacticBehavior(BattleTactic.Siege);
        assert.isTrue(isSiegeWallDefender(unit(Faction.Player, 0), state));
        assert.isTrue(isSiegeWallDefender(unit(Faction.Player, 1), state));
        assert.isFalse(isSiegeWallDefender(unit(Faction.Player, 2), state));
        assert.isFalse(isSiegeWallDefender(unit(Faction.Enemy, 7), state));
        assert.equals(SIEGE_WALL_DEFENSE_MULTIPLIER, sceneDefenseMultiplierOf(unit(Faction.Player, 1), state));
        assert.equals(1, sceneDefenseMultiplierOf(unit(Faction.Enemy, 7), state));
        assert.equals(2 + SIEGE_WALL_RANGE_BONUS, behavior.getEffectiveAttackRange(unit(Faction.Player, 0), state));
        assert.equals(2, behavior.getEffectiveAttackRange(unit(Faction.Enemy, 7), state));
    });

    suite.test('鏡像：衝車、投石機、雲梯改給攻方敵軍', () => {
        const state = defenseState();
        assert.equals(SIEGE_RAM_MULTIPLIER, sceneSiegeDamageMultiplierOf(unit(Faction.Enemy, 0), state));
        assert.equals(1, sceneSiegeDamageMultiplierOf(unit(Faction.Player, 7), state));
        const mk = (id: string, faction: Faction, depth: number, hp: number) => unit(faction, depth, { id, currentHp: hp, isDead: () => hp <= 0 });
        const wall = mk('w', Faction.Player, 0, 100);
        const field = mk('f', Faction.Player, 4, 100);
        const enemyEngineer = mk('e', Faction.Enemy, 3, 100);
        const board = { battleTactic: BattleTactic.Siege, siegeDefender: Faction.Player, units: new Map([[wall.id, wall], [field.id, field], [enemyEngineer.id, enemyEngineer]]) } as unknown as BattleState;
        assert.equals('w', applySceneCatapult(enemyEngineer, board).join(','));
        assert.equals(100 - SIEGE_CATAPULT_DAMAGE, wall.currentHp);
        assert.equals(100, field.currentHp);
        assert.equals(0, applySceneCatapult(mk('p', Faction.Player, 7, 100), board).length, '守方工兵沒有投石機');
        const ladder = sceneLadderDefenseBypassOf(unit(Faction.Enemy, 1, { type: TroopType.Infantry }), wall, state);
        assert.equals(1, Math.round(ladder * SIEGE_WALL_DEFENSE_MULTIPLIER * 1000) / 1000);
        assert.equals(1, sceneLadderDefenseBypassOf(unit(Faction.Player, 6, { type: TroopType.Infantry }), unit(Faction.Enemy, 7), state));
    });

    suite.test('鏡像：護城河鋪在我方城牆前一列（depth 2），敵方城前不鋪；一般攻城仍在 depth 5', () => {
        const state = defenseState();
        resolveBattleTacticBehavior(BattleTactic.Siege).applyStartOfBattle(state, { casterGenes: [], random: () => 0 } as never);
        assert.equals(2, DEFENSE_MOAT_DEPTH);
        for (let lane = 0; lane < 5; lane++) assert.equals(SIEGE_MOAT_TILE_NOTE, state.getTileEffect(lane, DEFENSE_MOAT_DEPTH)?.notes);
        assert.equals(null, state.getTileEffect(2, SIEGE_MOAT_DEPTH));
        const attack = new BattleState();
        attack.battleTactic = BattleTactic.Siege;
        resolveBattleTacticBehavior(BattleTactic.Siege).applyStartOfBattle(attack, { casterGenes: [], random: () => 0 } as never);
        assert.equals(SIEGE_MOAT_TILE_NOTE, attack.getTileEffect(2, SIEGE_MOAT_DEPTH)?.notes);
        assert.equals(null, attack.getTileEffect(2, DEFENSE_MOAT_DEPTH));
    });

    suite.test('守方 reset 不清：開戰前設定的守方在 reset 後仍在', () => {
        const state = new BattleState();
        state.siegeDefender = Faction.Player;
        const general = (id: string, faction: Faction) => new GeneralUnit({ id, name: id, faction, hp: 1000, maxSp: 100, initialSp: 0, str: 80, int: 80, lea: 80 });
        state.reset(general('p', Faction.Player), general('e', Faction.Enemy), undefined, undefined, BattleTactic.Siege);
        assert.equals(Faction.Player, state.siegeDefender);
    });

    suite.test('結果分級：勝＝守住、敗＝失守、敗且主將倒下＝大敗', () => {
        assert.equals('victory', defenseOutcomeOf('player-win', true));
        assert.equals('defeat', defenseOutcomeOf('enemy-win', false));
        assert.equals('rout', defenseOutcomeOf('enemy-win', true));
        assert.equals('draw', defenseOutcomeOf('draw', false));
        assert.equals(null, defenseOutcomeOf('ongoing', false));
    });

    suite.test('戰後結算：守城勝利民心 +2；失守民心 −3（不重複扣）；大敗另扣人口 3% 並寫進結算', async () => {
        const win = newSession();
        const before = win.cityMorale;
        const winResult = await win.recordBattle(['lead-1'], 'player-win', { defense: { moraleOnVictory: 2, playerGeneralsDown: false } });
        assert.equals(before + 2, win.cityMorale);
        assert.contains(winResult.aftermathLines.join('\n'), '民心 +2');

        const lose = newSession();
        const popBefore = lose.cityPopulation;
        await lose.recordBattle(['lead-1'], 'enemy-win', { defense: { moraleOnVictory: 2, playerGeneralsDown: false } });
        assert.equals(before + MORALE_DELTA.defenseDefeat, lose.cityMorale);
        assert.equals(popBefore, lose.cityPopulation);

        const rout = newSession();
        const routResult = await rout.recordBattle(['lead-1'], 'enemy-win', { defense: { moraleOnVictory: 2, playerGeneralsDown: true } });
        assert.equals(before + MORALE_DELTA.defenseDefeat, rout.cityMorale);
        const lost = popBefore - rout.cityPopulation;
        assert.equals(Math.floor(popBefore * 0.03 + 1e-9), lost);
        assert.contains(routResult.aftermathLines.join('\n'), `人口 -${lost}`);

        const plain = newSession();
        await plain.recordBattle(['lead-1'], 'player-win', {});
        assert.equals(before, plain.cityMorale, '一般勝利不加民心');
    });

    suite.test('守城第一檔遭遇：defense 類別、攻城戰法、敵軍帶工兵、不在大廳清單', () => {
        const data = readData('encounters.json') as { encounters: Array<Record<string, unknown>> };
        const tier = data.encounters.find((e) => e.id === 'defense-tier-1');
        assert.isTrue(!!tier);
        assert.equals('defense', tier!.battleKind);
        assert.equals('siege', tier!.battleTactic);
        assert.isTrue((tier!.enemyInitialDeployment as Array<{ type: string }>).some((d) => d.type === 'engineer'));
        const lobby = readFileSync(join(__dirname, '..', 'assets/scripts/ui/scenes/LobbyScene.ts'), 'utf8');
        assert.isTrue(lobby.includes("e.battleKind !== 'defense'"));
    });

    suite.test('設定檔：工兵投石每隊 15、每回合補 1 隊；壞值用預設（PROG-2-9429）', () => {
        const real = parseDefenseBattleConfig(readData('defense-battle.json'));
        assert.equals(15, real.engineerBombardDamage);
        assert.equals(1, real.engineerReinforcePerTurn);
        const bad = parseDefenseBattleConfig({ engineerBombardDamage: -3, engineerReinforcePerTurn: 'x' });
        assert.equals(DEFAULT_DEFENSE_BATTLE.engineerBombardDamage, bad.engineerBombardDamage);
        assert.equals(DEFAULT_DEFENSE_BATTLE.engineerReinforcePerTurn, bad.engineerReinforcePerTurn);
        assert.equals(0, parseDefenseBattleConfig({ engineerReinforcePerTurn: 0 }).engineerReinforcePerTurn);
    });

    suite.test('補派路線：挑我方部隊最少的空路；同數隨機；沒空路回 null（PROG-2-9429）', () => {
        assert.equals(3, pickDefenseReinforceLane([0, 1, 3], [2, 1, 0, 0, 5], () => 0));
        assert.equals(1, pickDefenseReinforceLane([0, 1, 4], [1, 1, 0, 0, 1], () => 0.5));
        assert.equals(0, pickDefenseReinforceLane([0, 1, 4], [1, 1, 0, 0, 1], () => 0));
        assert.equals(4, pickDefenseReinforceLane([0, 1, 4], [1, 1, 0, 0, 1], () => 0.99));
        assert.equals(null, pickDefenseReinforceLane([], [0, 0, 0, 0, 0], () => 0));
    });

    const general = (id: string, faction: Faction) => new GeneralUnit({ id, name: id, faction, hp: 100000,
        maxSp: 100, initialSp: 0, str: 60, int: 90, lea: 90, skillId: 'cao-cao-tactics',
        battlePrimarySkillId: 'cao-cao-tactics', tacticSlots: [] });
    function controller(defender: Faction): BattleController {
        services().initialize();
        const ctrl = new BattleController();
        ctrl.configureSiegeDefender(defender);
        ctrl.initBattle(general('p', Faction.Player), general('e', Faction.Enemy));
        if (defender === Faction.Player) ctrl.state.battleTactic = BattleTactic.Siege;
        return ctrl;
    }
    const spawn = (ctrl: BattleController, type: TroopType, faction: Faction, lane: number, depth: number): TroopUnit =>
        (ctrl as any).unitSpawner.spawnUnit(type, faction, lane, depth);
    const enemyEngineers = (ctrl: BattleController) => [...ctrl.state.units.values()]
        .filter((u) => u.faction === Faction.Enemy && u.type === TroopType.Engineer && !u.isDead()).length;

    suite.test('守城投石：敵軍回合每隊活著的工兵不論站位扣我方城寨 15；非守城不扣（PROG-2-9429）', () => {
        const ctrl = controller(Faction.Player);
        spawn(ctrl, TroopType.Engineer, Faction.Enemy, 0, 6);
        spawn(ctrl, TroopType.Engineer, Faction.Enemy, 2, 6);
        const hits: number[] = [];
        const onHit = (p: { faction: Faction; hp: number }) => { if (p.faction === Faction.Player) hits.push(p.hp); };
        services().event.on(EVENT_NAMES.FortressDamaged, onHit);
        const before = ctrl.state.playerFortressHp;
        const engineersBefore = enemyEngineers(ctrl);
        ctrl.resolvePlayerTurn(); ctrl.resolveEnemyTurn();
        services().event.off(EVENT_NAMES.FortressDamaged, onHit);
        // 補派的工兵在出兵階段就上場，同一回合也會投石
        const engineersAfter = enemyEngineers(ctrl);
        assert.isTrue(engineersAfter >= engineersBefore + 1);
        assert.equals(before - 15 * engineersAfter, ctrl.state.playerFortressHp);
        assert.isTrue(hits.includes(ctrl.state.playerFortressHp));

        const normal = controller(Faction.Enemy);
        spawn(normal, TroopType.Engineer, Faction.Enemy, 0, 6);
        const normalBefore = normal.state.playerFortressHp;
        normal.resolvePlayerTurn(); normal.resolveEnemyTurn();
        assert.equals(normalBefore, normal.state.playerFortressHp);
    });

    suite.test('守城主將留守：敵方武將棋子不前進；一般戰照常推進（PROG-2-9429）', () => {
        const ctrl = controller(Faction.Player);
        const boss = spawn(ctrl, TroopType.Infantry, Faction.Enemy, 2, 6);
        ctrl.enemyGeneralUnitId = boss.id;
        ctrl.resolvePlayerTurn(); ctrl.resolveEnemyTurn();
        assert.equals(6, boss.depth);

        const normal = controller(Faction.Enemy);
        const mover = spawn(normal, TroopType.Infantry, Faction.Enemy, 2, 6);
        normal.enemyGeneralUnitId = mover.id;
        normal.resolvePlayerTurn(); normal.resolveEnemyTurn();
        assert.isTrue(mover.depth < 6);
    });

    suite.test('守城補派：每回合多派 1 隊工兵到我方最少的路；非守城不補（PROG-2-9429）', () => {
        const ctrl = controller(Faction.Player);
        for (const lane of [0, 1, 3, 4]) spawn(ctrl, TroopType.Shield, Faction.Player, lane, 1);
        const before = enemyEngineers(ctrl);
        ctrl.resolvePlayerTurn(); ctrl.resolveEnemyTurn();
        const fresh = [...ctrl.state.units.values()].filter((u) => u.faction === Faction.Enemy && u.type === TroopType.Engineer);
        assert.equals(before + 1, fresh.length);
        assert.equals(2, fresh[fresh.length - 1].lane);

        const normal = controller(Faction.Enemy);
        normal.resolvePlayerTurn(); normal.resolveEnemyTurn();
        assert.equals(0, enemyEngineers(normal));
    });

    suite.test('設定檔：補派總上限 5、城寨 500、失守民心 −3、大敗人口 3% 都從 JSON 讀；壞值用預設（PROG-2-9431）', () => {
        const real = parseDefenseBattleConfig(readData('defense-battle.json'));
        assert.equals(5, real.engineerReinforceMax);
        assert.equals(500, real.fortressMaxHp);
        assert.equals(-3, real.defeatMoraleDelta);
        assert.equals(0.03, real.routPopulationLossRatio);
        const bad = parseDefenseBattleConfig({ engineerReinforceMax: -1, fortressMaxHp: 0, defeatMoraleDelta: 2, routPopulationLossRatio: 1.5 });
        assert.equals(DEFAULT_DEFENSE_BATTLE.engineerReinforceMax, bad.engineerReinforceMax);
        assert.equals(DEFAULT_DEFENSE_BATTLE.fortressMaxHp, bad.fortressMaxHp);
        assert.equals(DEFAULT_DEFENSE_BATTLE.defeatMoraleDelta, bad.defeatMoraleDelta);
        assert.equals(DEFAULT_DEFENSE_BATTLE.routPopulationLossRatio, bad.routPopulationLossRatio);
    });

    suite.test('補派額度：每回合上限與整場剩餘取小，補滿為 0（PROG-2-9431）', () => {
        const cfg = { engineerReinforcePerTurn: 1, engineerReinforceMax: 5 };
        assert.equals(1, defenseReinforceAllowance(cfg, 0));
        assert.equals(1, defenseReinforceAllowance(cfg, 4));
        assert.equals(0, defenseReinforceAllowance(cfg, 5));
        assert.equals(0, defenseReinforceAllowance(cfg, 9));
        assert.equals(2, defenseReinforceAllowance({ engineerReinforcePerTurn: 3, engineerReinforceMax: 2 }, 0));
    });

    suite.test('守城補派到整場上限就停；城寨上限讀設定（PROG-2-9431）', () => {
        const ctrl = controller(Faction.Player);
        (ctrl as any).defenseBattleConfig = parseDefenseBattleConfig({ engineerReinforceMax: 2, fortressMaxHp: 640 });
        ctrl.applyDefenseFortress();
        assert.equals(640, ctrl.state.playerFortressMaxHp);
        assert.equals(640, ctrl.state.playerFortressHp);
        for (let t = 0; t < 4; t++) { ctrl.resolvePlayerTurn(); ctrl.resolveEnemyTurn(); ctrl.finalizeEnemyTurn(); }
        assert.equals(2, ctrl.state.defenseEngineersReinforced);

        const normal = controller(Faction.Enemy);
        (normal as any).defenseBattleConfig = parseDefenseBattleConfig({ fortressMaxHp: 640 });
        normal.applyDefenseFortress();
        assert.equals(500, normal.state.playerFortressHp, '非守城不改城寨');
    });

    suite.test('失守懲罰讀設定：民心與大敗人口比例由守城設定帶入（PROG-2-9431）', async () => {
        const base = newSession();
        const before = base.cityMorale;
        const popBefore = base.cityPopulation;
        const rout = newSession();
        await rout.recordBattle(['lead-1'], 'enemy-win', { defense: { moraleOnVictory: 2, playerGeneralsDown: true, defeatMoraleDelta: -5, routPopulationLossRatio: 0.1 } });
        assert.equals(before - 5, rout.cityMorale);
        assert.equals(popBefore - Math.floor(popBefore * 0.1 + 1e-9), rout.cityPopulation);
    });

    suite.test('年報反映守城結果：結算記下結果、存讀檔保留、年報多一行（PROG-2-9431）', async () => {
        const session = newSession();
        await session.recordBattle(['lead-1'], 'enemy-win', { defense: { moraleOnVictory: 2, playerGeneralsDown: true } });
        const snapshot = session.createSnapshot();
        const saved = normalizeYearEndDefenseResult(snapshot.resources?.yearEndDefenseResult);
        assert.isTrue(!!saved);
        assert.equals('rout', saved!.outcome);
        assert.equals(-3, saved!.moraleDelta);
        assert.isTrue(saved!.populationLost > 0);
        const reloaded = validatePlayerSaveSnapshot(JSON.parse(JSON.stringify(snapshot)));
        assert.equals('rout', normalizeYearEndDefenseResult(reloaded.resources?.yearEndDefenseResult)?.outcome);

        const report = buildYearReport(saved!.year, [], [], saved);
        const texts = buildYearReportTexts(report);
        assert.equals(`年終守城：大敗，民心 −3、人口 −${saved!.populationLost}`, texts.yearReportDefense);
        assert.equals('年終守城：守住城寨，民心 +2', buildYearReportTexts(buildYearReport(1, [], [], { year: 1, outcome: 'victory', moraleDelta: 2, populationLost: 0 })).yearReportDefense);
        assert.equals('', buildYearReportTexts(buildYearReport(2, [], [], { year: 1, outcome: 'victory', moraleDelta: 2, populationLost: 0 })).yearReportDefense, '不是今年的守城不列');
        assert.equals(null, normalizeYearEndDefenseResult({ year: 1, outcome: 'win' }));
    });

    return suite;
}
