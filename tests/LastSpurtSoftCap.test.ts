/**
 * LastSpurtSoftCap.test.ts — 破釜沉舟殘局切換與 STR 軟上限（FORM-06，PROG-2-1296）headless 測試
 *
 * 鎖住：第 4 回合前不切換、第 5 回合起切換；STR 500 時係數為 1；1200 以下照平方根；
 * 1200 以上溢出部分乘 0.5 且與 1200 處連續；非有限值與非正值為 0。
 */
import { assert, TestSuite } from './TestRunner';
import {
    isLastSpurtTurn,
    STR_SOFT_CAP,
    strPowerFactor,
} from '../assets/scripts/core/systems/LastSpurtSoftCap';

const near = (a: number, b: number): boolean => Math.abs(a - b) < 1e-9;

export function createLastSpurtSoftCapSuite(): TestSuite {
    const suite = new TestSuite('LastSpurtSoftCap (破釜沉舟殘局與 STR 軟上限 FORM-06 PROG-2-1296)');

    suite.test('第 4 回合前不切殘局，第 5 回合起切換', () => {
        assert.isFalse(isLastSpurtTurn(4));
        assert.isTrue(isLastSpurtTurn(5));
        assert.isTrue(isLastSpurtTurn(6));
    });

    suite.test('1200 以下照 sqrt(STR / 500)：500 為 1，300 為 sqrt(0.6)', () => {
        assert.isTrue(near(strPowerFactor(500), 1));
        assert.isTrue(near(strPowerFactor(300), Math.sqrt(0.6)));
        assert.isTrue(near(strPowerFactor(STR_SOFT_CAP), Math.sqrt(2.4)));
    });

    suite.test('超過 1200 的溢出部分平方根係數乘 0.5', () => {
        const capped = Math.sqrt(2.4);
        const raw = Math.sqrt(3.4);
        assert.isTrue(near(strPowerFactor(1700), capped + 0.5 * (raw - capped)));
    });

    suite.test('軟上限在 1200 處連續，且係數隨 STR 遞增', () => {
        assert.isTrue(Math.abs(strPowerFactor(1200.0001) - strPowerFactor(1200)) < 1e-5);
        assert.isTrue(strPowerFactor(1500) > strPowerFactor(1200));
        assert.isTrue(strPowerFactor(1800) - strPowerFactor(1500) < strPowerFactor(1500) - strPowerFactor(1200) + 1e-9);
    });

    suite.test('STR 為 0、負數或非有限值時係數為 0', () => {
        assert.equals(0, strPowerFactor(0));
        assert.equals(0, strPowerFactor(-10));
        assert.equals(0, strPowerFactor(Number.NaN));
        assert.equals(0, strPowerFactor(Number.POSITIVE_INFINITY));
    });

    return suite;
}
