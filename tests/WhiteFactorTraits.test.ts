import { calmAdjustedAura, calmReductionOf, furyModifiersOf } from '../assets/scripts/core/systems/WhiteFactorTraits';
import { TestSuite, assert } from './TestRunner';

const round = (v: number): number => Math.round(v * 1000) / 1000;

export function createWhiteFactorTraitsSuite(): TestSuite {
  const suite = new TestSuite('WhiteFactorTraits (白色因子冷靜／暴躁 PROG-2-1586)');

  suite.test('冷靜：每級減免 10%，鎖定不算', () => {
    assert.equals(0.3, round(calmReductionOf([{ id: 'gene_calm', level: 3 }])));
    assert.equals(0, calmReductionOf([{ id: 'gene_calm', level: 3, isLocked: true }]));
    assert.equals(0, calmReductionOf(undefined));
  });

  suite.test('冷靜縮小恐懼懲罰：0.8 → 0.86（3 級）；無懲罰不變', () => {
    assert.equals(0.86, round(calmAdjustedAura(0.8, [{ id: 'gene_calm', level: 3 }])));
    assert.equals(1, calmAdjustedAura(1, [{ id: 'gene_calm', level: 3 }]));
  });

  suite.test('暴躁：每級攻擊 +3%、防禦 −3%', () => {
    const mods = furyModifiersOf([{ id: 'gene_fury', level: 2 }]);
    assert.equals(1.06, round(mods.attack));
    assert.equals(0.94, round(mods.defense));
    assert.equals(1, furyModifiersOf([]).attack);
  });

  return suite;
}
