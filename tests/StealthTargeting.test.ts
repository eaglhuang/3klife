import * as fs from 'fs';
import * as path from 'path';
import { TestSuite, assert } from './TestRunner';
import { canTargetUnderStealth, isHiddenOnTile } from '../assets/scripts/battle/shared/StealthTile';

export function createStealthTargetingSuite(): TestSuite {
    const suite = new TestSuite('StealthTargeting (掩體格接進目標選取 GRD-04)');

    suite.test('掩體格上：遠程不能鎖定、近戰可以（純判定）', () => {
        assert.isTrue(isHiddenOnTile('ambush-field'));
        assert.isFalse(canTargetUnderStealth(2, true));
        assert.isTrue(canTargetUnderStealth(1, true));
        assert.isTrue(canTargetUnderStealth(2, false));
    });

    suite.test('戰鬥結算的目標選取改用攻擊者感知的掩體判定', () => {
        const source = fs.readFileSync(path.join(__dirname, '..', 'assets/scripts/battle/runtime/BattleCombatResolver.ts'), 'utf8');
        assert.isTrue(source.includes('private isHiddenFromAttacker(attacker: TroopUnit, target: TroopUnit): boolean {'), '缺少攻擊者感知的隱蔽判定');
        assert.isTrue(source.includes('canTargetUnderStealth(this.getEffectiveAttackRange(attacker), isHiddenOnTile(tileState))'), '隱蔽判定沒有接掩體格');
        assert.isTrue(source.includes('!this.isHiddenFromAttacker(unit, occupant)'), 'findCombatTarget 沒有改用攻擊者感知版本');
    });

    return suite;
}
