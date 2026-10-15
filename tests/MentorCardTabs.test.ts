/**
 * MentorCardTabs.test.ts — 教官卡詳情三頁籤與星等鎖頭（MENT-13）headless 測試
 *
 * Unity 對照：像 Presenter 的 EditMode 測試，逐一驗 ViewModel 在各星等下的鎖頭與頁籤切換。
 */
import { TestSuite, assert } from './TestRunner';
import {
    buildMentorCardTabView,
    clampMentorStar,
    mentorToCardData,
    eventGroupRequiredStar,
    MENTOR_CARD_TAB_LABELS,
    type MentorCardData,
} from '../assets/scripts/core/systems/MentorCardTabs';

function card(star: number): MentorCardData {
    return {
        star,
        effects: [
            { id: 'EFF_BASE', label: '武力加成' },
            { id: 'EFF_STAR3', label: '屬性加成 ×1.1', requiredStar: 3 },
        ],
        events: [1, 2, 3, 4, 5, 6].map((group) => ({ id: `EV_${group}`, group, skillName: `戰法${group}` })),
        stories: [{ id: 'ST_1', title: '對話一' }],
    };
}

export function createMentorCardTabsSuite(): TestSuite {
    const suite = new TestSuite('MentorCardTabs (教官卡三頁籤 MENT-13)');

    suite.test('三頁籤名稱對應規格 UI 字串，預設為支援效果', () => {
        const view = buildMentorCardTabView(card(0));
        assert.equals('effects', view.activeTab);
        assert.equals(JSON.stringify(['支援效果', '培育事件', '小插曲']), JSON.stringify(view.tabs.map((t) => t.label)));
        assert.equals('支援效果', MENTOR_CARD_TAB_LABELS.effects);
    });

    suite.test('事件組 n 需 ★(n-1)：★0 只有組 1 解鎖，其餘鎖頭並顯示需達星等', () => {
        const view = buildMentorCardTabView(card(0), 'events');
        assert.equals(false, view.rows[0].locked);
        assert.equals(true, view.rows[1].locked);
        assert.equals('需達 ★1 才可發動', view.rows[1].lockText!);
        assert.equals(null, view.rows[0].lockText);
    });

    suite.test('★4 時事件組 1–5 解鎖，組 6（頂級）仍鎖；★5 全部解鎖', () => {
        const at4 = buildMentorCardTabView(card(4), 'events').rows.map((r) => r.locked);
        assert.equals(JSON.stringify([false, false, false, false, false, true]), JSON.stringify(at4));
        const at5 = buildMentorCardTabView(card(5), 'events').rows.map((r) => r.locked);
        assert.equals(JSON.stringify([false, false, false, false, false, false]), JSON.stringify(at5));
    });

    suite.test('支援效果列依 requiredStar 鎖頭：★2 鎖、★3 解鎖', () => {
        assert.equals(true, buildMentorCardTabView(card(2), 'effects').rows[1].locked);
        assert.equals(false, buildMentorCardTabView(card(3), 'effects').rows[1].locked);
    });

    suite.test('小插曲不受星等限制', () => {
        const view = buildMentorCardTabView(card(0), 'story');
        assert.equals(false, view.rows[0].locked);
        assert.equals('對話一', view.rows[0].label);
    });

    suite.test('頁籤切換：回傳對應列，各頁籤的 rowCount 正確', () => {
        const view = buildMentorCardTabView(card(5), 'events');
        assert.equals('events', view.activeTab);
        assert.equals(6, view.rows.length);
        assert.equals(JSON.stringify([2, 6, 1]), JSON.stringify(view.tabs.map((t) => t.rowCount)));
    });

    suite.test('不合法的頁籤退回支援效果；星等髒值夾到 0..5', () => {
        assert.equals('effects', buildMentorCardTabView(card(0), 'bogus' as never).activeTab);
        assert.equals(0, clampMentorStar(-3));
        assert.equals(5, clampMentorStar(99));
        assert.equals(0, clampMentorStar(NaN));
        assert.equals(2, clampMentorStar(2.9));
        assert.equals(0, eventGroupRequiredStar(1));
    });

    suite.test('培育教官轉詳情資料：星等帶入，支援效果一列，事件與小插曲暫為空', () => {
        const data = mentorToCardData({ tpBonus: 20, specialty: 'str', stars: 2 });
        assert.equals(2, data.star);
        assert.equals(1, data.effects.length);
        assert.equals(0, data.events.length);
        assert.equals(0, data.stories.length);
        assert.isTrue(data.effects[0].label.includes('TP 加成 +20%'));
    });

    return suite;
}
