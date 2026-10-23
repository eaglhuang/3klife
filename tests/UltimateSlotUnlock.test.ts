/**
 * UltimateSlotUnlock.test.ts — 依轉生次數解鎖奧義欄位（ULT-03，PROG-2-1059）headless 測試
 *
 * 鎖住：1 轉只開奧義 1、5 轉全開；缺轉數的舊武將視為 1 轉；超出範圍的轉數夾回 1~5；
 * 寫入的解鎖旗標不修改輸入清單。
 */
import { assert, TestSuite } from './TestRunner';
import {
    isUltimateSlotUnlocked,
    withUltimateUnlockState,
} from '../assets/scripts/core/systems/UltimateSlotUnlock';
import type { GeneralUltimateSlotConfig } from '../assets/scripts/core/models/GeneralUnit';

function slotsOneToFive(): GeneralUltimateSlotConfig[] {
    return [1, 2, 3, 4, 5].map((n) => ({ slot: n, ultimateId: `ult-x-${n}`, unlockReincarnation: n }));
}

export function createUltimateSlotUnlockSuite(): TestSuite {
    const suite = new TestSuite('UltimateSlotUnlock (奧義欄位依轉數解鎖 ULT-03 PROG-2-1059)');

    suite.test('1 轉只解鎖奧義 1，5 轉全部解鎖', () => {
        const at1 = withUltimateUnlockState(slotsOneToFive(), 1).map((s) => s.isUnlocked);
        assert.equals('true,false,false,false,false', at1.join(','));
        const at5 = withUltimateUnlockState(slotsOneToFive(), 5).map((s) => s.isUnlocked);
        assert.equals('true,true,true,true,true', at5.join(','));
    });

    suite.test('缺轉數的舊武將視為 1 轉；超出範圍夾回 1~5', () => {
        assert.isTrue(isUltimateSlotUnlocked({ unlockReincarnation: 1 }, undefined));
        assert.isTrue(!isUltimateSlotUnlocked({ unlockReincarnation: 2 }, undefined));
        assert.isTrue(isUltimateSlotUnlocked({ unlockReincarnation: 5 }, 99));
        assert.isTrue(!isUltimateSlotUnlocked({ unlockReincarnation: 2 }, 0));
    });

    suite.test('不修改輸入清單', () => {
        const input = slotsOneToFive();
        withUltimateUnlockState(input, 3);
        assert.isTrue(input.every((s) => s.isUnlocked === undefined));
    });

    return suite;
}
