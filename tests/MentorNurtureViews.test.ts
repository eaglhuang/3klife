/**
 * MentorNurtureViews.test.ts — 好友借用選擇與畢業紀錄檢視的視圖模型（PROG-2-0746）headless 測試
 *
 * 鎖住：可借與擋下原因的文案；SSR 與星等顯示；畢業紀錄的季數、評級、標籤、TP、揭露層級；
 * JSON 壞掉時標籤退回空；兩組預設文案與 zh-TW.json 同步。
 */
import { assert, TestSuite } from './TestRunner';
import { mentorBorrowRows, MENTOR_BORROW_FALLBACK_ZH_TW } from '../assets/scripts/ui/core/MentorBorrowView';
import { nurtureGraduationRows, parseGraduationTags, NURTURE_GRADUATION_FALLBACK_ZH_TW } from '../assets/scripts/ui/core/NurtureGraduationView';
import type { NpcFriendMentor } from '../assets/scripts/core/systems/NpcFriendMentor';
import type { NurtureRecordDraft } from '../assets/scripts/core/systems/NurtureRecordRow';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

const FRIENDS: NpcFriendMentor[] = [
    { friendId: 'f1', displayName: '趙雲友', supportTemplateId: 'SUP_ZHAO_SSR_01', isSSR: true, star: 3 },
    { friendId: 'f2', displayName: '諸葛友', supportTemplateId: 'SUP_ZHUGE_SR_01', isSSR: false, star: 2 },
];

const RECORD: NurtureRecordDraft = {
    session_id: 's1', child_uid: 'kid', start_season: 2, end_season: 7, mentor_id: null,
    revelation_level: 0, phase_block_history_json: 'null', mentoring_mode_log_json: 'null', reveal_log_json: 'null',
    final_stats_json: '{}', graduation_tags_json: '["耐戰","勇"]', rating: 'A', tp_total: 120,
};

function zhTwTable(): Record<string, string> {
    const file = path.join(__dirname, '..', 'assets', 'resources', 'i18n', 'zh-TW.json');
    return JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, string>;
}

export function createMentorNurtureViewsSuite(): TestSuite {
    const suite = new TestSuite('MentorNurtureViews (借用選擇與畢業紀錄檢視 PROG-2-0746)');

    suite.test('借用選擇：可借與擋下原因；SSR 顯示 SSR 字樣，非 SSR 不顯示', () => {
        const rows = mentorBorrowRows(FRIENDS, (f) => (f.isSSR ? null : 'NOT_SSR'));
        assert.isTrue(rows[0].enabled);
        assert.equals('可借用', rows[0].statusText);
        assert.equals('SSR ★3', rows[0].rankText);
        assert.isFalse(rows[1].enabled);
        assert.equals('只能借用 SSR 教官', rows[1].statusText);
        assert.equals('★2', rows[1].rankText);
    });

    suite.test('借用選擇：各擋下原因都有對應文案', () => {
        const reasons = ['SELF_BORROW', 'DAILY_LIMIT', 'SAME_CARD_TODAY', 'CARD_LOCKED'] as const;
        for (const reason of reasons) {
            const [row] = mentorBorrowRows([FRIENDS[0]], () => reason);
            assert.equals(MENTOR_BORROW_FALLBACK_ZH_TW[`ui.general.mentor.borrow.blocked.${reason}`], row.statusText);
        }
    });

    suite.test('畢業紀錄：季數、評級、標籤、TP 與未揭露文案', () => {
        const [row] = nurtureGraduationRows([RECORD]);
        assert.equals('第 2 季至第 7 季', row.periodText);
        assert.equals('評級 A', row.ratingText);
        assert.equals('耐戰、勇', row.tagsText);
        assert.equals('TP 120', row.tpText);
        assert.equals('未揭露', row.revelationText);
    });

    suite.test('畢業紀錄：揭露層級大於 0 時顯示層數；TP 缺值與標籤空時退回文案', () => {
        const [row] = nurtureGraduationRows([{ ...RECORD, revelation_level: 2, tp_total: null, graduation_tags_json: '[]' }]);
        assert.equals('揭露第 2 層', row.revelationText);
        assert.equals('TP 未紀錄', row.tpText);
        assert.equals('無標籤', row.tagsText);
    });

    suite.test('標籤 JSON 壞掉或不是陣列時回傳空陣列', () => {
        assert.equals(0, parseGraduationTags('not json').length);
        assert.equals(0, parseGraduationTags('{"a":1}').length);
        assert.equals(1, parseGraduationTags('["勇", 3]').length);
    });

    suite.test('兩組預設文案與 zh-TW.json 同步', () => {
        const table = zhTwTable();
        for (const map of [MENTOR_BORROW_FALLBACK_ZH_TW, NURTURE_GRADUATION_FALLBACK_ZH_TW]) {
            for (const key of Object.keys(map)) {
                assert.equals(map[key], table[key], `語系表缺或不同：${key}`);
            }
        }
    });

    return suite;
}
