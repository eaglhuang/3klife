/**
 * MonthlyCard.test.ts — 月卡 30 天效期與每日加速卡（經濟系統 E #5，PROG-2-1359）
 *
 * Unity 對照：EditMode Test，驗效期、續約、每日領取與 GameSession 存讀檔，不開 Scene。
 */
import { assert, TestSuite } from './TestRunner';
import { activateMonthlyCard, claimMonthlyCardDaily, isMonthlyCardExpiring, monthlyCardDaysLeft, normalizeMonthlyCard } from '../assets/scripts/core/systems/MonthlyCard';
import { ITEM_WISH_SPEED_CARD, itemCount } from '../assets/scripts/core/systems/PlayerInventory';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';

/** UTC+8 2026-10-01 中午 */
const DAY0 = Date.parse('2026-10-01T04:00:00Z');
const day = (n: number): number => DAY0 + n * 86_400_000;

export function createMonthlyCardSuite(): TestSuite {
    const suite = new TestSuite('MonthlyCard (月卡 PROG-2-1359)');

    suite.test('開通 30 天含當天；第 30 天仍有效、第 31 天過期；末 3 天即將到期', () => {
        const card = activateMonthlyCard(null, day(0));
        assert.equals('2026-10-30', card.expiresDay);
        assert.equals(30, monthlyCardDaysLeft(card, day(0)));
        assert.equals(1, monthlyCardDaysLeft(card, day(29)));
        assert.equals(0, monthlyCardDaysLeft(card, day(30)));
        assert.isFalse(isMonthlyCardExpiring(card, day(26)));
        assert.isTrue(isMonthlyCardExpiring(card, day(27)));
        assert.isFalse(isMonthlyCardExpiring(card, day(30)), '已過期不算即將到期');
        assert.equals(0, monthlyCardDaysLeft(null, day(0)));
    });

    suite.test('效期內續約往後疊 30 天；過期後續約從當天重算', () => {
        const card = activateMonthlyCard(null, day(0));
        assert.equals(50, monthlyCardDaysLeft(activateMonthlyCard(card, day(10)), day(10)));
        assert.equals(30, monthlyCardDaysLeft(activateMonthlyCard(card, day(40)), day(40)));
    });

    suite.test('每日領取：同日一次、隔日可再領、過期與沒開通不可領；讀檔正規化', () => {
        let card = activateMonthlyCard(null, day(0));
        const first = claimMonthlyCardDaily(card, day(0));
        assert.equals(1, first.speedCards);
        card = first.state!;
        assert.equals(0, claimMonthlyCardDaily(card, day(0) + 3_600_000).speedCards);
        assert.equals(1, claimMonthlyCardDaily(card, day(1)).speedCards);
        assert.equals(0, claimMonthlyCardDaily(card, day(30)).speedCards);
        assert.equals(0, claimMonthlyCardDaily(null, day(0)).speedCards);
        assert.equals(null, normalizeMonthlyCard({ expiresDay: 'bad' }));
        assert.equals(null, normalizeMonthlyCard({ expiresDay: '2026-10-30', lastClaimDay: 5 })!.lastClaimDay);
    });

    suite.test('GameSession：領取送加速卡進背包；存讀檔保留效期與已領日；開新局清空', async () => {
        const session = new GameSession();
        session.setRosterStore(new InMemoryRosterStore([]));
        session.setSaveService(new PlayerSaveService(new MemoryStorageAdapter()));
        session.setAutoSave(false);
        session.startNewGame(1);
        assert.equals(0, session.claimMonthlyCardDaily(day(0)), '沒開通');
        assert.equals(30, session.activateMonthlyCard(day(0)));
        const before = itemCount(session.inventory, ITEM_WISH_SPEED_CARD);
        assert.equals(1, session.claimMonthlyCardDaily(day(0)));
        assert.equals(before + 1, itemCount(session.inventory, ITEM_WISH_SPEED_CARD));
        await session.save();
        session.startNewGame(2);
        assert.equals(0, session.monthlyCardStatus(day(0)).daysLeft, '開新局清空');
        assert.isTrue(await session.load());
        const status = session.monthlyCardStatus(day(0));
        assert.equals(30, status.daysLeft);
        assert.isTrue(status.claimedToday);
        assert.equals(0, session.claimMonthlyCardDaily(day(0)), '讀檔後同日不可再領');
        assert.equals(1, session.claimMonthlyCardDaily(day(1)));
    });

    return suite;
}
