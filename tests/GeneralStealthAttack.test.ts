import * as fs from 'fs';
import * as path from 'path';
import { TestSuite, assert } from './TestRunner';

export function createGeneralStealthAttackSuite(): TestSuite {
    const suite = new TestSuite('GeneralStealthAttack (武將直接攻擊套用掩體格 GRD-04)');

    suite.test('canAttackGeneral 先檢查敵方武將所在格的掩體，遠程不可攻擊', () => {
        const source = fs.readFileSync(path.join(__dirname, '..', 'assets/scripts/battle/runtime/BattleCombatResolver.ts'), 'utf8');
        const start = source.indexOf('private canAttackGeneral(unit: TroopUnit): boolean {');
        assert.isTrue(start >= 0, '找不到 canAttackGeneral');
        const body = source.slice(start, start + 900);
        assert.isTrue(body.includes('isHiddenOnTile(tileState)'), 'canAttackGeneral 沒有檢查掩體格');
        assert.isTrue(body.includes('canTargetUnderStealth(this.getEffectiveAttackRange(unit), isHiddenOnTile(tileState))'), '沒有用遠程／近戰判定');
    });

    return suite;
}
