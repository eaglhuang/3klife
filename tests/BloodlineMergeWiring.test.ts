/**
 * BloodlineMergeWiring.test.ts — 血脈歸宗接線（BLT-11 / PROG-2-0710）headless 測試
 *
 * Unity 對照：像 EditMode 測試，驗 Command（GameSession.mergeBloodlineFor）的拒絕條件、
 * 名冊寫入與舊檔相容（缺 mergedOutFactors 視為空）。
 */
import { TestSuite, assert } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { planBloodlineMergeForGenerals } from '../assets/scripts/core/systems/BloodlineMerge';
import { ITEM_MERGE_TOKEN } from '../assets/scripts/core/systems/PlayerInventory';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function gen(id: string, bloodlineId: string | undefined, geneIds: string[], mergedOutFactors?: string[]): GeneralConfig {
    return {
        id,
        name: id,
        bloodlineId,
        genes: geneIds.map((gid) => ({ id: gid, type: 'Red' })),
        ...(mergedOutFactors ? { mergedOutFactors } : {}),
    } as GeneralConfig;
}

export function createBloodlineMergeWiringSuite(): TestSuite {
    const suite = new TestSuite('BloodlineMergeWiring (BLT-11 歸宗接線)');

    suite.test('同血源：V1 取得 V2 第一個 V1 沒有的因子，V2 記為已歸宗', async () => {
        const session = new GameSession(3);
        session.setRosterStore(new InMemoryRosterStore([gen('v1', 'BL_A', ['F1']), gen('v2', 'BL_A', ['F1', 'F2'])]));
        await session.addItem(ITEM_MERGE_TOKEN, 1);
        const result = await session.mergeBloodlineFor('v1', 'v2');
        assert.isTrue(result.ok);
        const roster = session.roster;
        const v1 = roster.find((g) => g.id === 'v1')!;
        const v2 = roster.find((g) => g.id === 'v2')!;
        assert.equals(JSON.stringify(['F1', 'F2']), JSON.stringify((v1.genes ?? []).map((g) => g.id)));
        assert.equals(JSON.stringify(['F2']), JSON.stringify(v2.mergedOutFactors));
    });

    suite.test('拒絕：不同血源、缺血源、同一人、找不到武將，名冊不變', async () => {
        const session = new GameSession(3);
        session.setRosterStore(new InMemoryRosterStore([gen('v1', 'BL_A', ['F1']), gen('v2', 'BL_B', ['F2']), gen('x', undefined, ['F3'])]));
        assert.equals('DIFFERENT_BLOODLINE', (await session.mergeBloodlineFor('v1', 'v2') as { reason: string }).reason);
        assert.equals('NO_BLOODLINE', (await session.mergeBloodlineFor('v1', 'x') as { reason: string }).reason);
        assert.equals('SAME_GENERAL', (await session.mergeBloodlineFor('v1', 'v1') as { reason: string }).reason);
        assert.equals('NOT_FOUND', (await session.mergeBloodlineFor('v1', 'nope') as { reason: string }).reason);
    });

    suite.test('舊檔相容：缺 mergedOutFactors 視為空；V2 已全部歸宗時回傳 NO_TRANSFERABLE', () => {
        const plan = planBloodlineMergeForGenerals(gen('v1', 'BL_A', ['F1']), gen('v2', 'BL_A', ['F2'], []));
        assert.isTrue(plan.ok);
        const none = planBloodlineMergeForGenerals(gen('v1', 'BL_A', []), gen('v2', 'BL_A', ['F2'], ['F2']));
        assert.equals('NO_TRANSFERABLE', (none as { reason: string }).reason);
    });

    return suite;
}
