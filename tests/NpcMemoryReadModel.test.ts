/**
 * NpcMemoryReadModel.test.ts — 本機 NPC_Memory 最小 read model（PROG-2-1027）
 *
 * 鎖住：Player_ID 綁定（他人記憶讀不到）、Recall_Context 上限與去重、
 * 壞資料丟棄而不拋例外、離線模板選句可依武將讀回最新的回憶。
 */
import { TestSuite, assert } from './TestRunner';
import {
    RECALL_CONTEXT_LIMIT,
    appendRecallContext,
    createNpcMemory,
    normalizeNpcMemory,
    recallForGeneral,
    type RecallEntry,
} from '../assets/scripts/core/systems/NpcMemoryReadModel';

function entry(index: number, generalUid = 'G001'): RecallEntry {
    return {
        General_UID: generalUid,
        Vector_ID: 'V_' + String(index).padStart(4, '0'),
        Snippet: '曾於虎牢關共戰 ' + index,
        Last_Met: '2026-04-12',
    };
}

export function createNpcMemoryReadModelSuite(): TestSuite {
    const suite = new TestSuite('NpcMemoryReadModel (NPC_Memory 最小 read model PROG-2-1027)');

    suite.test('空 Player_ID 建立失敗回傳 null；有效 Player_ID 建立空記憶並綁定', () => {
        assert.isTrue(createNpcMemory('   ') === null);
        const memory = createNpcMemory(' player-1 ');
        if (memory === null) throw new Error('應建立記憶');
        assert.equals('player-1', memory.Player_ID);
        assert.equals(0, memory.Recall_Context.length);
    });

    suite.test('寫入回憶不改原值，且可依武將讀回', () => {
        const base = createNpcMemory('player-1');
        if (base === null) throw new Error('應建立記憶');
        const next = appendRecallContext(base, entry(1));
        assert.equals(0, base.Recall_Context.length, '原物件不應被改');
        assert.equals(1, recallForGeneral(next, 'G001').length);
        assert.equals(0, recallForGeneral(next, 'G002').length);
    });

    suite.test('同一 Vector_ID 不重複保存，重寫會移到最新', () => {
        const base = createNpcMemory('player-1');
        if (base === null) throw new Error('應建立記憶');
        let memory = appendRecallContext(base, entry(1));
        memory = appendRecallContext(memory, entry(2));
        memory = appendRecallContext(memory, entry(1));
        assert.equals(2, memory.Recall_Context.length);
        assert.equals('V_0001', memory.Recall_Context[1].Vector_ID);
    });

    suite.test('超過上限時丟掉最舊的一筆，只留最新 RECALL_CONTEXT_LIMIT 筆', () => {
        let memory = createNpcMemory('player-1');
        if (memory === null) throw new Error('應建立記憶');
        for (let i = 1; i <= RECALL_CONTEXT_LIMIT + 1; i++) memory = appendRecallContext(memory, entry(i));
        assert.equals(RECALL_CONTEXT_LIMIT, memory.Recall_Context.length);
        assert.equals(false, memory.Recall_Context.some((item) => item.Vector_ID === 'V_0001'));
        assert.equals('V_0021', memory.Recall_Context[memory.Recall_Context.length - 1].Vector_ID);
    });

    suite.test('recallForGeneral 最新的在前，供離線模板選句', () => {
        const base = createNpcMemory('player-1');
        if (base === null) throw new Error('應建立記憶');
        let memory = appendRecallContext(base, entry(1));
        memory = appendRecallContext(memory, entry(2));
        memory = appendRecallContext(memory, entry(3));
        const recalls = recallForGeneral(memory, 'G001');
        assert.equals('V_0003', recalls[0].Vector_ID);
        assert.equals('V_0001', recalls[2].Vector_ID);
    });

    suite.test('存檔 Player_ID 與目前玩家不符時回傳 null（不讀他人記憶）', () => {
        const raw = { Player_ID: 'player-2', Recall_Context: [entry(1)], Template_Slot_Values: {} };
        assert.isTrue(normalizeNpcMemory(raw, 'player-1') === null);
    });

    suite.test('壞資料：非物件回 null；壞回憶與非字串槽位被丟棄，其餘保留', () => {
        assert.isTrue(normalizeNpcMemory('not-an-object', 'player-1') === null);
        const raw = {
            Player_ID: 'player-1',
            Recall_Context: [entry(1), { General_UID: 'G001' }, null, 42],
            Template_Slot_Values: { greet: '你好', broken: 7 },
        };
        const memory = normalizeNpcMemory(raw, 'player-1');
        if (memory === null) throw new Error('應還原記憶');
        assert.equals(1, memory.Recall_Context.length);
        assert.equals('你好', memory.Template_Slot_Values.greet);
        assert.isTrue(memory.Template_Slot_Values.broken === undefined);
    });

    suite.test('存檔回憶超過上限時還原只保留最新的，並使用 MVP 預設路徑與人設版號', () => {
        const many: RecallEntry[] = [];
        for (let i = 1; i <= RECALL_CONTEXT_LIMIT + 5; i++) many.push(entry(i));
        const memory = normalizeNpcMemory({ Player_ID: 'player-1', Recall_Context: many }, 'player-1');
        if (memory === null) throw new Error('應還原記憶');
        assert.equals(RECALL_CONTEXT_LIMIT, memory.Recall_Context.length);
        assert.equals('V_0006', memory.Recall_Context[0].Vector_ID);
        assert.equals('save/npc_memory.db', memory.SQLite_Vec_DB_Path);
        assert.equals('npc-persona-v1', memory.Persona_Card_Version);
    });

    suite.test('寫入的 Snippet 超過上限會截斷，空白欄位的回憶不寫入', () => {
        const base = createNpcMemory('player-1');
        if (base === null) throw new Error('應建立記憶');
        const longSnippet = 'x'.repeat(300);
        const memory = appendRecallContext(base, { ...entry(1), Snippet: longSnippet });
        assert.equals(180, memory.Recall_Context[0].Snippet.length);
        const unchanged = appendRecallContext(memory, { ...entry(2), Vector_ID: '  ' });
        assert.equals(1, unchanged.Recall_Context.length);
    });

    return suite;
}
