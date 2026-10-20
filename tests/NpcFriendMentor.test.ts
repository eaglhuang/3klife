/**
 * NpcFriendMentor.test.ts — MENT-14 MVP：NPC 好友教官清單與借用入口（PROG-2-0723）headless 測試
 *
 * 鎖住：資料表解析會丟掉壞列並去重；借用候選取自清單；GameSession.borrowFriendMentor 依 FriendBorrow 規則擋下
 * （未知好友、非 SSR、每日上限），成功時寫入紀錄並回傳原主結義點數 1。
 */
import { assert, TestSuite } from './TestRunner';
import { borrowCandidateOf, parseNpcFriendMentors } from '../assets/scripts/core/systems/NpcFriendMentor';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

const ROOT = path.resolve(__dirname, '..');

export function createNpcFriendMentorSuite(): TestSuite {
    const suite = new TestSuite('NpcFriendMentor (MENT-14 MVP 好友借用 PROG-2-0723)');

    suite.test('資料表可解析，且第一位是 SSR、第二位不是', () => {
        const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/data/npc-friend-mentors.json'), 'utf8'));
        const list = parseNpcFriendMentors(raw);
        assert.equals(2, list.length);
        assert.isTrue(list[0].isSSR);
        assert.isFalse(list[1].isSSR);
    });

    suite.test('解析會丟掉缺欄位、型別錯與星等不合法的列，同 friendId 只留第一筆', () => {
        const list = parseNpcFriendMentors([
            { friendId: 'a', displayName: '甲', supportTemplateId: 'SUP_A', isSSR: true, star: 1 },
            { friendId: 'a', displayName: '重複', supportTemplateId: 'SUP_A', isSSR: true, star: 2 },
            { friendId: 'b', displayName: '缺星', supportTemplateId: 'SUP_B', isSSR: true },
            { friendId: 'c', displayName: '星等負數', supportTemplateId: 'SUP_C', isSSR: true, star: -1 },
            { friendId: 'd', displayName: '型別錯', supportTemplateId: 'SUP_D', isSSR: 'yes', star: 1 },
            null,
        ]);
        assert.equals('a:甲:1', list.map((f) => `${f.friendId}:${f.displayName}:${f.star}`).join(','));
        assert.equals('', parseNpcFriendMentors(null).map((f) => f.friendId).join(','));
    });

    suite.test('借用候選取自好友的卡 id、SSR 與星等', () => {
        const [friend] = parseNpcFriendMentors({ data: [{ friendId: 'f', displayName: '友', supportTemplateId: 'SUP_X', isSSR: true, star: 3 }] });
        assert.equals('SUP_X:true:3', ((c) => `${c.supportTemplateId}:${c.isSSR}:${c.star}`)(borrowCandidateOf(friend)));
    });

    suite.test('GameSession 借用：未知好友、非 SSR 被擋；SSR 成功後同日再借被每日上限擋下、隔天因卡仍鎖定被擋', () => {
        const session = new GameSession(7);
        session.setNpcFriendMentors(parseNpcFriendMentors(JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/data/npc-friend-mentors.json'), 'utf8'))));
        const base = { sessionId: 'sess-1', day: '2026-10-20' };

        assert.equals('UNKNOWN_FRIEND', (session.borrowFriendMentor({ ...base, friendId: 'nobody', recordId: 'r0' }) as { blocked: string }).blocked);
        assert.equals('NOT_SSR', (session.borrowFriendMentor({ ...base, friendId: 'npc_friend_02', recordId: 'r1' }) as { blocked: string }).blocked);

        const ok = session.borrowFriendMentor({ ...base, friendId: 'npc_friend_01', recordId: 'r2' });
        assert.isTrue(ok.ok);
        assert.equals(1, (ok as { ownerBondReward: number }).ownerBondReward);

        assert.equals('DAILY_LIMIT', (session.borrowFriendMentor({ ...base, friendId: 'npc_friend_01', recordId: 'r3' }) as { blocked: string }).blocked);

        // 借用中的卡在培育期間鎖定，隔天也借不到（同一原主同一張卡只能有一筆 active）
        const nextDay = session.borrowFriendMentor({ sessionId: 'sess-2', day: '2026-10-21', friendId: 'npc_friend_01', recordId: 'r4' });
        assert.equals('CARD_LOCKED', (nextDay as { blocked: string }).blocked);
    });

    return suite;
}
