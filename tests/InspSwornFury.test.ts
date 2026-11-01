import * as fs from 'fs';
import * as path from 'path';
import { resolveBattleSkillProfile } from '../assets/scripts/battle/skills/BattleSkillProfiles';
import { BattleSkillTargetMode } from '../assets/scripts/shared/SkillRuntimeContract';
import { TestSuite, assert } from './TestRunner';

export function createInspSwornFurySuite(): TestSuite {
  const suite = new TestSuite('InspSwornFury (結義之怒獨立效果 PROG-2-1701)');

  suite.test('結義之怒：前方扇形 2 格、不衰減、爆擊率 +20%', () => {
    const profile = resolveBattleSkillProfile('insp-sworn-fury');
    assert.isDefined(profile);
    assert.equals(BattleSkillTargetMode.Fan, profile!.targetMode);
    assert.equals(2, profile!.fanDepth);
    assert.equals(undefined, profile!.falloffRule);
    assert.equals(0.2, profile!.critRateBonus);
  });

  suite.test('戰法庫：結義之怒改指向獨立 profile，不再借用呂布', () => {
    const text = fs.readFileSync(path.join(__dirname, '../assets/resources/data/master/tactic-library.json'), 'utf-8');
    const at = text.indexOf('"id": "tactic-insp-sworn-fury"');
    assert.isTrue(text.slice(at, at + 800).includes('"battleSkillId": "insp-sworn-fury"'));
  });

  return suite;
}
