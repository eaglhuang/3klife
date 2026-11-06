/**
 * FloodgateCapture.test.ts — 水攻場景的水門佔領回收（關卡設計系統 G-2／§I Floodgate，PROG-2-1863 暫定）
 *
 * 水攻開局在淺灘最上游、最靠中路放一格水門；我方部隊站上即佔領，記入情報與補給，軍師 HUD 列存活／已回收。
 *
 * Unity 對照：像 PlayMode 測試把單位移到可佔領據點，跑一次 Tick，檢查戰利品與據點狀態。
 */
import { TestSuite, assert } from './TestRunner';
import { executeBattleTileEffectPhase, type BattleTileEffectPhaseContext } from '../assets/scripts/battle/runtime/phases/BattleTileEffectPhase';
import { emptyStageSalvage, FLOODGATE_CAPTURE_INTEL, FLOODGATE_CAPTURE_SUPPLY, FLOODGATE_TILE_NOTE } from '../assets/scripts/battle/shared/StageSalvage';
import { refreshFloodAttackTerrain } from '../assets/scripts/battle/shared/BattleTacticBehavior';
import { strategistHudInputOf } from '../assets/scripts/battle/shared/StrategistHudSource';
import { salvageLootTexts } from '../assets/scripts/battle/shared/TacticVfxHooks';
import { BattleState } from '../assets/scripts/battle/models/BattleState';
import { tileStateKindOf } from '../assets/scripts/battle/shared/TileStateRules';
import { BattleTactic, Faction, GAME_CONFIG } from '../assets/scripts/core/config/Constants';
import { services } from '../assets/scripts/core/managers/ServiceLoader';

function floodgates(state: BattleState): { lane: number; depth: number }[] {
    const out: { lane: number; depth: number }[] = [];
    state.tileEffects.forEach((effect) => { if (effect.notes === FLOODGATE_TILE_NOTE) out.push({ lane: effect.lane, depth: effect.depth }); });
    return out;
}

function unit(id: string, faction: Faction, lane: number, depth: number) {
    return { id, faction, lane, depth, isDead: () => false, morale: 0, moraleTurns: 0 };
}

function phaseContext(state: BattleState, units: ReturnType<typeof unit>[], actingFaction: Faction): BattleTileEffectPhaseContext {
    state.units.clear();
    for (const u of units) state.units.set(u.id, u as never);
    return {
        state,
        actingFaction,
        playerGeneralUnitId: null,
        enemyGeneralUnitId: null,
        applyUnitDamage: () => {},
        onGeneralUnitKilled: () => {},
        onUnitKilled: () => {},
        random: () => 0,
    };
}

function floodState(): BattleState {
    services().initialize();
    const state = new BattleState();
    state.battleTactic = BattleTactic.FloodAttack;
    refreshFloodAttackTerrain(state);
    return state;
}

export function createFloodgateCaptureSuite(): TestSuite {
    const suite = new TestSuite('FloodgateCapture (水門佔領回收 PROG-2-1863)');

    suite.test('水攻開局放一格水門：淺灘最上游、最靠中路，不影響移動與傷害', () => {
        const state = floodState();
        const gates = floodgates(state);
        assert.equals(1, gates.length);
        const gate = gates[0];
        assert.equals(Math.floor((GAME_CONFIG.GRID_LANES - 1) / 2), gate.lane);
        const effect = state.getTileEffect(gate.lane, gate.depth)!;
        assert.equals('normal', tileStateKindOf(effect));
        state.tileEffects.forEach((other) => {
            if (other.notes !== FLOODGATE_TILE_NOTE) assert.isTrue(other.depth >= gate.depth);
        });
        const hud = strategistHudInputOf(state);
        assert.isTrue(hud.interactiveObjects.some((obj) => obj.kind === 'Floodgate' && obj.state === 'alive'));
    });

    suite.test('我方部隊站上水門：佔領、入帳情報與補給、HUD 列已回收，重算水淹不再放', () => {
        const state = floodState();
        const gate = floodgates(state)[0];
        executeBattleTileEffectPhase(phaseContext(state, [unit('p1', Faction.Player, gate.lane, gate.depth)], Faction.Player));
        assert.equals(0, floodgates(state).length);
        assert.equals(1, state.capturedFloodgates);
        assert.equals(FLOODGATE_CAPTURE_INTEL, state.stageSalvage.intel);
        assert.equals(FLOODGATE_CAPTURE_SUPPLY, state.stageSalvage.supply);
        const hud = strategistHudInputOf(state);
        assert.isTrue(hud.interactiveObjects.some((obj) => obj.kind === 'Floodgate' && obj.state === 'recovered'));
        refreshFloodAttackTerrain(state);
        assert.equals(0, floodgates(state).length);
    });

    suite.test('敵方回合或敵軍站上：不佔領', () => {
        const state = floodState();
        const gate = floodgates(state)[0];
        executeBattleTileEffectPhase(phaseContext(state, [unit('e1', Faction.Enemy, gate.lane, gate.depth)], Faction.Enemy));
        assert.equals(1, floodgates(state).length);
        assert.equals(0, state.capturedFloodgates);
        assert.equals(0, state.stageSalvage.intel);
    });

    suite.test('水門飄字列出情報與補給', () => {
        const texts = salvageLootTexts('floodgate', [{ name: '情報', amount: 5 }, { name: '補給', amount: 150 }]).map((t) => t.text);
        assert.equals('+情報 5,+補給 150', texts.join(','));
        assert.equals(0, emptyStageSalvage().intel);
    });

    return suite;
}
