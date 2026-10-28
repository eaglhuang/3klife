/**
 * 火燒偷襲戰掠奪寫入 Stage_Salvage（PROG-2-1462）headless 測試
 *
 * 覆蓋：補給擲骰 200~500；我方回合結束站火攻格 = 掠奪，每格一次；敵方與非火攻場景不掠奪；
 * 開局重置；BattleEnded 帶出 salvage 快照。
 */
import { TestSuite, assert } from './TestRunner';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { executeBattleTileEffectPhase } from '../assets/scripts/battle/runtime/phases/BattleTileEffectPhase';
import { resolveBattleVictory } from '../assets/scripts/battle/runtime/BattleVictoryResolver';
import {
    addStageSalvage,
    emptyStageSalvage,
    FIRE_RAID_PLUNDER_SUPPLY_MAX,
    FIRE_RAID_PLUNDER_SUPPLY_MIN,
    rollFirePlunderSupply,
} from '../assets/scripts/battle/shared/StageSalvage';
import { BattleTactic, EVENT_NAMES, Faction, TroopType, Weather } from '../assets/scripts/core/config/Constants';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';

function setup(battleTactic: BattleTactic) {
    services().initialize();
    const general = new GeneralUnit({ id: 'g-s', name: 'g', faction: Faction.Player, hp: 1000, str: 80, lea: 80 });
    const enemyGeneral = new GeneralUnit({ id: 'e-s', name: 'e', faction: Faction.Enemy, hp: 1000, str: 80, lea: 80 });
    const ctrl = new BattleController();
    ctrl.initBattle(general, enemyGeneral, undefined, Weather.Clear, battleTactic);
    return ctrl;
}

function addUnit(ctrl: BattleController, id: string, faction: Faction, lane: number, depth: number): TroopUnit {
    const unit = new TroopUnit(id, TroopType.Infantry, faction, { hp: 1000, attack: 30, defense: 15, moveRange: 1, attackRange: 1 });
    unit.moveTo(lane, depth);
    ctrl.state.addUnit(unit);
    return unit;
}

function tick(ctrl: BattleController, faction: Faction, random: () => number = () => 0): void {
    executeBattleTileEffectPhase({
        state: ctrl.state,
        actingFaction: faction,
        playerGeneralUnitId: null,
        enemyGeneralUnitId: null,
        applyUnitDamage: () => {},
        onGeneralUnitKilled: () => {},
        onUnitKilled: () => {},
        random,
    });
}

export function createStageSalvageSuite(): TestSuite {
    const suite = new TestSuite('StageSalvage (火燒偷襲戰掠奪寫入 Stage_Salvage PROG-2-1462)');

    suite.test('補給擲骰落在 200~500，加總按類別累計', () => {
        assert.equals(FIRE_RAID_PLUNDER_SUPPLY_MIN, rollFirePlunderSupply(() => 0));
        assert.equals(FIRE_RAID_PLUNDER_SUPPLY_MAX, rollFirePlunderSupply(() => 0.9999));
        assert.equals(FIRE_RAID_PLUNDER_SUPPLY_MAX, rollFirePlunderSupply(() => 1), '亂數源回 1 也不超過上限');
        const total = emptyStageSalvage();
        addStageSalvage(total, { supply: 300 });
        addStageSalvage(total, { supply: 200, stone: 5 });
        assert.equals(500, total.supply);
        assert.equals(5, total.stone);
        assert.equals(0, total.wood);
    });

    suite.test('火攻場景：我方站火攻格回合結束掠奪一次，同格不重複', () => {
        const ctrl = setup(BattleTactic.FireAttack);
        assert.equals('scene-gambit:fire-attack', ctrl.state.getTileEffect(2, 3)?.notes, '開局已鋪火攻格');
        addUnit(ctrl, 'p1', Faction.Player, 2, 3);
        tick(ctrl, Faction.Player);
        assert.equals(200, ctrl.state.stageSalvage.supply);
        assert.equals(10, ctrl.state.stageSalvage.weaponMaterial, 'PROG-2-1509 武器材料 +10');
        assert.equals(20, ctrl.state.stageSalvage.instructorExp, 'PROG-2-1509 教官經驗 +20');
        tick(ctrl, Faction.Player);
        assert.equals(200, ctrl.state.stageSalvage.supply, '同一格只掠奪一次');
        assert.equals(10, ctrl.state.stageSalvage.weaponMaterial, '同一格不重複給武器材料');
    });

    suite.test('兩格各掠奪一次', () => {
        const ctrl = setup(BattleTactic.FireAttack);
        addUnit(ctrl, 'p1', Faction.Player, 1, 3);
        addUnit(ctrl, 'p2', Faction.Player, 3, 4);
        tick(ctrl, Faction.Player, () => 0.9999);
        assert.equals(FIRE_RAID_PLUNDER_SUPPLY_MAX * 2, ctrl.state.stageSalvage.supply);
        assert.equals(20, ctrl.state.stageSalvage.weaponMaterial);
        assert.equals(40, ctrl.state.stageSalvage.instructorExp);
    });

    suite.test('敵方站火攻格不掠奪；非火攻格不掠奪', () => {
        const ctrl = setup(BattleTactic.FireAttack);
        addUnit(ctrl, 'e1', Faction.Enemy, 2, 4);
        addUnit(ctrl, 'p1', Faction.Player, 2, 1);
        tick(ctrl, Faction.Enemy);
        tick(ctrl, Faction.Player);
        assert.equals(0, ctrl.state.stageSalvage.supply);
    });

    suite.test('非火攻場景不掠奪；重開一局累計歸零', () => {
        const normal = setup(BattleTactic.Normal);
        addUnit(normal, 'p1', Faction.Player, 2, 3);
        tick(normal, Faction.Player);
        assert.equals(0, normal.state.stageSalvage.supply);

        const ctrl = setup(BattleTactic.FireAttack);
        addUnit(ctrl, 'p1', Faction.Player, 2, 3);
        tick(ctrl, Faction.Player);
        assert.equals(200, ctrl.state.stageSalvage.supply);
        ctrl.initBattle(
            new GeneralUnit({ id: 'g2', name: 'g', faction: Faction.Player, hp: 1000, str: 80, lea: 80 }),
            new GeneralUnit({ id: 'e2', name: 'e', faction: Faction.Enemy, hp: 1000, str: 80, lea: 80 }),
            undefined, Weather.Clear, BattleTactic.FireAttack,
        );
        assert.equals(0, ctrl.state.stageSalvage.supply);
        assert.equals(0, ctrl.state.stageSalvage.weaponMaterial);
        assert.equals(0, ctrl.state.stageSalvage.instructorExp);
        assert.equals(0, ctrl.state.plunderedTiles.size);
    });

    suite.test('BattleEnded 帶出 salvage 快照', () => {
        const ctrl = setup(BattleTactic.FireAttack);
        addUnit(ctrl, 'p1', Faction.Player, 2, 3);
        tick(ctrl, Faction.Player);
        const ended: Array<{ salvage?: { supply: number } }> = [];
        const off = services().event.on(EVENT_NAMES.BattleEnded, (data?: { salvage?: { supply: number } }) => { if (data) ended.push(data); });
        ctrl.state.enemyFortressHp = 0;
        resolveBattleVictory(ctrl.state);
        off();
        assert.equals(1, ended.length);
        assert.equals(200, ended[0].salvage?.supply);
    });

    return suite;
}
