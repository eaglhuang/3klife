/**
 * PlayerSaveBackup.test.ts — 存檔備份與壞檔自動退回上一份（DS-14，PROG-2-0885）
 *
 * 檢查：寫入前保留上一份有效主檔到備份槽；主檔壞掉時退回備份並記錄；
 * 備份也壞、或沒有備份時拋出主檔錯誤；壞檔不會覆蓋好的備份；clear 同時清掉備份。
 *
 * Unity 對照：像存檔前先複製一份 .bak，讀檔 Parse 失敗就改讀 .bak，兩份都壞才報錯。
 */
import { TestSuite, assert } from './TestRunner';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import {
    PlayerSaveService,
    PLAYER_SAVE_KEY,
    PLAYER_SAVE_BACKUP_SUFFIX,
    createPlayerSaveSnapshot,
} from '../assets/scripts/core/services/PlayerSaveService';
import { createInitialGameTimeState } from '../assets/scripts/core/systems/GameClock';

function snapshotWith(stageId: string) {
    return createPlayerSaveSnapshot(createInitialGameTimeState(), [], new Date(0), undefined, [], null, 1, undefined, 0, undefined, 0, [stageId]);
}

export function createPlayerSaveBackupSuite(): TestSuite {
    const suite = new TestSuite('PlayerSaveBackup (存檔備份退回 DS-14)');
    const backupKey = `${PLAYER_SAVE_KEY}${PLAYER_SAVE_BACKUP_SUFFIX}`;

    suite.test('第二次寫入前，第一份有效存檔保留在備份槽', async () => {
        const adapter = new MemoryStorageAdapter();
        const service = new PlayerSaveService(adapter);
        await service.save(snapshotWith('encounter-001'));
        await service.save(snapshotWith('encounter-002'));
        const main = await service.load();
        assert.equals('encounter-002', main!.clearedStageIds![0]);
        const backup = await adapter.get<any>(backupKey);
        assert.equals('encounter-001', backup.clearedStageIds[0]);
        assert.isFalse(service.lastLoadRecoveredFromBackup());
    });

    suite.test('主檔損壞：load 退回備份並記錄', async () => {
        const adapter = new MemoryStorageAdapter();
        const service = new PlayerSaveService(adapter);
        await service.save(snapshotWith('encounter-001'));
        await service.save(snapshotWith('encounter-002'));
        await adapter.set(PLAYER_SAVE_KEY, { broken: true });
        const loaded = await service.load();
        assert.equals('encounter-001', loaded!.clearedStageIds![0]);
        assert.isTrue(service.lastLoadRecoveredFromBackup());
    });

    suite.test('主檔損壞且沒有備份：拋出錯誤，不回傳半套資料', async () => {
        const adapter = new MemoryStorageAdapter();
        const service = new PlayerSaveService(adapter);
        await adapter.set(PLAYER_SAVE_KEY, { broken: true });
        let threw = false;
        try {
            await service.load();
        } catch {
            threw = true;
        }
        assert.isTrue(threw);
        assert.isFalse(service.lastLoadRecoveredFromBackup());
    });

    suite.test('主檔與備份都損壞：拋出錯誤', async () => {
        const adapter = new MemoryStorageAdapter();
        const service = new PlayerSaveService(adapter);
        await adapter.set(PLAYER_SAVE_KEY, { broken: true });
        await adapter.set(backupKey, { alsoBroken: true });
        let threw = false;
        try {
            await service.load();
        } catch {
            threw = true;
        }
        assert.isTrue(threw);
    });

    suite.test('主檔已壞時再存檔，不會用壞檔覆蓋既有的好備份', async () => {
        const adapter = new MemoryStorageAdapter();
        const service = new PlayerSaveService(adapter);
        await service.save(snapshotWith('encounter-001'));
        await service.save(snapshotWith('encounter-002'));
        await adapter.set(PLAYER_SAVE_KEY, { broken: true });
        await service.save(snapshotWith('encounter-003'));
        const backup = await adapter.get<any>(backupKey);
        assert.equals('encounter-001', backup.clearedStageIds[0]);
    });

    suite.test('沒有存檔：load 回傳 null；clear 同時清掉主檔與備份', async () => {
        const adapter = new MemoryStorageAdapter();
        const service = new PlayerSaveService(adapter);
        assert.equals(null, await service.load());
        await service.save(snapshotWith('encounter-001'));
        await service.save(snapshotWith('encounter-002'));
        await service.clear();
        assert.equals(null, await adapter.get<any>(PLAYER_SAVE_KEY));
        assert.equals(null, await adapter.get<any>(backupKey));
    });

    return suite;
}
