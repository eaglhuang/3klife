/**
 * WishAltarController.test.ts — 大廳許願祭壇彈窗：巡次標題、插槽三態、許願／加速／領取訊息、版面對齊（PROG-2-1199）
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
import { ITEM_ORACLE_TOKEN, ITEM_VITALITY_PILL, ITEM_WISH_SPEED_CARD } from '../assets/scripts/core/systems/PlayerInventory';
import { remainingText, WishAltarController, WISH_ALTAR_SLOTS } from '../assets/scripts/ui/core/WishAltarController';

/** UTC+8 2026-03-28 指定時刻 */
const at = (hour: number, minute = 0): number => Date.UTC(2026, 2, 28, hour - 8, minute);

function setup(nowMs: number): { panel: WishAltarController; session: GameSession; clock: { now: number } } {
    const session = new GameSession(1);
    const clock = { now: nowMs };
    const panel = new WishAltarController({
        now: () => clock.now,
        pool: () => session.wishPool,
        speedCards: () => session.itemCount(ITEM_WISH_SPEED_CARD),
        startWish: (itemId, t) => session.startWish(itemId, t),
        speedUp: (wishId, cards, t) => session.speedUpWish(wishId, cards, t),
        claim: (t) => session.claimWishes(t),
    });
    return { panel, session, clock };
}

function ids(node: { id?: string; children?: unknown[] }, out: Set<string>): Set<string> {
    if (node.id) out.add(node.id);
    for (const c of (node.children ?? []) as { id?: string; children?: unknown[] }[]) ids(c, out);
    return out;
}

export function createWishAltarControllerSuite(): TestSuite {
    const suite = new TestSuite('WishAltarController (PROG-2-1199 大廳許願祭壇)');

    suite.test('初始：巡次標題、5 個空位、可許願、不可領取', () => {
        const { panel } = setup(at(13));
        const view = panel.getFlowView();
        assert.equals('許願池——第 2 巡（12:00）｜本巡剩 3 項', view.texts.waRoundLabel);
        assert.equals('進行中 0/5｜加速卡 ×0（每張 -2 小時）', view.texts.waStatusLabel);
        assert.equals('補元散 ×1｜8 小時', view.texts.waPickLabel);
        for (let i = 0; i < WISH_ALTAR_SLOTS; i++) {
            assert.equals('空位', view.texts[`waSlotLabel${i}`]);
            assert.isFalse(view.enabled[`waSlot${i}`]);
        }
        assert.isTrue(view.enabled.btnWish);
        assert.isFalse(view.enabled.btnClaim);
        assert.isFalse(view.actives.waResultLabel);
    });

    suite.test('選商品循環並許願：插槽轉進行中顯示倒數', () => {
        const { panel, clock } = setup(at(7));
        panel.prevItem();
        panel.nextItem();
        panel.nextItem();
        assert.equals(ITEM_ORACLE_TOKEN, panel.pickedItemId);
        assert.isTrue(panel.wish());
        assert.equals('開始許願——預計 12h 後實現', panel.message);
        clock.now = at(8, 30);
        const view = panel.getFlowView();
        assert.equals('求籤令 ×1｜剩 10h30m｜點擊加速', view.texts.waSlotLabel0);
        assert.isFalse(view.enabled.waSlot0);
        assert.equals('許願池——第 1 巡（06:00）｜本巡剩 2 項', view.texts.waRoundLabel);
    });

    suite.test('本巡用完時拒絕並提示', () => {
        const { panel } = setup(at(7));
        for (let i = 0; i < 3; i++) assert.isTrue(panel.wish());
        assert.isFalse(panel.getFlowView().enabled.btnWish);
        assert.isFalse(panel.wish());
        assert.equals('本巡許願次數已用完，請等下一巡。', panel.message);
    });

    suite.test('點進行中插槽用 1 張加速卡；沒卡時提示', async () => {
        const { panel, session } = setup(at(7));
        panel.wish();
        assert.isFalse(panel.tapSlot(0));
        assert.equals('沒有加速卡。', panel.message);
        await session.addItem(ITEM_WISH_SPEED_CARD, 2);
        assert.isTrue(panel.getFlowView().enabled.waSlot0);
        assert.isTrue(panel.tapSlot(0));
        assert.equals('使用加速卡，補元散 縮短 2 小時。', panel.message);
        assert.equals('補元散 ×1｜剩 6h00m｜點擊加速', panel.getFlowView().texts.waSlotLabel0);
        assert.equals(1, session.itemCount(ITEM_WISH_SPEED_CARD));
    });

    suite.test('完成後插槽可領取，點擊入背包並清空', () => {
        const { panel, session, clock } = setup(at(7));
        panel.wish();
        clock.now = at(15);
        const view = panel.getFlowView();
        assert.equals('補元散 ×1｜已實現，點擊領取', view.texts.waSlotLabel0);
        assert.isTrue(view.enabled.waSlot0);
        assert.isTrue(view.enabled.btnClaim);
        const before = session.itemCount(ITEM_VITALITY_PILL);
        assert.isTrue(panel.tapSlot(0));
        assert.equals('許願實現！獲得 補元散 ×1', panel.message);
        assert.equals(before + 1, session.itemCount(ITEM_VITALITY_PILL));
        assert.equals('空位', panel.getFlowView().texts.waSlotLabel0);
        assert.isFalse(panel.claim());
        assert.equals('沒有已實現的許願。', panel.message);
    });

    suite.test('剩餘時間不低於 0、進位到分鐘', () => {
        assert.equals('0h00m', remainingText(-5000));
        assert.equals('0h01m', remainingText(1000));
        assert.equals('8h00m', remainingText(8 * 3_600_000));
    });

    suite.test('版面節點涵蓋 FlowView 所有 key；派遣板有入口', () => {
        const root = path.resolve(__dirname, '../assets/resources/ui-spec/layouts');
        const layout = JSON.parse(fs.readFileSync(path.join(root, 'wish-altar-main.json'), 'utf8'));
        const nodes = ids(layout.root, new Set());
        const view = setup(at(7)).panel.getFlowView();
        for (const key of [...Object.keys(view.texts), ...Object.keys(view.enabled)]) assert.isTrue(nodes.has(key), `missing ${key}`);
        const hub = JSON.parse(fs.readFileSync(path.join(root, 'journal-hub-main.json'), 'utf8'));
        assert.isTrue(ids(hub.root, new Set()).has('btnOpenWishAltar'));
    });

    return suite;
}
