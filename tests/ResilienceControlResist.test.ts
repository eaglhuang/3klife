/**
 * ResilienceControlResist.test.ts — 虎符特性「韌性」受控 50% 抵抗（PROG-2-1627，使用者裁定 Q2）
 *
 * Unity 對照：像狀態抗性欄位，控制技能命中前先擲骰判定抵抗。
 */
import { Faction } from '../assets/scripts/core/config/Constants';
import type { TroopUnit } from '../assets/scripts/core/models/TroopUnit';
import { applyTallyPassive, RESILIENCE_CONTROL_RESIST_CHANCE } from '../assets/scripts/battle/shared/TallyPassive';
import { ControlOverrideSkillResolver } from '../assets/scripts/battle/skills/resolvers/ControlOverrideSkillResolver';
import { resolveBattleSkillProfile } from '../assets/scripts/battle/skills/BattleSkillProfiles';
import type { BattleSkillRequest } from '../assets/scripts/shared/SkillRuntimeContract';
import { createBattleSkillTestContext, createTestUnit } from './BattleSkillTestUtils';
import { TestSuite, assert } from './TestRunner';

const CONTROL_SKILL_ID = 'cao-cao-ult-control';
const RESILIENT_TALLY = 'tiger-tally-infantry-wall';

function castControl(target: TroopUnit, roll: number): { applied: boolean; controlled: boolean; reason: string | null | undefined } {
    const caster = createTestUnit('p1', Faction.Player, 2, 0);
    const { context } = createBattleSkillTestContext({ units: [caster, target] });
    let controlled = false;
    context.randomSource = () => roll;
    context.controlUnit = () => { controlled = true; return true; };
    const profile = resolveBattleSkillProfile(CONTROL_SKILL_ID)!;
    const request = {
        ownerUid: Faction.Player, battleSkillId: CONTROL_SKILL_ID,
        targetMode: profile.targetMode,
    } as unknown as BattleSkillRequest;
    const result = new ControlOverrideSkillResolver().execute(request, context);
    return { applied: result.applied, controlled, reason: result.blockedReason };
}

export function createResilienceControlResistSuite(): TestSuite {
    const suite = new TestSuite('ResilienceControlResist (韌性受控 50% 抵抗)');

    suite.test('帶「韌性」的陷陣營出陣後受控抵抗率為 50%；其他虎符為 0', () => {
        const resilient = createTestUnit('e1', Faction.Enemy, 2, 7);
        applyTallyPassive(resilient, RESILIENT_TALLY);
        assert.equals(RESILIENCE_CONTROL_RESIST_CHANCE, resilient.controlResistChance);
        const plain = createTestUnit('e2', Faction.Enemy, 2, 7);
        applyTallyPassive(plain, 'tiger-tally-xian-zhen');
        assert.equals(0, plain.controlResistChance);
    });

    suite.test('擲骰低於 50% 抵抗成功：不被控制，回報 control-resisted', () => {
        const target = createTestUnit('e1', Faction.Enemy, 2, 7);
        applyTallyPassive(target, RESILIENT_TALLY);
        const out = castControl(target, 0.2);
        assert.equals(false, out.applied);
        assert.equals(false, out.controlled);
        assert.equals('control-resisted', out.reason);
    });

    suite.test('擲骰高於 50% 抵抗失敗：照常被控制', () => {
        const target = createTestUnit('e1', Faction.Enemy, 2, 7);
        applyTallyPassive(target, RESILIENT_TALLY);
        const out = castControl(target, 0.8);
        assert.equals(true, out.applied);
        assert.equals(true, out.controlled);
    });

    suite.test('沒有韌性的部隊不擲骰，一律被控制', () => {
        const target = createTestUnit('e1', Faction.Enemy, 2, 7);
        const out = castControl(target, 0);
        assert.equals(true, out.applied);
        assert.equals(true, out.controlled);
    });

    return suite;
}
