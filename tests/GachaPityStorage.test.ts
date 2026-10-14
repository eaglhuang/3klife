/**
 * GachaPityStorage.test.ts — 轉蛋保底計數進存檔的 headless 測試（PROG-2-0337）
 *
 * 覆蓋：存讀往返、舊檔缺欄位從 0 開始、壞資料丟棄、舊 localStorage 遷移判定。
 *
 * Unity 對照：像 PlayerPrefs 換成 ScriptableObject 存檔欄位，讀寫都走同一個序列化入口。
 */
import { assert, TestSuite } from './TestRunner';
import { normalizeGachaPityBook, resolveGachaPityBook } from '../assets/scripts/core/systems/GachaDraw';
import { createPlayerSaveSnapshot, normalizeGachaWalletSave, validatePlayerSaveSnapshot } from '../assets/scripts/core/services/PlayerSaveService';
import { createInitialGameTimeState } from '../assets/scripts/core/systems/GameClock';

const TIME = createInitialGameTimeState();

export function createGachaPityStorageSuite(): TestSuite {
    const suite = new TestSuite('GachaPityStorage (保底進存檔 PROG-2-0337)');

    suite.test('存檔往返：保底計數寫入快照後讀回仍相同', () => {
        const snapshot = createPlayerSaveSnapshot(TIME, [], new Date(0), undefined, [], null, 1, undefined, 0, undefined, 0, [], {}, {}, {}, undefined, {}, { HERO: { pullCount: 37 } });
        const restored = validatePlayerSaveSnapshot(JSON.parse(JSON.stringify(snapshot)));
        assert.equals(37, restored.gachaPity?.HERO?.pullCount ?? -1);
    });

    suite.test('舊檔沒有 gachaPity 欄位：讀回不帶此欄位，視為從 0 開始', () => {
        const snapshot = createPlayerSaveSnapshot(TIME, [], new Date(0));
        assert.isFalse('gachaPity' in snapshot);
        const restored = validatePlayerSaveSnapshot(JSON.parse(JSON.stringify(snapshot)));
        assert.isTrue(restored.gachaPity === undefined);
        assert.equals(0, normalizeGachaPityBook(restored.gachaPity)['HERO']?.pullCount ?? 0);
    });

    suite.test('壞資料：空 poolId 丟棄、計數不合法的池從 0 開始', () => {
        const book = normalizeGachaPityBook({ '': { pullCount: 9 }, HERO: { pullCount: -4 }, SUPPORT: { pullCount: 2.5 }, LIMITED: { pullCount: 6 } });
        assert.isTrue(!('' in book));
        assert.equals(0, book.HERO.pullCount);
        assert.equals(0, book.SUPPORT.pullCount);
        assert.equals(6, book.LIMITED.pullCount);
        assert.equals(0, Object.keys(normalizeGachaPityBook(null)).length);
        assert.equals(0, Object.keys(normalizeGachaPityBook([1, 2])).length);
    });

    suite.test('遷移：存檔有資料時忽略舊 localStorage', () => {
        const result = resolveGachaPityBook({ HERO: { pullCount: 12 } }, { HERO: { pullCount: 99 } });
        assert.equals(12, result.book.HERO.pullCount);
        assert.isFalse(result.migrateLegacy);
    });

    suite.test('遷移：存檔為空、舊 localStorage 有資料時一次性遷移', () => {
        const result = resolveGachaPityBook({}, { HERO: { pullCount: 99 } });
        assert.equals(99, result.book.HERO.pullCount);
        assert.isTrue(result.migrateLegacy);
    });

    suite.test('遷移：兩邊都沒有資料時回傳空表、不遷移', () => {
        const result = resolveGachaPityBook(undefined, null);
        assert.equals(0, Object.keys(result.book).length);
        assert.isFalse(result.migrateLegacy);
    });

    suite.test('錢包存檔往返；舊檔沒有錢包欄位時讀回為 undefined', () => {
        const withWallet = createPlayerSaveSnapshot(TIME, [], new Date(0), undefined, [], null, 1, undefined, 0, undefined, 0, [], {}, {}, {}, undefined, {}, {}, { gems: 1200, gold: 5000, tickets: 7 });
        const restored = validatePlayerSaveSnapshot(JSON.parse(JSON.stringify(withWallet)));
        assert.equals(1200, restored.gachaWallet?.gems ?? -1);
        assert.equals(7, restored.gachaWallet?.tickets ?? -1);
        const legacy = validatePlayerSaveSnapshot(JSON.parse(JSON.stringify(createPlayerSaveSnapshot(TIME, [], new Date(0)))));
        assert.isTrue(legacy.gachaWallet === undefined);
    });

    suite.test('錢包欄位壞掉時補 0，不會變成負數或 NaN', () => {
        const wallet = normalizeGachaWalletSave({ gems: -5, gold: 'x', tickets: 3.9 });
        assert.equals(0, wallet.gems);
        assert.equals(0, wallet.gold);
        assert.equals(3, wallet.tickets);
    });

    return suite;
}
