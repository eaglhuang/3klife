/**
 * UltimateUpgrade.test.ts — 奧義升級與奧義圖鑑（ULT-16，PROG-2-1251）headless 測試
 *
 * 鎖住：重複抽升級已解鎖欄位、新解鎖欄位從 Lv 1 開始、未解鎖為 Lv 0、
 * 舊存檔缺等級視為 Lv 1、不修改輸入、圖鑑只列已解鎖且以轉數判定。
 */
import { assert, TestSuite } from './TestRunner';
import {
    buildUltimateCodex,
    ultimateLevelOf,
    upgradeUltimatesOnDuplicate,
} from '../assets/scripts/core/systems/UltimateUpgrade';
import type { GeneralUltimateSlotConfig } from '../assets/scripts/core/models/GeneralUnit';

function slotsOf(): GeneralUltimateSlotConfig[] {
    return [1, 2, 3, 4, 5].map((n) => ({ slot: n, ultimateId: `ult-test-${n}`, unlockReincarnation: n }));
}

export function createUltimateUpgradeSuite(): TestSuite {
    const suite = new TestSuite('UltimateUpgrade (奧義升級與圖鑑 ULT-16 PROG-2-1251)');

    suite.test('重複抽升級已解鎖欄位，本次新解鎖的欄位從 Lv 1 開始', () => {
        const slots = slotsOf().map((slot) => ({ ...slot, ultLevel: 2 }));
        const next = upgradeUltimatesOnDuplicate(slots, 2, 3);
        assert.equals(3, next[0].ultLevel!);
        assert.equals(3, next[1].ultLevel!);
        assert.equals(1, next[2].ultLevel!);
        assert.equals(0, next[3].ultLevel!);
        assert.isTrue(next[2].isUnlocked === true);
        assert.isTrue(next[3].isUnlocked === false);
    });

    suite.test('舊存檔缺等級的已解鎖欄位視為 Lv 1，重複後為 Lv 2', () => {
        const next = upgradeUltimatesOnDuplicate(slotsOf(), 1, 1);
        assert.equals(2, next[0].ultLevel!);
        assert.equals(0, next[1].ultLevel!);
    });

    suite.test('未解鎖欄位等級為 0；已解鎖缺欄位為 Lv 1', () => {
        const [first, second] = slotsOf();
        assert.equals(1, ultimateLevelOf(first, 1));
        assert.equals(0, ultimateLevelOf(second, 1));
        assert.equals(0, ultimateLevelOf({ ...second, ultLevel: 5 }, 1));
    });

    suite.test('非法等級（負數、NaN）當 Lv 1，小數向下取整', () => {
        const base = slotsOf()[0];
        assert.equals(1, ultimateLevelOf({ ...base, ultLevel: -3 }, 5));
        assert.equals(1, ultimateLevelOf({ ...base, ultLevel: Number.NaN }, 5));
        assert.equals(4, ultimateLevelOf({ ...base, ultLevel: 4.9 }, 5));
    });

    suite.test('升級回傳新清單，不修改輸入', () => {
        const slots = slotsOf();
        const next = upgradeUltimatesOnDuplicate(slots, 5, 5);
        assert.equals(undefined, slots[0].ultLevel);
        assert.equals(2, next[0].ultLevel!);
    });

    suite.test('奧義圖鑑只列已解鎖的奧義，且以轉數判定而非存檔旗標', () => {
        const generals = [
            { id: 'guan-yu', rebirthCount: 2, ultimateSlots: slotsOf().map((slot) => ({ ...slot, isUnlocked: false })) },
            { id: 'zhao-yun', ultimateSlots: slotsOf().map((slot) => ({ ...slot, isUnlocked: true, ultLevel: 3 })) },
        ];
        const rows = buildUltimateCodex(generals);
        assert.equals(3, rows.length);
        assert.equals('guan-yu', rows[0].generalId);
        assert.equals('ult-test-1', rows[0].ultimateId);
        assert.equals(1, rows[0].level);
        assert.equals(2, rows[1].slot);
        assert.equals('zhao-yun', rows[2].generalId);
        assert.equals(3, rows[2].level);
    });

    return suite;
}
