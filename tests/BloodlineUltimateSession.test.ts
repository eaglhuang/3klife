/**
 * BloodlineUltimateSession.test.ts — GameSession 五階奧義方法的 headless 測試（PROG-2-0718 續）
 *
 * 鎖住：找不到武將時不改名冊；升星與覺醒成功才寫回名冊；覺醒被擋時名冊維持原樣並回傳原因。
 *
 * Unity 對照：EditMode Test，直接呼叫 GameSession 的公開方法，不開 Scene。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function general(extra: Record<string, unknown> = {}): GeneralConfig {
    return { id: 'gen_ult', name: '武將', genes: [], ...extra } as unknown as GeneralConfig;
}

function sessionWith(...generals: GeneralConfig[]): GameSession {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore(generals));
    return session;
}

export function createBloodlineUltimateSessionSuite(): TestSuite {
    const suite = new TestSuite('BloodlineUltimateSession (GameSession 五階奧義 PROG-2-0718 續)');

    suite.test('raiseBloodlineUltimateCap：找不到武將回傳 false，名冊不變', async () => {
        const session = sessionWith(general());
        const ok = await session.raiseBloodlineUltimateCap('missing', 4);
        assert.isFalse(ok);
        assert.equals(undefined, session.roster[0].bloodlineUltimate);
    });

    suite.test('raiseBloodlineUltimateCap：升星寫回名冊，上限提高', async () => {
        const session = sessionWith(general({ bloodlineUltimate: { stageCap: 2, stageCurrent: 1 } }));
        const ok = await session.raiseBloodlineUltimateCap('gen_ult', 4);
        assert.isTrue(ok);
        assert.equals(4, session.roster[0].bloodlineUltimate?.stageCap);
        assert.equals(1, session.roster[0].bloodlineUltimate?.stageCurrent);
    });

    suite.test('awakenBloodlineUltimate：找不到武將回傳 GENERAL_NOT_FOUND', async () => {
        const session = sessionWith(general());
        const result = await session.awakenBloodlineUltimate('missing');
        assert.isFalse(result.ok);
        if (result.ok) return;
        assert.equals('GENERAL_NOT_FOUND', result.reason);
    });

    suite.test('awakenBloodlineUltimate：條件足夠時覺醒下一階並寫回名冊', async () => {
        const session = sessionWith(general({
            bloodlineUltimate: { stageCap: 3, stageCurrent: 1 },
            battleRecord: { wins: 100, losses: 0, milestones: ['FIRST_WIN'] },
        }));
        const result = await session.awakenBloodlineUltimate('gen_ult');
        assert.isTrue(result.ok);
        if (!result.ok) return;
        assert.equals(2, result.awakenedStage);
        assert.equals(2, session.roster[0].bloodlineUltimate?.stageCurrent);
    });

    suite.test('awakenBloodlineUltimate：名聲不足被擋，回傳原因且名冊不變', async () => {
        const session = sessionWith(general({
            bloodlineUltimate: { stageCap: 3, stageCurrent: 1 },
            battleRecord: { wins: 99, losses: 0, milestones: ['FIRST_WIN'] },
        }));
        const result = await session.awakenBloodlineUltimate('gen_ult');
        assert.isFalse(result.ok);
        if (result.ok) return;
        assert.equals('FAME_SHORT', result.reason);
        assert.equals(1, session.roster[0].bloodlineUltimate?.stageCurrent);
    });

    return suite;
}
