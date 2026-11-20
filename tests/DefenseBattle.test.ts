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
    defenseOutcomeOf,
    isDefenseBattleKind,
    parseDefenseBattleConfig,
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
import { BattleTactic, Faction, TroopType } from '../assets/scripts/core/config/Constants';
import type { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { lifespanCommandForBattleKind } from '../assets/scripts/core/systems/LifespanWiring';
import { MORALE_DELTA } from '../assets/scripts/core/systems/CityEconomy';
import { GeneralUnit, type GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

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
        const config = { turnLimit: 12, moraleOnVictory: 2 };
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

    return suite;
}
