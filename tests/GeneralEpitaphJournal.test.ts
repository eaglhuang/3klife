/**
 * GeneralEpitaphJournal.test.ts — 退役與老死的告別絕筆進日誌（doc_spec_0312 §5，GEN-14；PROG-2-2107）
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { LegacyService } from '../assets/scripts/core/services/LegacyService';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { EPITAPH_TEXT, epitaphJournalEntry } from '../assets/scripts/core/systems/ChildUnveiling';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function elder(id: string, extra: Record<string, unknown> = {}): GeneralConfig {
    return {
        id, name: `${id}公`, faction: 'shu', gender: '男', age: 61, hp: 1000, vitality: 100, maxVitality: 100,
        str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk: 40, ...extra,
    } as unknown as GeneralConfig;
}

function makeSession(roster: GeneralConfig[]): GameSession {
    const adapter = new MemoryStorageAdapter();
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore(roster));
    session.setSaveService(new PlayerSaveService(adapter));
    session.setLifecycle(new LegacyService(adapter));
    session.setRandomSource(() => 0);
    return session;
}

function epitaphs(session: GameSession) {
    return session.queryJournal().filter((entry) => entry.entryId.startsWith('EPITAPH-'));
}

export function createGeneralEpitaphJournalSuite(): TestSuite {
    const suite = new TestSuite('GeneralEpitaphJournal (告別絕筆進日誌 GEN-14 PROG-2-2107)');

    suite.test('條目：三種死因各用規格原文，掛在該武將名下', () => {
        const retire = epitaphJournalEntry({ id: 'a', name: '甲', generalRank: 3 }, 'retire', 5, 'T')!;
        assert.equals('EPITAPH-5', retire.entryId);
        assert.equals('T', retire.timestamp);
        assert.equals('GROWTH', retire.category);
        assert.equals('a', retire.relatedGeneralUids.join(','));
        assert.equals(`甲絕筆：${EPITAPH_TEXT.Retirement}`, retire.summary);
        assert.equals(`甲絕筆：${EPITAPH_TEXT.BattleDeath}`, epitaphJournalEntry({ id: 'a', name: '甲' }, 'battle', 1, 'T')!.summary);
        assert.equals(`甲絕筆：${EPITAPH_TEXT.ClanShrine}`, epitaphJournalEntry({ id: 'a', name: '甲' }, 'natural', 1, 'T')!.summary);
    });

    suite.test('條目：退役將階不到 3 沒有絕筆；缺姓名用 id', () => {
        assert.equals(null, epitaphJournalEntry({ id: 'a', name: '甲', generalRank: 2 }, 'retire', 1, 'T'));
        assert.equals(null, epitaphJournalEntry({ id: 'a', name: '甲' }, 'retire', 1, 'T'));
        assert.isTrue(epitaphJournalEntry({ id: 'a' }, 'natural', 1, 'T')!.summary.startsWith('a絕筆'));
    });

    suite.test('退役：將階 3 以上寫一則，低階不寫', async () => {
        const session = makeSession([elder('high', { generalRank: 3 }), elder('low', { generalRank: 2 })]);
        await session.retireGeneral('low');
        assert.equals(0, epitaphs(session).length);
        await session.retireGeneral('high');
        const entries = epitaphs(session);
        assert.equals(1, entries.length);
        assert.equals('high', entries[0].relatedGeneralUids[0]);
        assert.equals(`high公絕筆：${EPITAPH_TEXT.Retirement}`, entries[0].summary);
    });

    suite.test('老死：換季死亡寫入祀絕筆，已故武將隔季不重寫', async () => {
        const session = makeSession([elder('old', { age: 200, maxLifespan: 60 }), elder('fine', { age: 30, maxLifespan: 80 })]);
        await session.advanceSeason(0);
        const entries = epitaphs(session);
        assert.equals(1, entries.length);
        assert.equals('old', entries[0].relatedGeneralUids[0]);
        assert.equals(`old公絕筆：${EPITAPH_TEXT.ClanShrine}`, entries[0].summary);
        await session.advanceSeason(0);
        assert.equals(1, epitaphs(session).length);
    });

    return suite;
}
