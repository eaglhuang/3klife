/**
 * NpcMemoryRetention — 離線填槽與單將記憶容量淘汰（doc_spec_0333；PROG-2-2019）
 */
import { assert, TestSuite } from './TestRunner';
import type { JournalEntry, JournalState } from '../assets/scripts/core/systems/JournalLog';
import { fillTemplateSlots, NPC_MEMORY_PER_GENERAL_CAP, pruneGeneralMemories } from '../assets/scripts/core/systems/NpcMemoryRetention';

function entry(i: number, uids: string[], milestone = false): JournalEntry {
    const mm = String(i % 60).padStart(2, '0');
    const hh = String(Math.floor(i / 60)).padStart(2, '0');
    return {
        entryId: `e${i}`, timestamp: `2026-01-01T${hh}:${mm}:00`, category: 'INTERACTION',
        relatedGeneralUids: uids, priority: milestone ? 100 : 10, summary: `第${i}筆`, visibility: 'VISIBLE',
    };
}

const isMilestone = (e: Readonly<JournalEntry>): boolean => e.priority === 100;

export function createNpcMemoryRetentionSuite(): TestSuite {
    const suite = new TestSuite('NpcMemoryRetention (NPC 記憶填槽與淘汰 doc_spec_0333 PROG-2-2019)');

    suite.test('§2 槽位替換、缺值保底與 missing', () => {
        const r = fillTemplateSlots('{PlayerName}，{Location}一役後，{Companion}仍念著{RecentBattle}。', { Location: '長坂坡', Companion: '關雲長', RecentBattle: '' });
        assert.equals('主公，長坂坡一役後，關雲長仍念著{RecentBattle}。', r.text);
        assert.equals(1, r.missing.length);
        assert.equals('RecentBattle', r.missing[0]);
        assert.equals('黃將軍', fillTemplateSlots('{PlayerName}', { PlayerName: '黃將軍' }).text);
    });

    suite.test('§3 超過 50 條剔除最舊的非里程碑', () => {
        const entries = [entry(0, ['zhao_yun'], true)];
        for (let i = 1; i <= NPC_MEMORY_PER_GENERAL_CAP + 1; i++) entries.push(entry(i, ['zhao_yun']));
        entries.push(entry(99, ['guan_yu']));
        const state: JournalState = { entries: entries.reverse() };
        const r = pruneGeneralMemories(state, 'zhao_yun', isMilestone);
        assert.equals(2, r.evicted.length);
        assert.equals('e1', r.evicted[0]);
        assert.equals('e2', r.evicted[1]);
        assert.isTrue(r.state.entries.some((e) => e.entryId === 'e0'));
        assert.isTrue(r.state.entries.some((e) => e.entryId === 'e99'));
        assert.equals(53, state.entries.length);
    });

    suite.test('§3 全是里程碑時不剔除；未超量不動', () => {
        const all = { entries: [entry(1, ['a'], true), entry(2, ['a'], true), entry(3, ['a'], true)] };
        assert.equals(0, pruneGeneralMemories(all, 'a', isMilestone, 2).evicted.length);
        assert.equals(0, pruneGeneralMemories({ entries: [entry(1, ['a'])] }, 'a', isMilestone).evicted.length);
    });

    return suite;
}
