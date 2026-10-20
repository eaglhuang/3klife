/**
 * BloodlineMergeE2E.test.ts — 血脈歸宗跨存檔端到端（QA，PROG-2-0651）
 *
 * Unity 對照：像 PlayMode 測試，歸宗後存檔、重開遊戲讀檔，再歸宗一次，驗「已歸宗」標記真的跟著存檔走。
 */
import { assert, TestSuite } from './TestRunner';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { ITEM_MERGE_TOKEN } from '../assets/scripts/core/systems/PlayerInventory';

function gen(id: string, bloodlineId: string, geneIds: string[]): GeneralConfig {
    return { id, name: id, bloodlineId, genes: geneIds.map((gid) => ({ id: gid, type: 'Red' })) } as GeneralConfig;
}

function sessionWith(storage: MemoryStorageAdapter, roster: GeneralConfig[]): GameSession {
    const session = new GameSession(3);
    session.setRosterStore(new InMemoryRosterStore(roster));
    session.setSaveService(new PlayerSaveService(storage));
    return session;
}

export function createBloodlineMergeE2ESuite(): TestSuite {
    const suite = new TestSuite('BloodlineMergeE2E (歸宗跨存檔)');

    suite.test('歸宗後存檔重讀：V1 因子與 V2 已歸宗標記都還在，再歸宗只會取下一個因子', async () => {
        const storage = new MemoryStorageAdapter();
        const first = sessionWith(storage, [gen('v1', 'BL_A', ['F1']), gen('v2', 'BL_A', ['F1', 'F2', 'F3'])]);
        await first.addItem(ITEM_MERGE_TOKEN, 2);
        assert.isTrue((await first.mergeBloodlineFor('v1', 'v2')).ok);

        const second = sessionWith(storage, []);
        assert.isTrue(await second.load());
        const v1 = second.roster.find((g) => g.id === 'v1')!;
        const v2 = second.roster.find((g) => g.id === 'v2')!;
        assert.equals('F1,F2', (v1.genes ?? []).map((g) => g.id).join(','));
        assert.equals('F2', (v2.mergedOutFactors ?? []).join(','));

        const again = await second.mergeBloodlineFor('v1', 'v2');
        assert.isTrue(again.ok);
        assert.equals('F3', (again as { transferredFactor: string }).transferredFactor);
        const v2After = second.roster.find((g) => g.id === 'v2')!;
        assert.equals('F2,F3', (v2After.mergedOutFactors ?? []).join(','));
        assert.equals('F1,F2,F3', (second.roster.find((g) => g.id === 'v1')!.genes ?? []).map((g) => g.id).join(','));
    });

    suite.test('V2 的因子全部歸宗或 V1 已有後：NO_TRANSFERABLE，名冊與 V1 因子數不變', async () => {
        const storage = new MemoryStorageAdapter();
        const session = sessionWith(storage, [gen('v1', 'BL_A', ['F1']), gen('v2', 'BL_A', ['F1', 'F2'])]);
        await session.addItem(ITEM_MERGE_TOKEN, 1);
        assert.isTrue((await session.mergeBloodlineFor('v1', 'v2')).ok);
        const result = await session.mergeBloodlineFor('v1', 'v2');
        assert.isFalse(result.ok);
        assert.equals('NO_TRANSFERABLE', (result as { reason: string }).reason);
        assert.equals(2, (session.roster.find((g) => g.id === 'v1')!.genes ?? []).length);
    });

    suite.test('移植的是複本：之後改 V1 的因子不會連動 V2', async () => {
        const session = sessionWith(new MemoryStorageAdapter(), [gen('v1', 'BL_A', []), gen('v2', 'BL_A', ['F2'])]);
        await session.addItem(ITEM_MERGE_TOKEN, 1);
        assert.isTrue((await session.mergeBloodlineFor('v1', 'v2')).ok);
        const v1Gene = session.roster.find((g) => g.id === 'v1')!.genes![0];
        const v2Gene = session.roster.find((g) => g.id === 'v2')!.genes![0];
        assert.isTrue(v1Gene !== v2Gene);
    });

    return suite;
}
