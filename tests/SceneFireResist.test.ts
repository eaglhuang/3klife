/**
 * 火燒偷襲戰我方火抗 +50%（戰法場景規格書 B-3，PROG-2-1459）headless 測試
 *
 * 覆蓋：火攻場景我方站火格每回合傷害減半、敵方不減；非火攻場景不減；
 * 火計傷害經 context.getSceneFireDamageTakenMultiplier 減半，非火計不變。
 */
import { TestSuite, assert } from './TestRunner';
import { executeBattleTileEffectPhase, type BattleTileEffectPhaseContext } from '../assets/scripts/battle/runtime/phases/BattleTileEffectPhase';
import { FIRE_RAID_PLAYER_FIRE_DAMAGE_TAKEN, sceneFireDamageTakenOf } from '../assets/scripts/battle/shared/BattleTacticBehavior';
import { BattleSkillDamageResolver } from '../assets/scripts/battle/skills/BattleSkillDamageResolver';
import { resolveBattleSkillProfile } from '../assets/scripts/battle/skills/BattleSkillProfiles';
import { BattleTactic, Faction } from '../assets/scripts/core/config/Constants';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import type { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { createBattleSkillTestContext, createTestGeneral, createTestUnit } from './BattleSkillTestUtils';

const TILE_DAMAGE = 15;

function stubUnit(id: string, faction: Faction) {
    return { id, faction, lane: 1, depth: 3, isDead: () => false, morale: 0, moraleTurns: 0 };
}

/** 最小戰場狀態：每格都是火格，回傳本回合各單位承受的格子傷害 */
function tickFireTiles(battleTactic: BattleTactic, faction: Faction): number {
    const unit = stubUnit('u1', faction);
    const state = {
        battleTactic,
        units: new Map([[unit.id, unit]]),
        unitDots: new Map(),
        formationZones: new Map(),
        getTileEffect: () => ({ id: 'fire-1-3', lane: 1, depth: 3, state: 'hazard-fire', damagePerTurn: TILE_DAMAGE }),
        getGeneral: () => null,
    };
    let dealt = -1;
    const context: BattleTileEffectPhaseContext = {
        state: state as never,
        actingFaction: faction,
        playerGeneralUnitId: null,
        enemyGeneralUnitId: null,
        applyUnitDamage: (_unit, damage) => { dealt = damage; },
        onGeneralUnitKilled: () => {},
        onUnitKilled: () => {},
    };
    executeBattleTileEffectPhase(context);
    return dealt;
}

export function createSceneFireResistSuite(): TestSuite {
    const suite = new TestSuite('SceneFireResist (火燒偷襲戰我方火抗 PROG-2-1459)');

    suite.test('火攻場景：我方站火格每回合傷害 ×0.5', () => {
        services().initialize();
        assert.equals(Math.floor(TILE_DAMAGE * FIRE_RAID_PLAYER_FIRE_DAMAGE_TAKEN), tickFireTiles(BattleTactic.FireAttack, Faction.Player));
    });

    suite.test('火攻場景：敵方站火格傷害不減', () => {
        services().initialize();
        assert.equals(TILE_DAMAGE, tickFireTiles(BattleTactic.FireAttack, Faction.Enemy));
    });

    suite.test('非火攻場景：我方火格傷害不減', () => {
        services().initialize();
        assert.equals(TILE_DAMAGE, tickFireTiles(BattleTactic.Normal, Faction.Player));
        assert.equals(TILE_DAMAGE, tickFireTiles(BattleTactic.NightRaid, Faction.Player));
    });

    suite.test('sceneFireDamageTakenOf：只有火攻場景的我方是 0.5', () => {
        const player = { faction: Faction.Player } as unknown as TroopUnit;
        const enemy = { faction: Faction.Enemy } as unknown as TroopUnit;
        const fireState = { battleTactic: BattleTactic.FireAttack } as never;
        const normalState = { battleTactic: BattleTactic.Normal } as never;
        assert.equals(0.5, sceneFireDamageTakenOf(player, fireState));
        assert.equals(1, sceneFireDamageTakenOf(enemy, fireState));
        assert.equals(1, sceneFireDamageTakenOf(player, normalState));
    });

    suite.test('火計傷害：context 給場景倍率 0.5 時減半，非火計不變', () => {
        const base = resolveBattleSkillProfile('cao-cao-tactics');
        assert.isDefined(base);
        const fireProfile = { ...base!, tags: ['fire'] };
        const caster = createTestGeneral('enemy-general', Faction.Enemy, { str: 40, int: 110, lea: 80 });
        const target = createTestUnit('player', Faction.Player, 2, 3, { defense: 40 });
        const bundle = createBattleSkillTestContext({
            playerGeneral: createTestGeneral('cao-cao', Faction.Player),
            enemyGeneral: caster,
            units: [target],
        });
        const resolver = new BattleSkillDamageResolver();
        const plainFire = resolver.resolveDamage(fireProfile, caster, target, bundle.context, 0);
        const plainSkill = resolver.resolveDamage(base!, caster, target, bundle.context, 0);
        const resisted = { ...bundle.context, getSceneFireDamageTakenMultiplier: () => FIRE_RAID_PLAYER_FIRE_DAMAGE_TAKEN };
        assert.equals(Math.max(1, Math.floor(plainFire * 0.5)), resolver.resolveDamage(fireProfile, caster, target, resisted, 0));
        assert.equals(plainSkill, resolver.resolveDamage(base!, caster, target, resisted, 0));
    });

    return suite;
}
