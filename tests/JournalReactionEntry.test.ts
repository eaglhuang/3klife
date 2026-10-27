/**
 * JournalReactionEntry.test.ts — 日誌條目的選填反應欄位（JRN-04，PROG-2-1404）
 *
 * 鎖住：合法反應會寫入條目並在複製時保留；不合法反應只省略該欄，條目本身照常寫入；
 * 沒有反應的舊條目維持原樣；事件寫入時反應依武將名字產生；多季推進後反應跨存讀檔保留。
 *
 * Unity 對照：每筆日誌是一個資料物件，反應是它的可選欄位，欄位壞掉就清空該欄，不丟整筆紀錄。
 */
import { assert, TestSuite } from './TestRunner';
import { appendJournalEntry, createEmptyJournal, JournalEntryInput } from '../assets/scripts/core/systems/JournalLog';
import { journalReactionLine, JOURNAL_REACTION_FALLBACK } from '../assets/scripts/core/systems/JournalReaction';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { LegacyService } from '../assets/scripts/core/services/LegacyService';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { sys } from 'cc';

function input(extra: Partial<JournalEntryInput> = {}): JournalEntryInput {
    return {
        entryId: 'e-1',
        timestamp: '2026-10-27T06:00:00',
        category: 'BATTLE',
        relatedGeneralUids: ['zhang-fei-uid'],
        priority: 1,
        summary: '張飛於長坂坡作戰。',
        ...extra,
    } as unknown as JournalEntryInput;
}

function gen(id: string, age: number, extra: Record<string, unknown> = {}): GeneralConfig {
    return {
        id, name: id, faction: 'shu', gender: '男', age, hp: 900, str: 80, int: 60, lea: 70, pol: 50, cha: 50, luk: 40, ep: 70,
        maxLifespan: 70, vitality: 100, maxVitality: 100, careerClass: 'Warrior', role: 'Combat', rarityTier: 'epic', ...extra,
    } as unknown as GeneralConfig;
}

function build(adapter: MemoryStorageAdapter, roster: GeneralConfig[]): GameSession {
    const session = new GameSession(5);
    session.setRosterStore(new InMemoryRosterStore(roster));
    session.setLifecycle(new LegacyService(new MemoryStorageAdapter()));
    session.setSaveService(new PlayerSaveService(adapter));
    return session;
}

export function createJournalReactionEntrySuite(): TestSuite {
    const suite = new TestSuite('JournalReactionEntry (日誌反應欄位 JRN-04)');

    suite.test('合法反應寫入條目，且複製後保留', () => {
        const reaction = { text: '主公放心，這一仗我張飛扛得住，您只管看著。', source: 'TEMPLATE' as const };
        const first = appendJournalEntry(createEmptyJournal(), input({ reaction }));
        assert.isTrue(first.ok);
        assert.equals(reaction.text, first.state.entries[0].reaction!.text);
        const second = appendJournalEntry(first.state, input({ entryId: 'e-2' }));
        assert.equals(reaction.text, second.state.entries[0].reaction!.text);
    });

    suite.test('不合法反應（長度不足）只省略反應，條目仍寫入', () => {
        const result = appendJournalEntry(createEmptyJournal(), input({ reaction: { text: '太短', source: 'TEMPLATE' } }));
        assert.isTrue(result.ok);
        assert.isTrue(result.state.entries[0].reaction === undefined);
    });

    suite.test('沒有反應的條目維持原樣', () => {
        const result = appendJournalEntry(createEmptyJournal(), input());
        assert.isTrue(result.ok);
        assert.isTrue(result.state.entries[0].reaction === undefined);
    });

    suite.test('事件反應帶入武將名字；沒有名字時回退', () => {
        const named = journalReactionLine({ category: 'BATTLE' }, '張飛', 0);
        assert.equals('TEMPLATE', named.source);
        assert.isTrue(named.text.includes('張飛'));
        const anonymous = journalReactionLine({ category: 'BATTLE' }, '  ', 0);
        assert.equals(JOURNAL_REACTION_FALLBACK, anonymous.text);
    });

    suite.test('多季流程：退役事件的反應跨季推進與存讀檔保留', async () => {
        services().initialize();
        sys.localStorage.removeItem('CLIENT_DEVICE_ID');
        const adapter = new MemoryStorageAdapter();
        const session = build(adapter, [gen('cao', 66, { templateId: 'cao-cao-1', isHistorical: true })]);
        session.setAutoSave(false);
        session.startNewGame(11);
        await session.retireGeneral('cao');
        for (let season = 0; season < 3; season++) await session.advanceSeason();

        const retire = session.queryJournal().find((e) => e.summary.includes('解甲歸田'));
        assert.isTrue(retire !== undefined);
        assert.equals('TEMPLATE', retire!.reaction!.source);

        await session.save();
        const restored = build(adapter, []);
        assert.isTrue(await restored.load(), '讀檔應成功');
        const again = restored.queryJournal().find((e) => e.entryId === retire!.entryId);
        assert.equals(retire!.reaction!.text, again!.reaction!.text);
    });

    return suite;
}
