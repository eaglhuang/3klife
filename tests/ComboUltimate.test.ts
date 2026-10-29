import { findComboUltimate } from '../assets/scripts/battle/shared/ComboUltimate';
import { TestSuite, assert } from './TestRunner';

export function createComboUltimateSuite(): TestSuite {
  const suite = new TestSuite('ComboUltimate (組合奧義 PROG-2-1588)');

  suite.test('周瑜施放、場上有諸葛亮來源部隊 → 赤壁大火（雙向）', () => {
    assert.equals('赤壁大火', findComboUltimate('zhou-yu', [null, 'zhuge-liang'])?.name ?? '');
    assert.equals('赤壁大火', findComboUltimate('zhuge-liang', ['zhou-yu'])?.name ?? '');
  });

  suite.test('沒有搭檔或不在表中 → null', () => {
    assert.equals(null, findComboUltimate('zhou-yu', ['cao-cao', null]));
    assert.equals(null, findComboUltimate('lu-bu', ['zhuge-liang']));
  });

  return suite;
}
