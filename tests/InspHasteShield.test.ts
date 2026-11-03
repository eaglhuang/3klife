import * as fs from 'fs';
import * as path from 'path';
import { resolveBattleSkillProfile } from '../assets/scripts/battle/skills/BattleSkillProfiles';
import { BattleSkillTargetMode } from '../assets/scripts/shared/SkillRuntimeContract';
import { StatusEffect } from '../assets/scripts/core/config/Constants';
import { FORTIFIED_DEFENSE_MULTIPLIER } from '../assets/scripts/battle/runtime/BattleCombatResolver';
import { TestSuite, assert } from './TestRunner';

export function createInspHasteShieldSuite(): TestSuite {
  const suite = new TestSuite('InspHasteShield (疾行／堅盾獨立效果 PROG-2-1600)');

  suite.test('疾行：全體友軍掛 Haste 1 回合', () => {
    const profile = resolveBattleSkillProfile('insp-haste');
    assert.isDefined(profile);
    assert.equals(BattleSkillTargetMode.AllyAll, profile!.targetMode);
    assert.equals(StatusEffect.Haste, profile!.statusEffect);
    assert.equals(1, profile!.statusTurns);
  });

  suite.test('堅盾：全體友軍掛 Fortified 1 回合，防禦 ×1.2', () => {
    const profile = resolveBattleSkillProfile('insp-shield');
    assert.isDefined(profile);
    assert.equals(StatusEffect.Fortified, profile!.statusEffect);
    assert.equals(1.2, FORTIFIED_DEFENSE_MULTIPLIER);
  });

  suite.test('戰法庫：疾行／堅盾改指向獨立 profile', () => {
    const raw = fs.readFileSync(path.join(__dirname, '../assets/resources/data/master/tactic-library.json'), 'utf-8');
    const text = raw;
    const pick = (id: string): string => text.slice(text.indexOf(`"id": "${id}"`), text.indexOf(`"id": "${id}"`) + 800);
    assert.isTrue(pick('tactic-insp-haste').includes('"battleSkillId": "insp-haste"'));
    assert.isTrue(pick('tactic-insp-shield').includes('"battleSkillId": "insp-shield"'));
  });

  return suite;
}
