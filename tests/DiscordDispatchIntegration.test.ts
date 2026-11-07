/**
 * 離間接線（SCN-09，PROG-2-1985）：派發器 → 預設執行器 → DiscordSkillResolver → BattleState.controlUnit
 *
 * emitSkillEffect 換成空函式，避免測試環境需要事件服務。
 */
import { assert, TestSuite } from './TestRunner';
import { BattleState } from '../assets/scripts/battle/models/BattleState';
import { BattleSkillDispatcher } from '../assets/scripts/battle/runtime/BattleSkillDispatcher';
import { createDefaultBattleSkillExecutor } from '../assets/scripts/battle/skills/BattleSkillResolverFactory';
import { resolveBattleSkillProfile } from '../assets/scripts/battle/skills/BattleSkillProfiles';
import { tileSkillCategoryOf } from '../assets/scripts/battle/skills/special/TileSkillCategory';
import { Faction, TroopType } from '../assets/scripts/core/config/Constants';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { getBattleSkillPresentation } from '../assets/scripts/shared/BattleSkillPresentation';
import { SkillSourceType } from '../assets/scripts/shared/SkillRuntimeContract';

function troop(id: string, faction: Faction, lane: number, depth: number): TroopUnit {
    const u = new TroopUnit(id, TroopType.Infantry, faction, { hp: 100, attack: 30, defense: 10 });
    u.moveTo(lane, depth);
    return u;
}

function setup(enemies: Array<[string, number, number]>) {
    const state = new BattleState();
    state.playerGeneral = new GeneralUnit({ id: 'p-general', name: '測試武將', faction: Faction.Player, hp: 100, gender: 'male', vitality: 100, maxVitality: 100 } as never);
    state.addUnit(troop('player-unit', Faction.Player, 2, 0));
    for (const [id, lane, depth] of enemies) state.addUnit(troop(id, Faction.Enemy, lane, depth));
    const dispatcher = new BattleSkillDispatcher({ state, getPlayerGeneralUnitId: () => null, getEnemyGeneralUnitId: () => null, combatResolver: { getFactionUnits: (f: Faction) => [...state.units.values()].filter((u) => u.faction === f && u.currentHp > 0) } } as never, {} as never);
    const ctx = { ...dispatcher.buildBattleSkillExecutionContext(), emitSkillEffect: () => undefined };
    const executor = createDefaultBattleSkillExecutor();
    (dispatcher as unknown as { skillExecutor: unknown }).skillExecutor = {
        execute: (request: unknown) => executor.execute(request as never, ctx),
    };
    return { state, dispatcher };
}

const request = {
    sourceType: SkillSourceType.SeedTactic,
    ownerUid: 'player-unit',
    battleSkillId: 'sow-discord',
    targetMode: 'enemy-single',
    timing: 'active-cast',
} as never;

export function createDiscordDispatchIntegrationSuite(): TestSuite {
    const suite = new TestSuite('DiscordDispatchIntegration（SCN-09 離間接線 PROG-2-1985）');
    suite.test('資料表：sow-discord 有 profile，顯示標籤歸控制類', () => {
        assert.equals('discord', resolveBattleSkillProfile('sow-discord')!.effectKind ?? '');
        assert.equals('control', tileSkillCategoryOf(getBattleSkillPresentation('sow-discord').categoryTag));
    });
    suite.test('派發器施放：最前排敵兵倒戈 1 回合，回合結束換回', () => {
        const { state, dispatcher } = setup([['e1', 2, 5], ['e2', 2, 6]]);
        const result = dispatcher.executeBattleSkillRequest(request);
        assert.isTrue(result.applied);
        assert.equals(Faction.Player, state.units.get('e1')!.faction);
        assert.equals(Faction.Enemy, state.units.get('e2')!.faction);
        state.tickControlledUnits();
        assert.equals(Faction.Enemy, state.units.get('e1')!.faction);
    });
    suite.test('2 格內沒有同伴：不生效，陣營不變', () => {
        const { state, dispatcher } = setup([['e1', 2, 5], ['e2', 0, 8]]);
        const result = dispatcher.executeBattleSkillRequest(request);
        assert.isFalse(result.applied);
        assert.equals(Faction.Enemy, state.units.get('e1')!.faction);
    });
    return suite;
}
