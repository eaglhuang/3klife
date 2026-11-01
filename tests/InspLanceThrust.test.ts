import * as fs from 'fs';
import * as path from 'path';
import { resolveBattleSkillProfile } from '../assets/scripts/battle/skills/BattleSkillProfiles';
import { BattleSkillTargetMode } from '../assets/scripts/shared/SkillRuntimeContract';
import { TestSuite, assert } from './TestRunner';

export function createInspLanceThrustSuite(): TestSuite {
  const suite = new TestSuite('InspLanceThrust (長槍突刺獨立效果 PROG-2-1699)');

  suite.test('長槍突刺：直線貫穿 2 格、不衰減、無視 30% 防禦', () => {
    const profile = resolveBattleSkillProfile('insp-lance-thrust');
    assert.isDefined(profile);
    assert.equals(BattleSkillTargetMode.Line, profile!.targetMode);
    assert.equals(2, profile!.lineLength);
    assert.equals(2, profile!.maxTargets);
    assert.equals(undefined, profile!.falloffRule);
    assert.equals(0.3, profile!.defensePenetrationRatio);
  });

  suite.test('戰法庫：長槍突刺改指向獨立 profile', () => {
    const text = fs.readFileSync(path.join(__dirname, '../assets/resources/data/master/tactic-library.json'), 'utf-8');
    const at = text.indexOf('"id": "tactic-insp-lance-thrust"');
    assert.isTrue(text.slice(at, at + 800).includes('"battleSkillId": "insp-lance-thrust"'));
  });

  return suite;
}
