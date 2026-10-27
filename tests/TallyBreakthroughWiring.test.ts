/**
 * TallyBreakthroughWiring.test.ts — 虎符精華突破接上 GameSession（TRP-11 接線 / PROG-2-1318）
 *
 * 鎖住：SSR 虎符 3★ 擲骰成功升到 4★ 並寫回卡；擲骰失敗回傳扣半材料、星級不變；
 * 材料不足、卡不存在、品質封頂（R 卡 3★ 不能再突破）都不改動資料。
 *
 * Unity 對照：像裝備強化的 Confirm 按鈕，先檢查材料與上限，成功才改 Item 的 Level，失敗只扣材料。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
import type { TigerTallyCard } from '../assets/scripts/core/models/TigerTallyCard';

function sessionWithCard(card: Partial<TigerTallyCard> & { uid: string }): GameSession {
    const session = new GameSession(1);
    (session as unknown as { _tallyCards: Record<string, unknown> })._tallyCards = { [card.uid]: card };
    return session;
}

function starOf(session: GameSession, uid: string): number | undefined {
    return (session as unknown as { _tallyCards: Record<string, { stars?: number }> })._tallyCards[uid]?.stars;
}

const RICH = { gold: 10000, essence: 100, guaranteeTokens: 0 };

export function createTallyBreakthroughWiringSuite(): TestSuite {
    const suite = new TestSuite('TallyBreakthroughWiring (虎符精華突破接線 TRP-11 / PROG-2-1318)');

    suite.test('SSR 3★ 擲骰成功升到 4★ 並寫回虎符卡', async () => {
        const session = sessionWithCard({ uid: 'tally-ssr', quality: 'SSR', stars: 3 } as unknown as Partial<TigerTallyCard> & { uid: string });
        const result = await session.breakthroughTally('tally-ssr', 0, RICH);
        assert.isTrue(result !== null && result.ok && result.success);
        assert.equals(4, starOf(session, 'tally-ssr')!);
    });

    suite.test('擲骰失敗：扣一半材料、星級不變，仍會存檔', async () => {
        const session = sessionWithCard({ uid: 'tally-ssr', quality: 'SSR', stars: 3 } as unknown as Partial<TigerTallyCard> & { uid: string });
        const result = await session.breakthroughTally('tally-ssr', 0.99, RICH);
        assert.isTrue(result !== null && result.ok && !result.success);
        assert.equals(3, starOf(session, 'tally-ssr')!);
        if (result && result.ok) {
            assert.equals(1500, result.goldSpent);
            assert.equals(25, result.essenceSpent);
        }
    });

    suite.test('材料不足時不改動資料', async () => {
        const session = sessionWithCard({ uid: 'tally-ssr', quality: 'SSR', stars: 3 } as unknown as Partial<TigerTallyCard> & { uid: string });
        const result = await session.breakthroughTally('tally-ssr', 0, { gold: 0, essence: 100, guaranteeTokens: 0 });
        assert.isTrue(result !== null && !result.ok);
        assert.equals(3, starOf(session, 'tally-ssr')!);
    });

    suite.test('卡不存在回傳 null；R 卡 3★ 已達品質封頂，不能再突破', async () => {
        const session = sessionWithCard({ uid: 'tally-r', quality: 'R', stars: 3 } as unknown as Partial<TigerTallyCard> & { uid: string });
        assert.isTrue((await session.breakthroughTally('missing', 0, RICH)) === null);
        const result = await session.breakthroughTally('tally-r', 0, RICH);
        assert.isTrue(result !== null && !result.ok);
        assert.equals(3, starOf(session, 'tally-r')!);
    });

    return suite;
}
