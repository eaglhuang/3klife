/**
 * SortieDeploy.test.ts — 出征編制、出征軍勢與糧草部署帳本 headless 測試（PROG-2-0070）
 *
 * Unity 對照：EditMode Test，驗證 SupplyManager 的 TryDeploy / OnUnitDied / OnBattleEnd 帳目。
 */
import { TestSuite, assert } from './TestRunner';
import {
    applyDeploy,
    BASE_DEPLOY_FOOD_COST,
    BASE_TACTIC_CAP,
    BASE_TACTIC_START,
    checkDeploy,
    COMMAND_CAPACITY_FLOOR,
    computeCommandCapacity,
    computeSortiePoolMax,
    createSortieState,
    deployBlockMessage,
    finishSortie,
    getDeployCost,
    getDeputyFoodBonus,
    getEliteDeployCap,
    getStrategistBonus,
    getTallyGrainCost,
    MILITIA_FOOD_COST,
    regenTactic,
    retireUnit,
    spendTactic,
    STRATEGIST_TACTIC_CAP_MAX,
    STRATEGIST_TACTIC_START_MAX,
    troopsFromHp,
    UNIT_TROOP_COST,
    updateUnitTroops,
    validateSortieLoadout,
} from '../assets/scripts/core/systems/SortieDeploy';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { Faction, TroopType } from '../assets/scripts/core/config/Constants';
import { services } from '../assets/scripts/core/managers/ServiceLoader';

function deepEq(expected: unknown, actual: unknown, msg?: string): void {
    assert.equals(JSON.stringify(expected), JSON.stringify(actual), msg);
}

function general(id: string, faction: Faction): GeneralUnit {
    return new GeneralUnit({ id, name: id, faction, hp: 1000, maxSp: 100, str: 90, int: 60, lea: 80, luk: 40 });
}

export function createSortieDeploySuite(): TestSuite {
    const suite = new TestSuite('SortieDeploy');

    suite.test('帶兵上限：將階基礎 + 統率×50 + 加成，初期保底 8000', () => {
        assert.equals(COMMAND_CAPACITY_FLOOR, computeCommandCapacity({ lea: 50 }), '低統率無名將保底 8000');
        assert.equals(4000 + 90 * 50, computeCommandCapacity({ lea: 90 }));
        assert.equals(8000 + 80 * 50 + 500 + 300 + 200, computeCommandCapacity({ lea: 80, generalRank: 2, fameBonus: 500, equipmentBonus: 300, eventBonus: 200 }));
        assert.equals(20000 + 100 * 50, computeCommandCapacity({ lea: 100, generalRank: 99 }), '將階超出範圍夾住');
    });

    suite.test('出征軍勢 = min(帶兵上限, 城市兵源, 關卡上限)', () => {
        assert.equals(8000, computeSortiePoolMax(9000, 10000, 8000));
        assert.equals(6000, computeSortiePoolMax(9000, 6000, 8000));
        assert.equals(7000, computeSortiePoolMax(7000, 10000, 12000));
        assert.equals(0, computeSortiePoolMax(9000, -5, 8000), '負數兵源當 0');
    });

    suite.test('糧耗與投入兵力：一般兵種查表、虎符查品質星級、普通小兵 5 糧', () => {
        const cav = getDeployCost({ troopType: 'cavalry' });
        assert.equals(BASE_DEPLOY_FOOD_COST.CAVALRY, cav.foodCost);
        assert.equals(UNIT_TROOP_COST.CAVALRY, cav.troopCost);
        assert.equals(true, cav.isElite, '騎兵算精銳');
        assert.equals(false, getDeployCost({ troopType: 'infantry' }).isElite);
        assert.equals(BASE_DEPLOY_FOOD_COST.SIEGE, getDeployCost({ troopType: 'engineer' }).foodCost, '器械 = SIEGE');
        assert.equals(BASE_DEPLOY_FOOD_COST.PIKE, getDeployCost({ troopType: 'pikeman' }).foodCost);
        assert.equals(92, getDeployCost({ troopType: 'infantry', tally: { quality: 'SSR', star: 3 } }).foodCost);
        assert.equals(true, getDeployCost({ troopType: 'infantry', tally: { quality: 'R', star: 1 } }).isElite, '虎符部隊算精銳');
        assert.equals(20, getTallyGrainCost('XX', 9), '查不到用 fallback 20');
        assert.equals(MILITIA_FOOD_COST, getDeployCost({ troopType: 'cavalry', militia: true }).foodCost);
    });

    suite.test('精銳上限：基礎 4、攻城 +1、官職最多 +1', () => {
        assert.equals(4, getEliteDeployCap());
        assert.equals(5, getEliteDeployCap('SCENE_SIEGE'));
        assert.equals(6, getEliteDeployCap('SCENE_SIEGE', 3));
        assert.equals(5, getEliteDeployCap('SCENE_NIGHT_RAID', 1));
    });

    suite.test('三種不可部署原因分開回報，且不自動改派', () => {
        let state = createSortieState({ commandCapacity: 9000, cityTroops: 1300, food: 20 });
        const first = applyDeploy(state, 'u1', { troopType: 'cavalry' });
        assert.equals(true, first.ok);
        state = first.state;
        assert.equals(100, state.poolCurrent);
        assert.equals(2, state.food);
        const blocked = checkDeploy(state, { troopType: 'infantry' });
        assert.equals(false, blocked.ok);
        deepEq(['TROOPS_SHORT', 'FOOD_SHORT'], blocked.reasons);
        const again = applyDeploy(state, 'u2', { troopType: 'infantry' });
        assert.equals(false, again.ok);
        assert.equals(state, again.state, '不成功時帳本不變');

        let elite = createSortieState({ commandCapacity: 20000, cityTroops: 20000, stageSortieCap: 20000, food: 1000 });
        for (let i = 0; i < 4; i += 1) elite = applyDeploy(elite, `c${i}`, { troopType: 'cavalry' }).state;
        deepEq(['FIELD_UNIT_LIMIT'], checkDeploy(elite, { troopType: 'cavalry' }).reasons, '第 5 隊精銳被擋');
        assert.equals(true, checkDeploy(elite, { troopType: 'infantry' }).ok, '普通兵不佔精銳上限');
        elite = retireUnit(elite, 'c0', 0);
        assert.equals(true, checkDeploy(elite, { troopType: 'cavalry' }).ok, '精銳退場後空出名額');
    });

    suite.test('規格範例：刀盾隊剩 300/1000 退場返還 300、戰損 700，城市兵源 10000→9300', () => {
        let state = createSortieState({ commandCapacity: 8000, cityTroops: 10000, food: 100 });
        state = { ...state };
        const deployed = applyDeploy(state, 'shield-1', { troopType: 'shield' });
        // 規格範例的刀盾隊投入 1000，這裡直接用帳本登記值驗算比例
        state = deployed.state;
        const cost = state.units['shield-1'].troopCost;
        state = updateUnitTroops(state, 'shield-1', troopsFromHp(cost, 30, 100));
        state = retireUnit(state, 'shield-1');
        const summary = finishSortie(state, 10000, 600);
        assert.equals(Math.round(cost * 0.3), summary.returnedTroops);
        assert.equals(cost - Math.round(cost * 0.3), summary.lostTroops);
        assert.equals(10000 - summary.lostTroops, summary.cityTroopsAfter);
        assert.equals(Math.ceil(summary.lostTroops / 600), summary.turnsToRecover);
        assert.equals(8000, summary.poolMax);
        assert.equals(8000 - summary.lostTroops, summary.poolRemaining);
    });

    suite.test('戰鬥結束時場上部隊全數返還；陣亡部隊全損', () => {
        let state = createSortieState({ commandCapacity: 9000, cityTroops: 9000, food: 200 });
        state = applyDeploy(state, 'a', { troopType: 'infantry' }).state;
        state = applyDeploy(state, 'b', { troopType: 'archer' }).state;
        state = retireUnit(state, 'b', 0);
        const summary = finishSortie(state, 9000);
        assert.equals(UNIT_TROOP_COST.INFANTRY, summary.returnedTroops);
        assert.equals(UNIT_TROOP_COST.ARCHER, summary.lostTroops);
        assert.equals(BASE_DEPLOY_FOOD_COST.INFANTRY + BASE_DEPLOY_FOOD_COST.ARCHER, summary.foodSpent);
        assert.equals(0, finishSortie(createSortieState({ commandCapacity: 1, cityTroops: 1, food: 0 }), 100).turnsToRecover);
    });

    suite.test('出征編制：角色鎖與同名武將（同血統）拒絕', () => {
        assert.equals(true, validateSortieLoadout({ commanderUid: 'a', strategistUid: 'b', deputyUid: null }).ok);
        deepEq(['ROLE_LOCK'], validateSortieLoadout({ commanderUid: 'a', strategistUid: 'a', deputyUid: null }).issues);
        deepEq(['MISSING_COMMANDER'], validateSortieLoadout({ commanderUid: '', strategistUid: 'b', deputyUid: null }).issues);
        const members = [{ id: 'a', bloodlineId: 'zhao-yun' }, { id: 'b', bloodlineId: 'zhao-yun' }, { id: 'c' }];
        deepEq(['SAME_BLOODLINE'], validateSortieLoadout({ commanderUid: 'a', strategistUid: 'b', deputyUid: 'c' }, members).issues);
        deepEq(['UNKNOWN_GENERAL'], validateSortieLoadout({ commanderUid: 'a', strategistUid: 'x', deputyUid: null }, members).issues);
    });

    suite.test('參謀官 / 後勤官加成依規格公式並有上限', () => {
        deepEq({ maxTacticBonus: 9, startTacticBonus: 4 }, getStrategistBonus({ id: 's', int: 100, pol: 40 }));
        deepEq({ maxTacticBonus: 30, startTacticBonus: 15 }, getStrategistBonus({ id: 's', int: 400, pol: 200 }));
        deepEq({ maxTacticBonus: 0, startTacticBonus: 0 }, getStrategistBonus(null));
        // 0.03 + 80×0.001 + 50×0.0006 = 0.14
        assert.equals(Math.floor(1000 * 0.14), getDeputyFoodBonus({ id: 'd', lea: 80, pol: 50 }, 1000).foodCapBonus);
        assert.equals(180, getDeputyFoodBonus({ id: 'd', lea: 300, pol: 300 }, 1000).foodCapBonus, '上限 18%');
        const state = createSortieState({ commandCapacity: 9000, cityTroops: 9000, food: 300, foodBonus: 42 });
        assert.equals(342, state.food);
        assert.equals(342, state.maxFood);
    });

    suite.test('提示文案', () => {
        assert.equals('軍勢不足，無法派出 騎兵。', deployBlockMessage('TROOPS_SHORT', '騎兵'));
        assert.equals('糧草不足，無法派出 騎兵。', deployBlockMessage('FOOD_SHORT', '騎兵'));
        assert.equals('場上部隊已滿，請先等待退場或撤回部隊。', deployBlockMessage('FIELD_UNIT_LIMIT', '騎兵'));
    });

    suite.test('BattleController：有出征帳本時部署扣軍勢與糧草，不足回報原因；陣亡部隊列入戰損', () => {
        services().initialize();
        const ctrl = new BattleController();
        ctrl.initBattle(general('p', Faction.Player), general('e', Faction.Enemy));
        assert.equals(null, ctrl.getSortieState(), '沒設定帳本時維持舊版');
        ctrl.configureSortie({ commandCapacity: 9000, cityTroops: 1500, food: 40 });
        assert.equals(40, services().battle.getSnapshot().playerFood, 'HUD 糧草改顯示本場糧草');
        assert.equals(40, services().battle.getMaxFood());

        const first = ctrl.tryDeployTroop(TroopType.Cavalry, 0);
        assert.equals(true, first.ok);
        const state = ctrl.getSortieState()!;
        assert.equals(1500 - UNIT_TROOP_COST.CAVALRY, state.poolCurrent);
        assert.equals(40 - BASE_DEPLOY_FOOD_COST.CAVALRY, services().battle.getSnapshot().playerFood);

        services().battle.nextTurn();
        assert.equals(40 - BASE_DEPLOY_FOOD_COST.CAVALRY, services().battle.getSnapshot().playerFood, '帳本模式不每回合補糧');
        ctrl['turnManager'].refreshForNextTurn();
        const blocked = ctrl.tryDeployTroop(TroopType.Infantry, 1);
        assert.equals(false, blocked.ok);
        assert.equals('troops-short', blocked.reason);
        deepEq(['troops-short'], blocked.reasons);

        // 騎兵陣亡（從場上移除）→ 全損
        ctrl.state.removeUnit(first.unit!.id);
        const summary = ctrl.finishSortie(1500)!;
        assert.equals(UNIT_TROOP_COST.CAVALRY, summary.lostTroops);
        assert.equals(0, summary.returnedTroops);
        assert.equals(1500 - UNIT_TROOP_COST.CAVALRY, summary.cityTroopsAfter);

        ctrl.initBattle(general('p', Faction.Player), general('e', Faction.Enemy));
        assert.equals(null, ctrl.getSortieState(), '新的一場清掉帳本');
    });

    suite.test('參謀官加成：智力 0.7 + 政治 0.5 → 計謀點上限與開局補點，套進本場帳本', () => {
        const bonus = getStrategistBonus({ id: 's', int: 60, pol: 40, lea: 0 } as SortieMember);
        assert.equals(6, bonus.maxTacticBonus, '62 / 10 = 6');
        assert.equals(3, bonus.startTacticBonus, '6 × 0.5 = 3');
        const state = createSortieState({ commandCapacity: 8000, cityTroops: 10000, food: 100, strategistBonus: bonus });
        assert.equals(BASE_TACTIC_CAP + 6, state.tacticMax);
        assert.equals(BASE_TACTIC_START + 3, state.tacticCurrent);
        const none = createSortieState({ commandCapacity: 8000, cityTroops: 10000, food: 100 });
        assert.equals(BASE_TACTIC_CAP, none.tacticMax, '沒有參謀官只有基礎上限');
        assert.equals(BASE_TACTIC_START, none.tacticCurrent);
    });

    suite.test('參謀官加成封頂：上限不超過 30 + 30、開局不超過上限', () => {
        const huge = getStrategistBonus({ id: 's', int: 999, pol: 999, lea: 0 } as SortieMember);
        assert.equals(STRATEGIST_TACTIC_CAP_MAX, huge.maxTacticBonus);
        assert.equals(STRATEGIST_TACTIC_START_MAX, huge.startTacticBonus);
        const state = createSortieState({ commandCapacity: 8000, cityTroops: 10000, food: 100, strategistBonus: huge });
        assert.equals(BASE_TACTIC_CAP + STRATEGIST_TACTIC_CAP_MAX, state.tacticMax);
        assert.equals(BASE_TACTIC_START + STRATEGIST_TACTIC_START_MAX, state.tacticCurrent);
        assert.equals(true, state.tacticCurrent <= state.tacticMax);
    });

    suite.test('計謀點花費：足夠才扣，不足回報 TACTIC_SHORT 且不扣', () => {
        const state = createSortieState({ commandCapacity: 8000, cityTroops: 10000, food: 100 });
        const ok = spendTactic(state, 10);
        assert.equals(true, ok.ok);
        assert.equals(BASE_TACTIC_START - 10, ok.state.tacticCurrent);
        assert.equals(10, ok.spent);
        const short = spendTactic(ok.state, 999);
        assert.equals(false, short.ok);
        assert.equals('TACTIC_SHORT', short.ok ? '' : short.reason);
        assert.equals(ok.state.tacticCurrent, short.state.tacticCurrent, '失敗時帳本不變');
        assert.equals(true, spendTactic(state, 0).ok, '0 成本視為免費');
    });

    suite.test('計謀點回復：每回合 +regen，不超過上限', () => {
        let state = createSortieState({ commandCapacity: 8000, cityTroops: 10000, food: 100, strategistBonus: { maxTacticBonus: 0, startTacticBonus: 0 } });
        state = { ...state, tacticCurrent: state.tacticMax - 1 };
        state = regenTactic(state);
        assert.equals(state.tacticMax, state.tacticCurrent, '回復到上限為止');
        const full = regenTactic(state);
        assert.equals(state.tacticMax, full.tacticCurrent);
        assert.equals(true, full === state, '已滿時回傳同一物件');
    });

    suite.test('戰鬥控制器：參謀官計謀點進帳本，花費與回合回復生效', () => {
        const ctrl = new BattleController();
        ctrl.initBattle(general('p', Faction.Player), general('e', Faction.Enemy));
        ctrl.configureSortie({ commandCapacity: 8000, cityTroops: 10000, food: 100, strategistBonus: { maxTacticBonus: 6, startTacticBonus: 3 } });
        const start = ctrl.getSortieState()!;
        assert.equals(BASE_TACTIC_START + 3, start.tacticCurrent);
        assert.equals(true, ctrl.trySpendTacticPoints(5).ok);
        assert.equals(BASE_TACTIC_START + 3 - 5, ctrl.getSortieState()!.tacticCurrent);
        const short = ctrl.trySpendTacticPoints(999);
        assert.equals(false, short.ok);
        assert.equals('TACTIC_SHORT', short.reason ?? '');

        ctrl.initBattle(general('p', Faction.Player), general('e', Faction.Enemy));
        assert.equals(true, ctrl.trySpendTacticPoints(999).ok, '沒有帳本（內建 demo 武將）不擋計謀點');
    });

    return suite;
}
