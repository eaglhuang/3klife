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
    MENTOR_CARD_EMPTY_TEXT,
    MENTOR_CARD_LAYOUT_ROWS,
    toMentorCardLayoutState,
    type MentorCardData,
} from '../assets/scripts/core/systems/MentorCardTabs';
import { parseSupportCatalog } from '../assets/scripts/core/systems/MentorSupportCatalog';
import { inspireEventsFromSupport } from '../assets/scripts/core/systems/MentorInspiration';
import * as fs from 'fs';
import * as path from 'path';

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

    suite.test('沒帶支援卡的教官：星等帶入，支援效果一列，事件與小插曲為空', () => {
        const data = mentorToCardData({ tpBonus: 20, specialty: 'str', stars: 2 });
        assert.equals(2, data.star);
        assert.equals(1, data.effects.length);
        assert.equals(0, data.events.length);
        assert.equals(0, data.stories.length);
        assert.isTrue(data.effects[0].label.includes('TP 加成 +20%'));
    });

    suite.test('支援卡教官：被動減免與靈感事件進詳情，未達星等上鎖', () => {
        const data = mentorToCardData({
            tpBonus: 20,
            specialty: 'str',
            stars: 1,
            vitalitySave: 0.2,
            tacticTpDiscount: 0.15,
            inspire: {
                friendshipBonusByStar: [],
                events: [
                    { eventId: 'E5', tacticId: 'TAC_ZHAO_SPEAR', triggerWindow: [1, 36], baseRate: 0.1, minStar: 5, bloodlineRequired: 'ZHAO' },
                    { eventId: 'E0', tacticId: 'TAC_LANCE_THRUST', triggerWindow: [1, 12], baseRate: 0.25, minStar: 0 },
                ],
            },
        });
        assert.equals(3, data.effects.length);
        assert.isTrue(data.effects[1].label.includes('-20%'));
        assert.isTrue(data.effects[2].label.includes('-15%'));

        const view = buildMentorCardTabView(data, 'events');
        assert.equals('長槍突刺', view.rows[0].label);
        assert.equals(false, view.rows[0].locked);
        assert.isTrue(view.rows[1].label.endsWith('（家傳）'));
        assert.equals(true, view.rows[1].locked);
        assert.isTrue(view.rows[1].lockText!.includes('★5'));
    });

    suite.test('正式支援卡：每張卡的事件都有中文名、對得上星等，且放得進六列', () => {
        const raw = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'assets/resources/data/mentor-support-cards.json'), 'utf8'));
        const catalog = parseSupportCatalog(raw);
        assert.equals(0, catalog.problems.length);
        assert.isTrue(catalog.byGeneralId.size > 0);
        catalog.byGeneralId.forEach((support) => {
            const mentor = { tpBonus: 0, specialty: 'str' as const, stars: 0, inspire: { events: inspireEventsFromSupport(support), friendshipBonusByStar: [] } };
            const data = mentorToCardData(mentor);
            assert.equals(support.tacticInspireEvents.length, data.events.length);
            assert.isTrue(data.events.length <= MENTOR_CARD_LAYOUT_ROWS);
            for (const event of data.events) assert.isTrue(!event.skillName.startsWith('未知戰法'));
        });
    });

    suite.test('專長顯示 UI 端傳入的名稱，不露科目代碼', () => {
        const data = mentorToCardData({ tpBonus: 20, specialty: 'str', stars: 0 }, '武力');
        assert.isTrue(data.effects[0].label.startsWith('武力 專長'));
    });

    suite.test('空頁籤第一列顯示暫無資料，不留白', () => {
        const view = buildMentorCardTabView(mentorToCardData({ tpBonus: 20, specialty: 'str', stars: 0 }), 'story');
        const state = toMentorCardLayoutState(view, '趙雲');
        assert.equals(true, state.actives.row_0);
        assert.equals(false, state.actives.rowLock_0);
        assert.equals(MENTOR_CARD_EMPTY_TEXT, state.texts.rowLabel_0);
        assert.equals(false, state.actives.row_1);
    });

    return suite;
}
