/**
 * TallyInstanceDeploy — 出陣虎符帶「持有的卡片實例 uid」（PROG-2-0579）的回歸測試
 *
 * 缺陷：出陣只帶目錄 tacticId，但星級、戰後經驗、Set 都用 session.tallyCards 的實例 uid 查，對不上。
 * 這裡確認：手牌綁到的實例 uid 一定是持有卡的鍵，出陣參數用它，戰後經驗真的寫回那張實例。
 */
import { TestSuite, assert } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import {
    bindHeldTallyInstances,
    buildTallyCardCatalog,
    tallyDeployRefOf,
} from '../assets/scripts/core/config/TallyCardCatalog';
import type { TallyCardData } from '../assets/scripts/shared/TallyCardContract';

function catalogCard(tacticId: string): TallyCardData {
    const card = buildTallyCardCatalog().get(tacticId);
    if (!card) throw new Error(`目錄沒有 ${tacticId}`);
    return { ...card };
}

async function sessionWithCards(cards: Array<Record<string, unknown>>): Promise<GameSession> {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore([]));
    session.setSaveService(new PlayerSaveService(new MemoryStorageAdapter()));
    await session.load();
    await session.registerTallyCards(cards as never);
    return session;
}

export function createTallyInstanceDeploySuite(): TestSuite {
    const suite = new TestSuite('TallyInstanceDeploy (出陣虎符實例 uid PROG-2-0579)');

    suite.test('同兵種的手牌綁到持有的實例 uid', () => {
        const hand = bindHeldTallyInstances(
            [catalogCard('tiger-tally-cavalry-shock')],
            { t1: { uid: 't1', troopType: 'cavalry' } },
        );
        assert.equals('t1', hand[0].instanceUid ?? '');
    });

    suite.test('每張持有實例只綁一次，多出來的手牌不綁（instanceUid 為 undefined）', () => {
        const hand = bindHeldTallyInstances(
            [catalogCard('tiger-tally-cavalry-shock'), catalogCard('tiger-tally-cavalry-shock')],
            { t1: { uid: 't1', troopType: 'cavalry' } },
        );
        assert.equals('t1', hand[0].instanceUid ?? '');
        assert.isTrue(hand[1].instanceUid === undefined);
    });

    suite.test('兵種對不上的持有卡不綁', () => {
        const hand = bindHeldTallyInstances(
            [catalogCard('tiger-tally-archer-volley')],
            { t1: { uid: 't1', troopType: 'cavalry' } },
        );
        assert.isTrue(hand[0].instanceUid === undefined);
    });

    suite.test('出陣參數：有實例時 cardUid 用實例 uid、templateId 用目錄 id；沒實例時退回目錄 id', () => {
        const bound = tallyDeployRefOf({ tacticId: 'tiger-tally-cavalry-shock', instanceUid: 't1' });
        assert.equals('t1', bound?.cardUid ?? '');
        assert.equals('tiger-tally-cavalry-shock', bound?.templateId ?? '');
        const unbound = tallyDeployRefOf({ tacticId: 'tiger-tally-cavalry-shock' });
        assert.equals('tiger-tally-cavalry-shock', unbound?.cardUid ?? '');
        assert.isTrue(tallyDeployRefOf({}) === null);
    });

    suite.test('回歸：手牌選到的 id 一定是持有卡的鍵，戰後經驗寫回該實例', async () => {
        const session = await sessionWithCards([
            { uid: 't1', templateId: 'tpl', sourceGeneralUid: 'g', quality: 'SSR', score: 0, source: 'death', producedSeason: 0, stars: 1, battleExp: 90, troopType: 'cavalry' },
        ]);
        const hand = bindHeldTallyInstances([catalogCard('tiger-tally-cavalry-shock')], session.tallyCards as never);
        const ref = tallyDeployRefOf(hand[0])!;
        assert.isTrue(ref.cardUid in session.tallyCards);
        await session.recordBattle([], 'player-win', { deployedTallyIds: [ref.cardUid] });
        assert.equals(2, session.tallyCards['t1'].stars ?? 0);
        assert.equals(105, session.tallyCards['t1'].battleExp ?? 0);
    });

    return suite;
}
