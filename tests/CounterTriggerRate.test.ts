/**
 * CounterTriggerRate.test.ts — 反擊發動率接上戰鬥的多回合流程測試（FORM-05 接線 / PROG-2-1317）
 *
 * 鎖住：守方武將智力 300（發動率 70%）時，第 1 回合擲骰 0.9 失敗，不反擊、反擊次數保留；
 * 第 2 回合擲骰 0.5 成功，反擊造成傷害並消耗次數。
 *
 * 亂數依序為：命中、暴擊、反擊發動率，每回合腳本化，確保測試可重現。
 *
 * Unity 對照：像一個 OnDamaged 的 Counter 元件，先擲 Probability，失敗就不執行 Coroutine，也不扣 Counter 次數。
 */
import { TestSuite, assert } from './TestRunner';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { TroopType } from '../assets/scripts/shared/CommonEnums';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { Faction, Weather } from '../assets/scripts/core/config/Constants';
import { services } from '../assets/scripts/core/managers/ServiceLoader';

function createGeneral(faction: Faction, id: string, int: number): GeneralUnit {
    return new GeneralUnit({
        id, name: id, faction, hp: 1000, maxSp: 100, initialSp: 100,
        str: 100, int, lea: 90, skillId: `${id}-skill`, battlePrimarySkillId: `${id}-skill`,
    });
}

function setup(): {
    ctrl: BattleController;
    playerTroop: TroopUnit;
    enemyTroop: TroopUnit;
    rolls: number[];
} {
    services().initialize();
    const ctrl = new BattleController();
    ctrl.initBattle(
        createGeneral(Faction.Player, 'zhao-yun', 300),
        createGeneral(Faction.Enemy, 'lu-bu', 90),
        undefined,
        Weather.Clear,
    );
    const state = (ctrl as unknown as { state: { addUnit(unit: TroopUnit): void } }).state;
    const playerTroop = new TroopUnit('zhao-yun-infantry', TroopType.Infantry, Faction.Player, {
        hp: 1000, attack: 30, defense: 10, moveRange: 0, attackRange: 1,
    });
    playerTroop.moveTo(2, 2);
    const enemyTroop = new TroopUnit('lu-bu-infantry', TroopType.Infantry, Faction.Enemy, {
        hp: 1000, attack: 30, defense: 10, moveRange: 0, attackRange: 1,
    });
    enemyTroop.moveTo(2, 3);
    state.addUnit(playerTroop);
    state.addUnit(enemyTroop);

    const rolls: number[] = [];
    const resolver = (ctrl as unknown as { combatResolver: { hitRandom: () => number } }).combatResolver;
    resolver.hitRandom = () => rolls.shift() ?? 0.99;
    return { ctrl, playerTroop, enemyTroop, rolls };
}

function counterStateOf(ctrl: BattleController, unitId: string) {
    return (ctrl as unknown as { state: { getCounterReaction(id: string): { remainingTriggers: number } | null } })
        .state.getCounterReaction(unitId);
}

function advanceToTurn(ctrl: BattleController, target: number): void {
    let guard = 0;
    while (services().battle.getSnapshot().turn < target && guard++ < 10) {
        (ctrl as unknown as { finalizeRuntimeTurnCycle(): void }).finalizeRuntimeTurnCycle();
    }
}

export function createCounterTriggerRateSuite(): TestSuite {
    const suite = new TestSuite('CounterTriggerRate (反擊發動率接戰鬥多回合 FORM-05 / PROG-2-1317)');

    suite.test('多回合：第 1 回合擲骰失敗不反擊且次數保留，第 2 回合擲骰成功才反擊並消耗次數', () => {
        const { ctrl, playerTroop, enemyTroop, rolls } = setup();
        const svc = services();
        const combat = (ctrl as unknown as {
            combatResolver: { resolveCombat(a: TroopUnit, d: TroopUnit, s: unknown): void };
        }).combatResolver;
        (ctrl as unknown as { state: { setCounterReaction(s: object): void } }).state.setCounterReaction({
            unitUid: playerTroop.id,
            battleSkillId: 'zhao-yun-slash',
            counterRatio: 2,
            statusTurns: 1,
            remainingTriggers: 1,
            meleeOnly: true,
        });

        const turnOne = svc.battle.getSnapshot().turn;
        rolls.push(0, 0.99, 0.9); // 命中、暴擊、反擊發動率（0.9 > 0.7，失敗）
        combat.resolveCombat(enemyTroop, playerTroop, svc);
        assert.equals(1000, enemyTroop.currentHp);
        assert.equals(1, counterStateOf(ctrl, playerTroop.id)!.remainingTriggers);

        advanceToTurn(ctrl, turnOne + 1);
        assert.equals(turnOne + 1, svc.battle.getSnapshot().turn);

        rolls.push(0, 0.99, 0.5); // 命中、暴擊、反擊發動率（0.5 < 0.7，成功）
        combat.resolveCombat(enemyTroop, playerTroop, svc);
        assert.isTrue(enemyTroop.currentHp < 1000);
        assert.isTrue(counterStateOf(ctrl, playerTroop.id) === null);
    });

    suite.test('守方沒有武將時不擲發動率，反擊維持原行為', () => {
        const { ctrl, playerTroop, enemyTroop, rolls } = setup();
        const state = (ctrl as unknown as { state: { getGeneral(f: Faction): unknown; generals?: unknown } }).state;
        const originalGetGeneral = state.getGeneral.bind(state);
        state.getGeneral = (faction: Faction) => (faction === Faction.Player ? null : originalGetGeneral(faction));
        (ctrl as unknown as { state: { setCounterReaction(s: object): void } }).state.setCounterReaction({
            unitUid: playerTroop.id,
            battleSkillId: 'zhao-yun-slash',
            counterRatio: 2,
            statusTurns: 1,
            remainingTriggers: 1,
            meleeOnly: true,
        });
        rolls.push(0, 0.99);
        const combat = (ctrl as unknown as {
            combatResolver: { resolveCombat(a: TroopUnit, d: TroopUnit, s: unknown): void };
        }).combatResolver;
        combat.resolveCombat(enemyTroop, playerTroop, services());
        assert.isTrue(enemyTroop.currentHp < 1000);
    });

    return suite;
}
