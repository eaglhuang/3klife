import * as fs from 'fs';
import * as path from 'path';
import { resolveBattleSkillProfile } from '../assets/scripts/battle/skills/BattleSkillProfiles';
import { BattleSkillTargetMode } from '../assets/scripts/shared/SkillRuntimeContract';
import { TestSuite, assert } from './TestRunner';

export function createInspDragonGallSuite(): TestSuite {
  const suite = new TestSuite('InspDragonGall (龍膽獨立效果 PROG-2-1700)');

  suite.test('龍膽：前排單體、爆擊率 +30%', () => {
    const profile = resolveBattleSkillProfile('insp-dragon-gall');
    assert.isDefined(profile);
    assert.equals(BattleSkillTargetMode.EnemySingle, profile!.targetMode);
    assert.equals(1, profile!.maxTargets);
    assert.equals(0.3, profile!.critRateBonus);
  });

  suite.test('戰法庫：龍膽改指向獨立 profile，不再共用虎符破甲', () => {
    const text = fs.readFileSync(path.join(__dirname, '../assets/resources/data/master/tactic-library.json'), 'utf-8');
    const at = text.indexOf('"id": "tactic-insp-dragon-gall"');
    assert.isTrue(text.slice(at, at + 800).includes('"battleSkillId": "insp-dragon-gall"'));
  });

  return suite;
}
