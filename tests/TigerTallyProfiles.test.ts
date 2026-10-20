import { resolveBattleSkillProfile } from '../assets/scripts/battle/skills/BattleSkillProfiles';
import { BattleSkillTargetMode } from '../assets/scripts/shared/SkillRuntimeContract';
import { StatusEffect } from '../assets/scripts/core/config/Constants';
import { TestSuite, assert } from './TestRunner';

export function createTigerTallyProfilesSuite(): TestSuite {
  const suite = new TestSuite('TigerTallyProfiles (虎符戰法 G-1 第一批 PROG-2-0763)');

  suite.test('精銳突擊：衝鋒傷害 ×2.0，形狀為直線（規格 Self -> LineEnemy）', () => {
    const profile = resolveBattleSkillProfile('tally-charge');
    assert.isDefined(profile);
    assert.equals(2.0, profile!.chargeMultiplier);
    assert.equals(BattleSkillTargetMode.Line, profile!.targetMode);
    assert.equals(3, profile!.lineLength);
  });

  suite.test('火計連環：目標十字火場、火系標籤', () => {
    const profile = resolveBattleSkillProfile('tally-fire-chain');
    assert.isDefined(profile);
    assert.isTrue(profile!.hazardCross === true);
    assert.isTrue((profile!.tags ?? []).includes('fire'));
  });

  suite.test('幼麒天算：反擊 ×2、虛弱 1 回合、僅近戰觸發', () => {
    const profile = resolveBattleSkillProfile('tally-counter-weak');
    assert.isDefined(profile);
    assert.equals(2, profile!.counterRatio);
    assert.equals(StatusEffect.Weak, profile!.counterStatusEffect);
    assert.equals(1, profile!.counterStatusTurns);
    assert.isTrue(profile!.counterMeleeOnly === true);
  });

  suite.test('連環計：傷害 50% 共享，連結 1 格', () => {
    const profile = resolveBattleSkillProfile('tally-link');
    assert.isDefined(profile);
    assert.equals(0.5, profile!.linkShareRatio);
    assert.equals(1, profile!.linkRadius);
  });

  return suite;
}
