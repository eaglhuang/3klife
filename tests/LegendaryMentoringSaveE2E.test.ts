/**
 * LegendaryMentoringSaveE2E — 名將傳道 × 存讀檔端到端（QA，PROG-2-0623）
 *
 * Unity 對照：像 PlayMode 測試，傳道後存檔、換新 session 讀檔，
 * 驗傳道令數量、一生一次名單、培育紀錄都還在，而且還能對另一位名將繼續傳道。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, type NurtureStatePort } from '../assets/scripts/core/managers/GameSession';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { ITEM_LEGENDARY_MENTORING_TICKET } from '../assets/scripts/core/systems/PlayerInventory';
import type { NurtureState } from '../assets/scripts/core/services/NurtureService';

function nurturePort(childId: string): NurtureStatePort & { state: NurtureState } {
    return {
        state: {
            sessions: [{ sessionId: 's1', childId, status: 'active', round: 3, mentoringModeLog: [] }],
            admission: { season: 0, used: 0 },
        } as unknown as NurtureState,
        getState() { return JSON.parse(JSON.stringify(this.state)) as NurtureState; },
        restoreState(next: NurtureState | null | undefined) { if (next) this.state = JSON.parse(JSON.stringify(next)); },
    };
}

function sessionWith(storage: MemoryStorageAdapter): { session: GameSession; port: ReturnType<typeof nurturePort> } {
    const session = new GameSession(3);
    session.setSaveService(new PlayerSaveService(storage));
    const port = nurturePort('child-1');
    session.setNurtureStatePort(port);
    return { session, port };
}

export function createLegendaryMentoringSaveE2ESuite(): TestSuite {
    const suite = new TestSuite('LegendaryMentoringSaveE2E (傳道令扣除＋一生一次 × 存讀檔)');

    suite.test('傳道後存讀檔：傳道令只少 1 張、培育紀錄還在，再傳另一位名將可行並扣到 0', async () => {
        const storage = new MemoryStorageAdapter();
        const a = sessionWith(storage);
        await a.session.addItem(ITEM_LEGENDARY_MENTORING_TICKET, 2);
        assert.isTrue((await a.session.performLegendaryMentoringFor('gen-a', 'child-1', 'SKILL_A')).ok);

        const b = sessionWith(storage);
        assert.isTrue(await b.session.load());
        assert.equals(1, b.session.itemCount(ITEM_LEGENDARY_MENTORING_TICKET));
        assert.equals(1, b.port.state.sessions[0].mentoringModeLog?.length ?? 0);

        assert.isTrue((await b.session.performLegendaryMentoringFor('gen-b', 'child-1', 'SKILL_B')).ok);
        assert.equals(0, b.session.itemCount(ITEM_LEGENDARY_MENTORING_TICKET));
        assert.equals(2, b.port.state.sessions[0].mentoringModeLog?.length ?? 0);

        const c = sessionWith(storage);
        assert.isTrue(await c.session.load());
        assert.equals(0, c.session.itemCount(ITEM_LEGENDARY_MENTORING_TICKET));
        assert.equals(JSON.stringify(['gen-a', 'gen-b']), JSON.stringify(c.session.createSnapshot().legendaryMentoringUsedIds));
        const noTicket = await c.session.performLegendaryMentoringFor('gen-c', 'child-1', 'SKILL_C');
        assert.equals('NO_TICKET', (noTicket as { blocked: string }).blocked);
    });

    suite.test('被擋下的嘗試不改存檔：讀檔後傳道令、一生一次名單、紀錄都與擋下前相同', async () => {
        const storage = new MemoryStorageAdapter();
        const a = sessionWith(storage);
        await a.session.addItem(ITEM_LEGENDARY_MENTORING_TICKET, 2);
        assert.isTrue((await a.session.performLegendaryMentoringFor('gen-a', 'child-1', 'SKILL_A')).ok);
        const again = await a.session.performLegendaryMentoringFor('gen-a', 'child-1', 'SKILL_A');
        assert.equals('ALREADY_USED', (again as { blocked: string }).blocked);

        const b = sessionWith(storage);
        assert.isTrue(await b.session.load());
        assert.equals(1, b.session.itemCount(ITEM_LEGENDARY_MENTORING_TICKET));
        assert.equals(JSON.stringify(['gen-a']), JSON.stringify(b.session.createSnapshot().legendaryMentoringUsedIds));
        assert.equals(1, b.port.state.sessions[0].mentoringModeLog?.length ?? 0);
    });

    return suite;
}
