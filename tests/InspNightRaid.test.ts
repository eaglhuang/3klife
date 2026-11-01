import * as fs from 'fs';
import * as path from 'path';
import { resolveBattleSkillProfile } from '../assets/scripts/battle/skills/BattleSkillProfiles';
import { weatherDamageMultiplierOf } from '../assets/scripts/battle/skills/BattleSkillDamageResolver';
import { BattleSkillTargetMode } from '../assets/scripts/shared/SkillRuntimeContract';
import { Weather } from '../assets/scripts/core/config/Constants';
import { TestSuite, assert } from './TestRunner';

export function createInspNightRaidSuite(): TestSuite {
  const suite = new TestSuite('InspNightRaid (夜襲獨立效果 PROG-2-1698)');

  suite.test('夜襲：前排單體，夜晚傷害 ×1.5，其他天氣不變', () => {
    const profile = resolveBattleSkillProfile('insp-night-raid');
    assert.isDefined(profile);
    assert.equals(BattleSkillTargetMode.EnemySingle, profile!.targetMode);
    assert.equals(1.5, weatherDamageMultiplierOf(profile!, Weather.Night));
    assert.equals(1, weatherDamageMultiplierOf(profile!, Weather.Clear));
  });

  suite.test('未設定天氣倍率的戰法一律 ×1', () => {
    assert.equals(1, weatherDamageMultiplierOf({}, Weather.Night));
  });

  suite.test('戰法庫：夜襲改指向獨立 profile', () => {
    const text = fs.readFileSync(path.join(__dirname, '../assets/resources/data/master/tactic-library.json'), 'utf-8');
    const at = text.indexOf('"id": "tactic-insp-night-raid"');
    assert.isTrue(text.slice(at, at + 800).includes('"battleSkillId": "insp-night-raid"'));
  });

  return suite;
}
