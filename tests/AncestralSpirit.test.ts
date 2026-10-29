import { Faction } from '../assets/scripts/core/config/Constants';
import { ancestorSignatureSkillOf, ancestralSpiritAttackOf, isOutnumbered } from '../assets/scripts/battle/shared/AncestralSpirit';
import { TestSuite, assert } from './TestRunner';

const u = (faction: Faction, dead = false) => ({ faction, isDead: () => dead });

export function createAncestralSpiritSuite(): TestSuite {
  const suite = new TestSuite('AncestralSpirit (英靈附體 PROG-2-1587)');

  suite.test('兵力劣勢：我方存活 < 敵方 70%', () => {
    const units = [u(Faction.Player), u(Faction.Player), u(Faction.Enemy), u(Faction.Enemy), u(Faction.Enemy)];
    assert.isTrue(isOutnumbered(units, Faction.Player));
    assert.isFalse(isOutnumbered(units, Faction.Enemy));
    // 2 對 3 不算劣勢時的邊界：3 對 4（0.75）不觸發
    const even = [u(Faction.Player), u(Faction.Player), u(Faction.Player), u(Faction.Enemy), u(Faction.Enemy), u(Faction.Enemy), u(Faction.Enemy)];
    assert.isFalse(isOutnumbered(even, Faction.Player));
  });

  suite.test('死亡部隊不計；敵方全滅不算劣勢', () => {
    assert.isFalse(isOutnumbered([u(Faction.Player), u(Faction.Enemy, true)], Faction.Player));
    assert.isTrue(isOutnumbered([u(Faction.Player, true), u(Faction.Enemy)], Faction.Player));
  });

  suite.test('虛影攻擊基準 50%，本體沒有基準不觸發', () => {
    assert.equals(60, ancestralSpiritAttackOf(120) ?? -1);
    assert.equals(null, ancestralSpiritAttackOf(undefined));
  });

  suite.test('祖先成名奧義：取祖先模板的專屬奧義、槽位最小者（PROG-2-1603）', () => {
    const defs = [
      { templateId: 'guan-yu', slot: 2, exclusive: true, battleSkillId: 'second' },
      { templateId: 'guan-yu', slot: 1, exclusive: true, battleSkillId: 'guan-yu-slash' },
      { templateId: 'guan-yu', slot: 0, exclusive: false, battleSkillId: 'shared' },
      { templateId: 'zhang-fei', slot: 1, exclusive: true, battleSkillId: 'roar' },
    ];
    assert.equals('guan-yu-slash', ancestorSignatureSkillOf('guan-yu', defs) ?? '');
    assert.equals(null, ancestorSignatureSkillOf('liu-bei', defs));
    assert.equals(null, ancestorSignatureSkillOf(null, defs));
  });

  return suite;
}
