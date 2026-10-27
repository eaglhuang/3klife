/**
 * GachaSyncRecord.test.ts — 各池抽卡記錄同步校驗（GCH-14，PROG-2-1256）headless 測試
 *
 * 鎖住：缺欄位與非法值從 0 開始、lastSsrPull 不可大於 totalPulls、
 * 客戶端通過校驗且總抽數不倒退才採用、倒退或不合法時保留伺服端、不修改輸入。
 */
import { assert, TestSuite } from './TestRunner';
import {
    normalizeGachaSyncRecord,
    reconcileGachaRecord,
    validateGachaSyncRecord,
    type GachaSyncRecord,
} from '../assets/scripts/core/systems/GachaSyncRecord';

const SERVER: GachaSyncRecord = { totalPulls: 47, pityCounter: 147, bondingPoints: 320, lastSsrPull: 30 };

export function createGachaSyncRecordSuite(): TestSuite {
    const suite = new TestSuite('GachaSyncRecord (抽卡記錄同步校驗 GCH-14 PROG-2-1256)');

    suite.test('缺欄位與不合法的值從 0 開始', () => {
        const record = normalizeGachaSyncRecord({ totalPulls: 5, pityCounter: -1, bondingPoints: 1.5 });
        assert.equals(5, record.totalPulls);
        assert.equals(0, record.pityCounter);
        assert.equals(0, record.bondingPoints);
        assert.equals(0, record.lastSsrPull);
        assert.equals(0, normalizeGachaSyncRecord(undefined).totalPulls);
    });

    suite.test('lastSsrPull 大於 totalPulls 時校驗失敗', () => {
        assert.equals(0, validateGachaSyncRecord(SERVER).length);
        const errors = validateGachaSyncRecord({ ...SERVER, lastSsrPull: 99 });
        assert.equals(1, errors.length);
    });

    suite.test('客戶端通過校驗且總抽數不倒退時採用客戶端記錄', () => {
        const client = { ...SERVER, totalPulls: 52, lastSsrPull: 51 };
        const result = reconcileGachaRecord(SERVER, client);
        assert.isTrue(result.ok);
        assert.equals(52, result.record.totalPulls);
    });

    suite.test('總抽數倒退時保留伺服端記錄並回報原因', () => {
        const result = reconcileGachaRecord(SERVER, { ...SERVER, totalPulls: 40, lastSsrPull: 10 });
        assert.isFalse(result.ok);
        if (result.ok) return;
        assert.equals('pulls-regressed', result.reason);
        assert.equals(47, result.record.totalPulls);
    });

    suite.test('客戶端校驗失敗時保留伺服端記錄；結義點數可減少', () => {
        const bad = reconcileGachaRecord(SERVER, { ...SERVER, totalPulls: 60, lastSsrPull: 99 });
        assert.isFalse(bad.ok);
        if (!bad.ok) assert.equals('invalid-client', bad.reason);

        const spent = reconcileGachaRecord(SERVER, { ...SERVER, totalPulls: 48, bondingPoints: 100 });
        assert.isTrue(spent.ok);
    });

    suite.test('同步不修改輸入', () => {
        const server = { ...SERVER };
        reconcileGachaRecord(server, { ...SERVER, totalPulls: 40 });
        assert.equals(47, server.totalPulls);
    });

    return suite;
}
