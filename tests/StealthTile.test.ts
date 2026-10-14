/**
 * StealthTile — 掩體格隱蔽判定（GRD-04，PROG-2-0578）的純邏輯測試
 */
import { TestSuite, assert } from './TestRunner';
import { canTargetUnderStealth, isHiddenOnTile, isRangedAttack } from '../assets/scripts/battle/shared/StealthTile';

export function createStealthTileSuite(): TestSuite {
    const suite = new TestSuite('StealthTile (掩體隱蔽 GRD-04)');

    suite.test('只有站在 ambush-field 才算隱蔽，離開即失效', () => {
        assert.isTrue(isHiddenOnTile('ambush-field'));
        assert.isFalse(isHiddenOnTile('hazard-fire'));
        assert.isFalse(isHiddenOnTile(null));
        assert.isFalse(isHiddenOnTile(undefined));
    });

    suite.test('射程大於 1 為遠程，1 為近戰', () => {
        assert.isTrue(isRangedAttack(2));
        assert.isFalse(isRangedAttack(1));
    });

    suite.test('遠程攻擊無法鎖定隱蔽目標，非隱蔽目標照常', () => {
        assert.isFalse(canTargetUnderStealth(3, true));
        assert.isTrue(canTargetUnderStealth(3, false));
    });

    suite.test('近戰攻擊不受隱蔽影響', () => {
        assert.isTrue(canTargetUnderStealth(1, true));
    });

    return suite;
}
