/**
 * CombatCrit — 暴擊判定與暴擊傷害（SCN-06，PROG-2-0614）測試
 */
import * as fs from 'fs';
import * as path from 'path';
import { TestSuite, assert } from './TestRunner';
import {
    CRIT_BASE_RATE,
    CRIT_DAMAGE_MULTIPLIER,
    critDamageOf,
    critRateOf,
    rollCrit,
} from '../assets/scripts/core/systems/CombatCrit';

export function createCombatCritSuite(): TestSuite {
    const suite = new TestSuite('CombatCrit (暴擊系統 SCN-06)');

    suite.test('基礎暴擊率 5%，場景加成以個百分點疊加，夾在 0~100%', () => {
        assert.equals(0.05, CRIT_BASE_RATE);
        assert.equals(0.05, critRateOf());
        assert.equals(0.25, critRateOf(0.2));
        assert.equals(1, critRateOf(2));
        assert.equals(0, critRateOf(-1));
        assert.equals(0.05, critRateOf(Number.NaN));
    });

    suite.test('暴擊傷害 ×1.5，無條件捨去，至少 1', () => {
        assert.equals(1.5, CRIT_DAMAGE_MULTIPLIER);
        assert.equals(15, critDamageOf(10));
        assert.equals(16, critDamageOf(11));
        assert.equals(1, critDamageOf(0));
    });

    suite.test('擲骰：roll 小於暴擊率才暴擊；0 與 100% 不擲骰', () => {
        assert.isTrue(rollCrit(0.25, () => 0.2));
        assert.isFalse(rollCrit(0.25, () => 0.3));
        let called = false;
        const spy = () => { called = true; return 0.5; };
        assert.isFalse(rollCrit(0, spy));
        assert.isTrue(rollCrit(1, spy));
        assert.isFalse(called, '0 與 100% 不應消耗亂數');
    });

    suite.test('戰鬥結算在傷害結算前做暴擊判定，並改用戰場亂數源', () => {
        const source = fs.readFileSync(path.join(__dirname, '..', 'assets/scripts/battle/runtime/BattleCombatResolver.ts'), 'utf8');
        assert.isTrue(source.includes('if (rollCrit(critRate, this.hitRandom)) {'), '沒有接暴擊判定');
        assert.isTrue(source.includes('public hitRandom: () => number = () => services().session.randomSource();'), '命中擲骰仍用 Math.random');
    });

    return suite;
}
