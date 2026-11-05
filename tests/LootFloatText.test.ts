// @spec-source → 戰法系統.md (doc_spec_0038) §H-3 戰場掠奪金色飄字；PROG-2-1852
import { TestSuite, assert } from './TestRunner';
import { executeBattleTileEffectPhase, type BattleTileEffectPhaseContext } from '../assets/scripts/battle/runtime/phases/BattleTileEffectPhase';
import { emptyStageSalvage, ROCK_SLIDE_TILE_NOTE, type StageSalvageGainedEvent } from '../assets/scripts/battle/shared/StageSalvage';
import { salvageLootTexts } from '../assets/scripts/battle/shared/TacticVfxHooks';
import { salvageGainItems } from '../assets/scripts/core/systems/StrategistHud';
import { EVENT_NAMES, Faction } from '../assets/scripts/core/config/Constants';
import { services } from '../assets/scripts/core/managers/ServiceLoader';

function rockContext() {
    const tiles = new Map<string, unknown>([['1,4', { state: 'hazard-rock', notes: ROCK_SLIDE_TILE_NOTE, lane: 1, depth: 4 }]]);
    const unit = { id: 'p1', faction: Faction.Player, lane: 1, depth: 3, isDead: () => false, morale: 0, moraleTurns: 0 };
    const state = {
        units: new Map([[unit.id, unit]]),
        unitDots: new Map(),
        formationZones: new Map(),
        stageSalvage: emptyStageSalvage(),
        plunderedTiles: new Set<string>(),
        recoveredRockSlides: 0,
        getTileEffect: (lane: number, depth: number) => tiles.get(`${lane},${depth}`) ?? null,
        removeTileEffect: (lane: number, depth: number) => { const e = tiles.get(`${lane},${depth}`) ?? null; tiles.delete(`${lane},${depth}`); return e; },
        getGeneral: () => null,
    };
    const context: BattleTileEffectPhaseContext = {
        state: state as never,
        actingFaction: Faction.Player,
        playerGeneralUnitId: null,
        enemyGeneralUnitId: null,
        applyUnitDamage: () => {},
        onGeneralUnitKilled: () => {},
        onUnitKilled: () => {},
        random: () => 0,
    };
    return { context, state };
}

export function createLootFloatTextSuite(): TestSuite {
    const suite = new TestSuite('LootFloatText');

    suite.test('資源清單略過 0，順序同軍師 HUD 回收欄', () => {
        assert.equals(JSON.stringify([{ name: '石材', amount: 120 }, { name: '武器材料', amount: 5 }]),
            JSON.stringify(salvageGainItems({ weaponMaterial: 5, stone: 120, wood: 0 })));
    });

    suite.test('落石與火燒都產生金色飄字，每項資源一行', () => {
        const rock = salvageLootTexts('rock-slide', [{ name: '石材', amount: 120 }, { name: '教官經驗', amount: 50 }]);
        assert.equals('+石材 120|+教官經驗 50', rock.map((t) => t.text).join('|'));
        assert.equals('gold', rock[0].color);
        assert.equals('+補給 300', salvageLootTexts('fire-raid', [{ name: '補給', amount: 300 }])[0].text);
        assert.lengthEquals(0, salvageLootTexts('fire-raid', []));
    });

    suite.test('擊破落石：入帳同時發出事件，帶落石格位置與本次資源', () => {
        services().initialize();
        const events: StageSalvageGainedEvent[] = [];
        const off = services().event.on(EVENT_NAMES.StageSalvageGained, (e: StageSalvageGainedEvent) => events.push(e));
        const { context, state } = rockContext();
        executeBattleTileEffectPhase(context);
        if (typeof off === 'function') off();
        assert.lengthEquals(1, events);
        assert.equals('rock-slide', events[0].source);
        assert.equals(1, events[0].lane);
        assert.equals(4, events[0].depth);
        assert.equals(100, events[0].gain.stone ?? -1);
        assert.equals(100, state.stageSalvage.stone);
    });

    return suite;
}
