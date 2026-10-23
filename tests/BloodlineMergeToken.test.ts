/**
 * BloodlineMergeToken.test.ts — 血脈歸宗扣歸宗令（SAME-09 剩餘項，PROG-2-0862）
 *
 * Unity 對照：像 EditMode 測試，驗 Command 在「扣道具」這一步的行為：
 * 成功扣 1、失敗（包括道具不足）一律不扣，重讀存檔後數量保留。
 */
import { assert, TestSuite } from './TestRunner';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { ITEM_MERGE_TOKEN, MERGE_TOKEN_SHORTAGE_KEY, MERGE_TOKEN_SHORTAGE_TEXT } from '../assets/scripts/core/systems/PlayerInventory';

function gen(id: string, bloodlineId: string, geneIds: string[]): GeneralConfig {
    return { id, name: id, bloodlineId, genes: geneIds.map((gid) => ({ id: gid, type: 'Red' })) } as GeneralConfig;
}

function sessionWith(roster: GeneralConfig[], storage = new MemoryStorageAdapter()): GameSession {
    const session = new GameSession(3);
    session.setRosterStore(new InMemoryRosterStore(roster));
    session.setSaveService(new PlayerSaveService(storage));
    return session;
}

export function createBloodlineMergeTokenSuite(): TestSuite {
    const suite = new TestSuite('BloodlineMergeToken (歸宗扣歸宗令)');

    suite.test('有歸宗令：歸宗成功後扣 1 張，名冊 V1 取得因子', async () => {
        const session = sessionWith([gen('v1', 'BL_A', ['F1']), gen('v2', 'BL_A', ['F1', 'F2'])]);
        await session.addItem(ITEM_MERGE_TOKEN, 2);
        const result = await session.mergeBloodlineFor('v1', 'v2');
        assert.isTrue(result.ok);
        assert.equals(1, session.itemCount(ITEM_MERGE_TOKEN));
        assert.equals('F1,F2', (session.roster.find((g) => g.id === 'v1')!.genes ?? []).map((g) => g.id).join(','));
    });

    suite.test('沒有歸宗令：回傳 NO_MERGE_TOKEN，名冊與 V2 已歸宗標記都不變', async () => {
        const session = sessionWith([gen('v1', 'BL_A', ['F1']), gen('v2', 'BL_A', ['F1', 'F2'])]);
        const result = await session.mergeBloodlineFor('v1', 'v2');
        assert.isFalse(result.ok);
        assert.equals('NO_MERGE_TOKEN', (result as { reason: string }).reason);
        assert.equals(1, (session.roster.find((g) => g.id === 'v1')!.genes ?? []).length);
        assert.equals(0, (session.roster.find((g) => g.id === 'v2')!.mergedOutFactors ?? []).length);
        assert.equals(0, session.itemCount(ITEM_MERGE_TOKEN));
    });

    suite.test('歸宗失敗（NO_TRANSFERABLE）不扣歸宗令', async () => {
        const session = sessionWith([gen('v1', 'BL_A', ['F1']), gen('v2', 'BL_A', ['F1'])]);
        await session.addItem(ITEM_MERGE_TOKEN, 1);
        const result = await session.mergeBloodlineFor('v1', 'v2');
        assert.isFalse(result.ok);
        assert.equals('NO_TRANSFERABLE', (result as { reason: string }).reason);
        assert.equals(1, session.itemCount(ITEM_MERGE_TOKEN));
    });

    suite.test('歸宗令數量跨存檔保留：扣完存檔，重讀後剩下的張數不變', async () => {
        const storage = new MemoryStorageAdapter();
        const first = sessionWith([gen('v1', 'BL_A', ['F1']), gen('v2', 'BL_A', ['F1', 'F2', 'F3'])], storage);
        await first.addItem(ITEM_MERGE_TOKEN, 3);
        assert.isTrue((await first.mergeBloodlineFor('v1', 'v2')).ok);

        const second = sessionWith([], storage);
        assert.isTrue(await second.load());
        assert.equals(2, second.itemCount(ITEM_MERGE_TOKEN));
    });

    suite.test('歸宗令不足的暫定文案與語系 key 已登錄（文案待企劃定稿）', () => {
        assert.equals('UI_MERGE_TOKEN_SHORTAGE', MERGE_TOKEN_SHORTAGE_KEY);
        assert.equals('歸宗令不足', MERGE_TOKEN_SHORTAGE_TEXT);
    });

    return suite;
}
