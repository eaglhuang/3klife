/**
 * 醫療（教官 G-2，THEAL）headless 測試（PROG-2-0793）
 * 規格：Target.HP = min(MaxHP, HP + (MaxHP − HP) × 0.25)，依目標已損 HP 計算。
 */
import { TestSuite, assert } from './TestRunner';
import { Faction, TroopType } from '../assets/scripts/core/config/Constants';
import { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { BattleSkillTargetMode } from '../assets/scripts/shared/SkillRuntimeContract';
import { resolveBattleSkillProfile } from '../assets/scripts/battle/skills/BattleSkillProfiles';
import { HealSkillResolver } from '../assets/scripts/battle/skills/resolvers/HealSkillResolver';
import type { BattleSkillExecutionContext } from '../assets/scripts/battle/skills/BattleSkillResolver';

function makeAlly(id: string, maxHp: number, currentHp: number): TroopUnit {
    const unit = new TroopUnit(id, TroopType.Infantry, Faction.Player, { hp: maxHp, attack: 10, defense: 5, moveRange: 1, attackRange: 1 });
    unit.currentHp = currentHp;
    return unit;
}

function makeContext(units: TroopUnit[]): BattleSkillExecutionContext {
    return {
        getFactionUnits: () => units,
        getOpposingUnits: () => [],
        getBoardCells: () => [],
        getUnit: (id: string) => units.find((unit) => unit.id === id) ?? null,
        getCasterGeneral: () => ({ maxHp: 999 }) as never,
        getTerrain: () => 0 as never,
        healUnit: (unit: TroopUnit, amount: number) => unit.heal(amount),
        emitSkillEffect: () => undefined,
    } as unknown as BattleSkillExecutionContext;
}

function medicalRequest(targetUnitUid: string) {
    return { ownerUid: Faction.Player, battleSkillId: 'medical-aid', targetUnitUid } as never;
}

export function createMedicalAidHealSuite(): TestSuite {
    const suite = new TestSuite('MedicalAidHeal (醫療 THEAL TAC-0002)');

    suite.test('醫療 profile：單體友軍、heal 結算、治療比例 25%，不帶傷害係數', () => {
        const profile = resolveBattleSkillProfile('medical-aid');
        assert.isTrue(profile !== null, '缺少醫療 profile');
        assert.equals(BattleSkillTargetMode.AllySingle, profile!.targetMode);
        assert.equals('heal', profile!.effectKind);
        assert.equals(0.25, profile!.healMissingRatio ?? -1);
        assert.equals(0, profile!.coefficient);
    });

    suite.test('醫療依目標已損 HP 的 25% 治療（100 最大、40 現有 → 回 15）', () => {
        const ally = makeAlly('ally-a', 100, 40);
        const result = new HealSkillResolver().execute(medicalRequest('ally-a'), makeContext([ally]));
        assert.isTrue(result.applied);
        assert.equals(55, ally.currentHp);
        assert.equals(15, result.deltas[0].deltaHp);
    });

    suite.test('醫療不用施放者最大 HP：同樣已損 60 的目標，治療量只看目標自身', () => {
        const ally = makeAlly('ally-b', 300, 240);
        const result = new HealSkillResolver().execute(medicalRequest('ally-b'), makeContext([ally]));
        assert.equals(15, ally.currentHp - 240);
        assert.equals(15, result.deltas[0].deltaHp);
    });

    suite.test('醫療不會溢補：已損 1 點時 25% 無條件捨去為 0，不治療、HP 不超過上限', () => {
        const ally = makeAlly('ally-c', 100, 99);
        const result = new HealSkillResolver().execute(medicalRequest('ally-c'), makeContext([ally]));
        assert.isFalse(result.applied);
        assert.equals(99, ally.currentHp);
    });

    suite.test('醫療治療到上限為止：已損 4 點回 1，HP 恰好達到上限', () => {
        const ally = makeAlly('ally-f', 100, 96);
        const result = new HealSkillResolver().execute(medicalRequest('ally-f'), makeContext([ally]));
        assert.isTrue(result.applied);
        assert.equals(97, ally.currentHp);
        assert.isTrue(ally.currentHp <= ally.getEffectiveMaxHp());
    });

    suite.test('醫療對滿血目標不加量，並回報 no-missing-hp 而非 applied', () => {
        const ally = makeAlly('ally-d', 100, 100);
        const result = new HealSkillResolver().execute(medicalRequest('ally-d'), makeContext([ally]));
        assert.isFalse(result.applied);
        assert.equals('no-missing-hp', result.blockedReason ?? '');
        assert.equals(100, ally.currentHp);
    });

    suite.test('既有仁德號召固定比例路徑不變：仍依施放者最大 HP 的 18%（下限 30）', () => {
        const ally = makeAlly('ally-e', 100, 10);
        const context = makeContext([ally]);
        context.getCasterGeneral = () => ({ maxHp: 1000 }) as never;
        const request = { ownerUid: Faction.Player, battleSkillId: 'liu-bei-rally', targetUnitUid: 'ally-e' } as never;
        const result = new HealSkillResolver().execute(request, context);
        assert.isTrue(result.applied);
        assert.equals(180, result.deltas[0].deltaHp);
    });

    return suite;
}
