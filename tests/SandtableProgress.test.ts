/**
 * SandtableProgress.test.ts — 世界沙盤解鎖歷史、有效階段與遠征檔案輪廓（PROG-2-1200，HALL-08）
 */
import { assert, TestSuite } from './TestRunner';
import {
    effectiveSandtableStage,
    normalizeUnlockHistory,
    recordSandtableUnlock,
    sandtableStageIdOf,
    showExpeditionDossierSilhouette,
} from '../assets/scripts/core/systems/SandtableProgress';

export function createSandtableProgressSuite(): TestSuite {
    const suite = new TestSuite('SandtableProgress (PROG-2-1200 世界沙盤)');

    suite.test('官職短代碼對應到規格的階段代碼', () => {
        assert.equals('S1_CENTRAL', sandtableStageIdOf('S1'));
        assert.equals('S2_BORDER', sandtableStageIdOf('S2'));
        assert.equals('S3_GLOBAL', sandtableStageIdOf('S3'));
    });

    suite.test('normalize 過濾未知值、去重並依階段順序排序', () => {
        const result = normalizeUnlockHistory(['S2_BORDER', 'BOGUS', 'S1_CENTRAL', 'S2_BORDER', 42]);
        assert.equals('S1_CENTRAL,S2_BORDER', result.join(','));
    });

    suite.test('非陣列輸入回傳空歷史', () => {
        assert.equals(0, normalizeUnlockHistory(undefined).length);
        assert.equals(0, normalizeUnlockHistory('S1_CENTRAL').length);
    });

    suite.test('記錄解鎖只增不減，重複記錄不產生重複階段', () => {
        let history = recordSandtableUnlock([], 'S1_CENTRAL');
        history = recordSandtableUnlock(history, 'S2_BORDER');
        history = recordSandtableUnlock(history, 'S2_BORDER');
        assert.equals('S1_CENTRAL,S2_BORDER', history.join(','));
    });

    suite.test('天下重組後官職降回 S1，有效階段仍為歷史最高的 S2，不倒退', () => {
        const history: ReturnType<typeof normalizeUnlockHistory> = ['S1_CENTRAL', 'S2_BORDER'];
        assert.equals('S2_BORDER', effectiveSandtableStage('S1_CENTRAL', history)!);
    });

    suite.test('官職階段比歷史更高時以官職為準', () => {
        assert.equals('S3_GLOBAL', effectiveSandtableStage('S3_GLOBAL', ['S1_CENTRAL'])!);
    });

    suite.test('沒有官職也沒有歷史時為 null（尚未開放）', () => {
        assert.isTrue(effectiveSandtableStage(null, []) === null);
    });

    suite.test('只有歷史、官職為 null 時仍顯示歷史階段', () => {
        assert.equals('S2_BORDER', effectiveSandtableStage(null, ['S2_BORDER'])!);
    });

    suite.test('遠征檔案輪廓只在 S3 顯示', () => {
        assert.isFalse(showExpeditionDossierSilhouette(null));
        assert.isFalse(showExpeditionDossierSilhouette('S1_CENTRAL'));
        assert.isFalse(showExpeditionDossierSilhouette('S2_BORDER'));
        assert.isTrue(showExpeditionDossierSilhouette('S3_GLOBAL'));
    });

    return suite;
}
