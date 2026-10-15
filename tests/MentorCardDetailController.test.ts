/**
 * MentorCardDetailController.test.ts — 教官卡詳情畫面狀態（MENT-13 cc 接線）headless 測試
 */
import { TestSuite, assert } from './TestRunner';
import { MentorCardDetailController } from '../assets/scripts/ui/core/MentorCardDetailController';
import type { MentorCardData } from '../assets/scripts/core/systems/MentorCardTabs';

const CARD: MentorCardData = {
    star: 1,
    effects: [{ id: 'E1', label: '武力加成' }],
    events: [1, 2].map((group) => ({ id: `EV${group}`, group, skillName: `戰法${group}` })),
    stories: [{ id: 'S1', title: '對話一' }],
};

export function createMentorCardDetailControllerSuite(): TestSuite {
    const suite = new TestSuite('MentorCardDetailController (教官卡詳情畫面狀態 MENT-13)');

    suite.test('未開啟時面板隱藏、無節點資料', () => {
        const view = new MentorCardDetailController().getView();
        assert.isFalse(view.open);
        assert.equals(0, Object.keys(view.texts).length);
    });

    suite.test('開啟後預設支援效果頁，標題與頁籤名稱正確', () => {
        const c = new MentorCardDetailController();
        c.open(CARD, '趙雲');
        const view = c.getView();
        assert.isTrue(view.open);
        assert.equals('趙雲', view.texts.mentorCardTitle);
        assert.equals('▸ 支援效果', view.texts.tabEffectsLabel);
        assert.equals('effects', view.activeTab);
    });

    suite.test('切換頁籤後內容跟著換，重新開啟回到支援效果', () => {
        const c = new MentorCardDetailController();
        c.open(CARD, '趙雲');
        c.selectTab('events');
        assert.equals('▸ 培育事件', c.getView().texts.tabEventsLabel);
        c.open(CARD, '趙雲');
        assert.equals('effects', c.getView().activeTab);
    });

    suite.test('關閉後回到未開啟狀態', () => {
        const c = new MentorCardDetailController();
        c.open(CARD, '趙雲');
        c.close();
        assert.isFalse(c.getView().open);
    });

    return suite;
}
