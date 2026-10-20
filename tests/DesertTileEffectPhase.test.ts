/**
 * 沙漠精力消耗接進回合流程（APT-05，PROG-2-0785）headless 測試
 *
 * 覆蓋：本陣營站在沙漠的部隊每回合扣一次主將精力；同陣營多人在沙漠只取最大值；
 * 敵方沙漠不扣我方；死亡單位不計；精力扣到 0 為止。
 * 數值公式本身見 DesertVitality.test.ts。
 */
import { TestSuite, assert } from './TestRunner';
import { executeBattleTileEffectPhase, type BattleTileEffectPhaseContext } from '../assets/scripts/battle/runtime/phases/BattleTileEffectPhase';
import { desertVitalityDrain } from '../assets/scripts/core/systems/DesertVitality';
import { Faction } from '../assets/scripts/core/config/Constants';
import { TerrainType } from '../assets/scripts/shared/CommonEnums';
import { services } from '../assets/scripts/core/managers/ServiceLoader';

interface StubGeneral {
    vitality: number;
}

interface StubUnit {
    id: string;
    faction: Faction;
    lane: number;
    depth: number;
    grade: 'S' | 'A' | 'B' | 'C' | 'D';
    terrain: TerrainType;
    dead: boolean;
    isDead(): boolean;
    morale: number;
    moraleTurns: number;
}

function unit(id: string, faction: Faction, terrain: TerrainType, grade: StubUnit['grade'] = 'D', dead = false): StubUnit {
    return {
        id,
        faction,
        lane: 0,
        depth: 0,
        grade,
        terrain,
        dead,
        isDead: () => dead,
        morale: 0,
        moraleTurns: 0,
    };
}

/** 最小戰場狀態：只提供 executeBattleTileEffectPhase 會讀的欄位 */
function buildContext(units: StubUnit[], playerGeneral: StubGeneral, enemyGeneral: StubGeneral | null = null) {
    const unitMap = new Map<string, StubUnit>(units.map((u) => [u.id, u]));
    const state = {
        units: unitMap,
        unitDots: new Map(),
        formationZones: new Map(),
        getTileEffect: () => null,
        getGeneral: (faction: Faction) => (faction === Faction.Player ? playerGeneral : enemyGeneral),
    };
    const context: BattleTileEffectPhaseContext = {
        state: state as never,
        actingFaction: Faction.Player,
        playerGeneralUnitId: null,
        enemyGeneralUnitId: null,
        applyUnitDamage: () => {},
        onGeneralUnitKilled: () => {},
        onUnitKilled: () => {},
        getTerrainVitalityDrain: (u) => {
            const stub = u as unknown as StubUnit;
            return desertVitalityDrain(stub.terrain, stub.grade);
        },
    };
    return context;
}

export function createDesertTileEffectPhaseSuite(): TestSuite {
    const suite = new TestSuite('DesertTileEffectPhase (沙漠精力消耗接進回合流程 APT-05)');

    suite.test('本陣營站在沙漠（D 級）的部隊：主將精力扣基礎值', () => {
        services().initialize();
        const general: StubGeneral = { vitality: 100 };
        const context = buildContext([unit('p1', Faction.Player, TerrainType.Desert, 'D')], general);
        executeBattleTileEffectPhase(context);
        assert.equals(100 - desertVitalityDrain(TerrainType.Desert, 'D'), general.vitality);
    });

    suite.test('沙漠 S 級部隊：扣的是減半後的值', () => {
        services().initialize();
        const general: StubGeneral = { vitality: 100 };
        const context = buildContext([unit('p1', Faction.Player, TerrainType.Desert, 'S')], general);
        executeBattleTileEffectPhase(context);
        assert.equals(100 - desertVitalityDrain(TerrainType.Desert, 'S'), general.vitality);
    });

    suite.test('非沙漠地形不扣精力', () => {
        services().initialize();
        const general: StubGeneral = { vitality: 100 };
        const context = buildContext([unit('p1', Faction.Player, TerrainType.Plain, 'D')], general);
        executeBattleTileEffectPhase(context);
        assert.equals(100, general.vitality);
    });

    suite.test('同陣營多人在沙漠：取最大值扣一次，不加總', () => {
        services().initialize();
        const general: StubGeneral = { vitality: 100 };
        const context = buildContext(
            [unit('p1', Faction.Player, TerrainType.Desert, 'D'), unit('p2', Faction.Player, TerrainType.Desert, 'D')],
            general,
        );
        executeBattleTileEffectPhase(context);
        assert.equals(100 - desertVitalityDrain(TerrainType.Desert, 'D'), general.vitality);
    });

    suite.test('敵方站在沙漠不扣我方主將精力', () => {
        services().initialize();
        const general: StubGeneral = { vitality: 100 };
        const context = buildContext([unit('e1', Faction.Enemy, TerrainType.Desert, 'D')], general);
        executeBattleTileEffectPhase(context);
        assert.equals(100, general.vitality);
    });

    suite.test('已死亡的沙漠部隊不計入扣精力', () => {
        services().initialize();
        const general: StubGeneral = { vitality: 100 };
        const context = buildContext([unit('p1', Faction.Player, TerrainType.Desert, 'D', true)], general);
        executeBattleTileEffectPhase(context);
        assert.equals(100, general.vitality);
    });

    suite.test('精力不足時扣到 0 為止，不會變負數', () => {
        services().initialize();
        const general: StubGeneral = { vitality: 1 };
        const context = buildContext([unit('p1', Faction.Player, TerrainType.Desert, 'D')], general);
        executeBattleTileEffectPhase(context);
        assert.equals(0, general.vitality);
    });

    suite.test('未提供 getTerrainVitalityDrain 時維持舊行為（不扣）', () => {
        services().initialize();
        const general: StubGeneral = { vitality: 100 };
        const context = buildContext([unit('p1', Faction.Player, TerrainType.Desert, 'D')], general);
        delete context.getTerrainVitalityDrain;
        executeBattleTileEffectPhase(context);
        assert.equals(100, general.vitality);
    });

    return suite;
}
