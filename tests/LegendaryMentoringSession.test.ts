/**
 * LegendaryMentoringSession.test.ts — 名將傳道接上 GameSession（MENT-15，PROG-2-0868）
 *
 * Unity 對照：像 EditMode 測試，對 Command 呼叫一次「傳道」，驗判定失敗不扣道具、
 * 成功才扣 1 張、記一生一次，並確認紀錄跨存檔保留。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, type NurtureStatePort } from '../assets/scripts/core/managers/GameSession';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { ITEM_LEGENDARY_MENTORING_TICKET } from '../assets/scripts/core/systems/PlayerInventory';
import type { NurtureState } from '../assets/scripts/core/services/NurtureService';

/** 只帶 sessions 的假培育埠；restoreState 會收下新狀態，模擬存檔寫回 */
function nurturePort(childId: string): NurtureStatePort & { state: NurtureState } {
    const port = {
        state: {
            sessions: [{ sessionId: 's1', childId, status: 'active', round: 3, mentoringModeLog: [] }],
            admission: { season: 0, used: 0 },
        } as unknown as NurtureState,
        getState() { return JSON.parse(JSON.stringify(this.state)) as NurtureState; },
        restoreState(next: NurtureState | null | undefined) { if (next) this.state = JSON.parse(JSON.stringify(next)); },
    };
    return port;
}

function sessionWith(childId: string, storage = new MemoryStorageAdapter()): { session: GameSession; port: ReturnType<typeof nurturePort> } {
    const session = new GameSession(3);
    session.setSaveService(new PlayerSaveService(storage));
    const port = nurturePort(childId);
    session.setNurtureStatePort(port);
    return { session, port };
}

function logOf(port: ReturnType<typeof nurturePort>): string {
    return JSON.stringify(port.state.sessions[0].mentoringModeLog ?? []);
}

export function createLegendaryMentoringSessionSuite(): TestSuite {
    const suite = new TestSuite('LegendaryMentoringSession (名將傳道接線)');

    suite.test('有傳道令、有培育會話與奧義：傳道成功，扣 1 張並寫入培育紀錄', async () => {
        const { session, port } = sessionWith('child-1');
        await session.addItem(ITEM_LEGENDARY_MENTORING_TICKET, 2);
        const result = await session.performLegendaryMentoringFor('gen-a', 'child-1', 'SKILL_X');
        assert.isTrue(result.ok);
        assert.equals(1, session.itemCount(ITEM_LEGENDARY_MENTORING_TICKET));
        assert.equals(1, port.state.sessions[0].mentoringModeLog?.length ?? 0);
        assert.equals('Legendary_Mentoring', port.state.sessions[0].mentoringModeLog?.[0]?.mode ?? '');
        assert.equals('gen-a', session.createSnapshot().legendaryMentoringUsedIds?.[0] ?? '');
    });

    suite.test('沒有傳道令：NO_TICKET，不寫入培育紀錄、名將不記為已用', async () => {
        const { session, port } = sessionWith('child-1');
        const before = logOf(port);
        const result = await session.performLegendaryMentoringFor('gen-a', 'child-1', 'SKILL_X');
        assert.isFalse(result.ok);
        assert.equals('NO_TICKET', (result as { blocked: string }).blocked);
        assert.equals(before, logOf(port));
        assert.equals(undefined, session.createSnapshot().legendaryMentoringUsedIds);
    });

    suite.test('同一名將第二次傳道：ALREADY_USED，且不扣第二張傳道令', async () => {
        const { session } = sessionWith('child-1');
        await session.addItem(ITEM_LEGENDARY_MENTORING_TICKET, 3);
        assert.isTrue((await session.performLegendaryMentoringFor('gen-a', 'child-1', 'SKILL_X')).ok);
        const again = await session.performLegendaryMentoringFor('gen-a', 'child-1', 'SKILL_X');
        assert.equals('ALREADY_USED', (again as { blocked: string }).blocked);
        assert.equals(2, session.itemCount(ITEM_LEGENDARY_MENTORING_TICKET));
    });

    suite.test('子嗣沒有培育會話：NOT_NURTURING，不扣令', async () => {
        const { session } = sessionWith('child-1');
        await session.addItem(ITEM_LEGENDARY_MENTORING_TICKET, 1);
        const result = await session.performLegendaryMentoringFor('gen-a', 'other-child', 'SKILL_X');
        assert.equals('NOT_NURTURING', (result as { blocked: string }).blocked);
        assert.equals(1, session.itemCount(ITEM_LEGENDARY_MENTORING_TICKET));
    });

    suite.test('名將沒有專屬奧義：NO_EXCLUSIVE_SKILL，不扣令', async () => {
        const { session } = sessionWith('child-1');
        await session.addItem(ITEM_LEGENDARY_MENTORING_TICKET, 1);
        const result = await session.performLegendaryMentoringFor('gen-a', 'child-1', undefined);
        assert.equals('NO_EXCLUSIVE_SKILL', (result as { blocked: string }).blocked);
        assert.equals(1, session.itemCount(ITEM_LEGENDARY_MENTORING_TICKET));
    });

    suite.test('一生一次跨存檔保留：存檔後重讀，同一名將仍是 ALREADY_USED', async () => {
        const storage = new MemoryStorageAdapter();
        const first = sessionWith('child-1', storage);
        await first.session.addItem(ITEM_LEGENDARY_MENTORING_TICKET, 2);
        assert.isTrue((await first.session.performLegendaryMentoringFor('gen-a', 'child-1', 'SKILL_X')).ok);

        const second = sessionWith('child-1', storage);
        assert.isTrue(await second.session.load());
        const again = await second.session.performLegendaryMentoringFor('gen-a', 'child-1', 'SKILL_X');
        assert.equals('ALREADY_USED', (again as { blocked: string }).blocked);
    });

    return suite;
}
