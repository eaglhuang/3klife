import { TestSuite, assert } from './TestRunner';
import { formationDefense, FORMATION_DEF_BONUS } from '../assets/scripts/battle/skills/SkillEffectFormulas';
import { squareCells } from '../assets/scripts/battle/skills/SkillGridGeometry';

export function createEightFormationSuite(): TestSuite {
  const suite = new TestSuite('EightFormation (八陣圖防禦區 PROG-2-0759)');

  suite.test('區域內防禦 ×1.4，區域外維持基礎', () => {
    assert.equals(0.4, FORMATION_DEF_BONUS);
    assert.equals(70, formationDefense(50, true));
    assert.equals(50, formationDefense(50, false));
  });

  suite.test('3x3 區域：中心 9 格，角落 4 格', () => {
    assert.equals(9, squareCells(2, 4, 1, 5, 8).length);
    assert.equals(4, squareCells(0, 0, 1, 5, 8).length);
  });

  return suite;
}
