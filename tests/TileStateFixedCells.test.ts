import { isFixedTileState } from '../assets/scripts/battle/shared/TileStateRules';
import { TestSuite, assert } from './TestRunner';

export function createTileStateFixedCellsSuite(): TestSuite {
  const suite = new TestSuite('TileStateFixedCells (固定地形格不被火場覆蓋 PROG-2-0758)');

  suite.test('掩體與營帳為固定格，火場不覆蓋', () => {
    assert.isTrue(isFixedTileState('ambush-field'));
    assert.isTrue(isFixedTileState('scene-camp'));
  });

  suite.test('落石等暫時性格子狀態可被火場覆蓋', () => {
    assert.isFalse(isFixedTileState('hazard-rock'));
    assert.isFalse(isFixedTileState('hazard-fire'));
    assert.isFalse(isFixedTileState('river-current'));
  });

  return suite;
}
