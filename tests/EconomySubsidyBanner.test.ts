/**
 * EconomySubsidyBanner.test.ts — 許願祭壇經濟補貼提示條（PROG-2-1343，economy-subsidy-banner）
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
import { ITEM_WISH_SPEED_CARD } from '../assets/scripts/core/systems/PlayerInventory';
import { economySubsidyBannerText } from '../assets/scripts/ui/core/DailySubsidyNotice';
import { WishAltarController } from '../assets/scripts/ui/core/WishAltarController';

/** UTC+8 2026-03-28 指定時刻 */
const at = (hour: number, day = 28): number => Date.UTC(2026, 2, day, hour - 8);
const FLOOR = '地窖保底：糧草 1500、黃金 600';

function altar(session: GameSession, banner: boolean): WishAltarController {
    return new WishAltarController({
        now: () => at(13),
        pool: () => session.wishPool,
        speedCards: () => session.itemCount(ITEM_WISH_SPEED_CARD),
        startWish: (itemId, t) => session.startWish(itemId, t),
        speedUp: (wishId, cards, t) => session.speedUpWish(wishId, cards, t),
        claim: (t) => session.claimWishes(t),
        ...(banner ? { subsidyBanner: (t: number) => economySubsidyBannerText(session.dailySubsidy, t) } : {}),
    });
}

export function createEconomySubsidyBannerSuite(): TestSuite {
    const suite = new TestSuite('EconomySubsidyBanner (PROG-2-1343 經濟補貼提示條)');

    suite.test('從未領過：今日未觸發＋保底線', () => {
        assert.equals(`每日補貼：今日未觸發（低於門檻登入時自動補）｜${FLOOR}`, economySubsidyBannerText(null, at(10)));
    });

    suite.test('今日已補：列出補量', () => {
        const record = { lastClaimDay: '2026-03-28', foodGranted: 400, goldGranted: 150, troopsGranted: 0 };
        assert.equals(`每日補貼：今日已補 糧草 +400、黃金 +150｜${FLOOR}`, economySubsidyBannerText(record, at(10)));
    });

    suite.test('隔日（UTC+8 切日）視為未觸發', () => {
        const record = { lastClaimDay: '2026-03-28', foodGranted: 400, goldGranted: 0, troopsGranted: 0 };
        assert.isTrue(economySubsidyBannerText(record, at(1, 29)).startsWith('每日補貼：今日未觸發'));
    });

    suite.test('祭壇面板：有 dep 顯示提示條，領補貼後改為已補', () => {
        const session = new GameSession(1);
        const military = (session as unknown as { _military: { food: number } })._military;
        military.food = 100;
        const view = altar(session, true).getFlowView();
        assert.isTrue(view.actives.waSubsidyLabel);
        assert.isTrue(view.texts.waSubsidyLabel.startsWith('每日補貼：今日未觸發'));
        session.claimDailySubsidy(at(9), 10_000);
        assert.isTrue(altar(session, true).getFlowView().texts.waSubsidyLabel.startsWith('每日補貼：今日已補 糧草 +400'));
    });

    suite.test('祭壇面板：沒給 dep 時隱藏提示條', () => {
        const view = altar(new GameSession(1), false).getFlowView();
        assert.equals(false, view.actives.waSubsidyLabel);
    });

    suite.test('版面：狀態列下方有 waSubsidyLabel', () => {
        const layout = JSON.parse(fs.readFileSync(path.join(__dirname, '../assets/resources/ui-spec/layouts/wish-altar-main.json'), 'utf8'));
        const ids = (layout.root.children[0].children as { id: string }[]).map((c) => c.id);
        assert.equals(ids.indexOf('waStatusLabel') + 1, ids.indexOf('waSubsidyLabel'));
    });

    return suite;
}
