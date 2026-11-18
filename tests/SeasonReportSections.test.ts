/**
 * SeasonReportSections.test.ts — 季報區段純函式（PROG-2-9155，使用者裁決 69）
 *
 * 鎖住：行動／人口民心／心聲三區段的內容與「沒內容不列」、心聲挑選規則（最多 3 則、同將不重複、
 * 強烈心情與剛發生事件優先、台詞為空不入選）、整季無事的簡短一句、精力行只列達標者，
 * 以及新標籤路徑都存在於 season-report-main.json。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { quarterlyBattleReport, type QuarterlyBattleReportRow } from '../assets/scripts/core/systems/RetireReviewCopy';
import {
    buildSeasonReportSections,
    emptySeasonActivity,
    estimateWrappedLines,
    pickMindVoices,
    SEASON_QUIET_LINE,
    type MindVoiceCandidate,
    type SeasonReportInput,
} from '../assets/scripts/core/systems/SeasonReportSections';
import {
    buildSeasonReportPanelRows,
    buildSeasonReportPanelTexts,
    SEASON_REPORT_ACTIONS_LABEL_PATH,
    SEASON_REPORT_EMPTY_HINT_PATH,
    SEASON_REPORT_POPULATION_LABEL_PATH,
    SEASON_REPORT_VOICES_LABEL_PATH,
    seasonReportLabelHeight,
} from '../assets/scripts/core/systems/SeasonReportPanel';

function voice(id: string, over: Partial<MindVoiceCandidate> = {}): MindVoiceCandidate {
    return { generalId: id, name: `將${id}`, mood: 'NORMAL', text: `台詞${id}`, source: 'MOOD', justHappened: false, ...over };
}

function quietInput(over: Partial<SeasonReportInput> = {}): SeasonReportInput {
    return { activity: emptySeasonActivity(), population: { before: 1000, after: 1000 }, morale: { before: 50, after: 50 }, ...over };
}

interface LayoutNodeLike { name: string; children?: LayoutNodeLike[] }

function layoutNames(): Set<string> {
    const file = path.join(__dirname, '..', 'assets', 'resources', 'ui-spec', 'layouts', 'season-report-main.json');
    const root = (JSON.parse(fs.readFileSync(file, 'utf8')) as { root: { children?: LayoutNodeLike[] } }).root;
    const names = new Set<string>();
    const walk = (n: LayoutNodeLike, prefix: string): void => {
        const cur = prefix ? `${prefix}/${n.name}` : n.name;
        names.add(cur);
        for (const c of n.children ?? []) walk(c, cur);
    };
    for (const c of root.children ?? []) walk(c, '');
    return names;
}

export function createSeasonReportSectionsSuite(): TestSuite {
    const suite = new TestSuite('SeasonReportSections (季報強化 PROG-2-9155)');

    suite.test('整季沒事：沒有任何區段，面板顯示簡短一句', () => {
        const sections = buildSeasonReportSections(quietInput());
        assert.equals(0, sections.length);
        const texts = buildSeasonReportPanelTexts('第 1 年 春季', [], [], '', sections);
        assert.equals(SEASON_QUIET_LINE, texts[SEASON_REPORT_EMPTY_HINT_PATH]);
        assert.equals('', texts[SEASON_REPORT_ACTIONS_LABEL_PATH]);
        assert.equals('', texts[SEASON_REPORT_POPULATION_LABEL_PATH]);
        assert.equals('', texts[SEASON_REPORT_VOICES_LABEL_PATH]);
    });

    suite.test('本季行動：戰鬥勝負、內政、差事、新武將、升級、官職都列出，沒發生的不列', () => {
        const activity = emptySeasonActivity();
        activity.battlesWon = 2;
        activity.battlesLost = 1;
        activity.recruits.push('趙雲', '關羽');
        activity.rankUps.push({ name: '張飛', title: '校尉' });
        activity.officerPromotions.push('縣府佐官');
        const sections = buildSeasonReportSections(quietInput({ activity, domestic: { taskName: '農耕', gainText: '糧草 +120' }, hallMissions: { settled: 3, succeeded: 2 } }));
        const lines = sections[0].lines;
        assert.equals('actions', sections[0].id);
        assert.equals('戰鬥：2 勝 1 敗', lines[0]);
        assert.equals('內政：農耕（糧草 +120）', lines[1]);
        assert.equals('差事：完成 3 件，成功 2 件', lines[2]);
        assert.equals('新武將：趙雲、關羽', lines[3]);
        assert.equals('升級：張飛 晉升校尉', lines[4]);
        assert.equals('官職：晉升縣府佐官', lines[5]);
        const onlyDomestic = buildSeasonReportSections(quietInput({ domestic: { taskName: '商業' } }));
        assert.equals(1, onlyDomestic.length);
        assert.equals('內政：商業', onlyDomestic[0].lines[0]);
    });

    suite.test('人口與民心：有變化才列，帶正負號；都沒變不出區段', () => {
        const up = buildSeasonReportSections(quietInput({ population: { before: 12000, after: 12800 }, morale: { before: 60, after: 55 } }));
        assert.equals('population', up[0].id);
        assert.equals('人口：12,000 → 12,800（+800）', up[0].lines[0]);
        assert.equals('民心：60 → 55（-5）', up[0].lines[1]);
        const moraleOnly = buildSeasonReportSections(quietInput({ morale: { before: 50, after: 51 } }));
        assert.equals(1, moraleOnly[0].lines.length);
        assert.equals(0, buildSeasonReportSections(quietInput()).length);
    });

    suite.test('心聲：最多 3 則、同將不重複、強烈心情與剛發生事件優先', () => {
        const picked = pickMindVoices([
            voice('a', { mood: 'HIGH' }),
            voice('b', { mood: 'LOW' }),
            voice('b', { mood: 'EAGER', justHappened: true, text: '重複同將' }),
            voice('c', { justHappened: true, source: 'MEMORY' }),
            voice('d', { mood: 'EAGER' }),
            voice('e', { mood: 'LOW', justHappened: true }),
        ]);
        assert.equals(3, picked.length);
        assert.equals('b,e,c', picked.map((p) => p.generalId).join());
        assert.equals(3, new Set(picked.map((p) => p.generalId)).size);
    });

    suite.test('心聲：台詞為空、來源 NONE、心情普通又沒事件的不入選；同分依 id 排序可重現', () => {
        assert.equals(0, pickMindVoices([voice('a', { text: '', mood: 'LOW' }), voice('b', { source: 'NONE', mood: 'LOW' }), voice('c')]).length);
        const tie = pickMindVoices([voice('z', { mood: 'LOW' }), voice('m', { mood: 'LOW' }), voice('a', { mood: 'LOW' })]);
        assert.equals('a,m,z', tie.map((p) => p.generalId).join());
        assert.equals(2, pickMindVoices(tie, 2).length);
        const sameText = pickMindVoices([voice('a', { mood: 'LOW', text: '一樣' }), voice('b', { mood: 'LOW', text: '一樣' }), voice('c', { mood: 'LOW', text: '不同' })]);
        assert.equals('a,c', sameText.map((p) => p.generalId).join());
    });

    suite.test('心聲區段格式：名字加引號台詞，面板寫進 VoicesLabel 並以標題開頭', () => {
        const sections = buildSeasonReportSections(quietInput({ voices: [voice('a', { mood: 'LOW', text: '近來事事不順。' })] }));
        assert.equals('將a：「近來事事不順。」', sections[0].lines[0]);
        const texts = buildSeasonReportPanelTexts('第 1 年 夏季', [], [], '', sections);
        assert.equals('武將心聲\n將a：「近來事事不順。」', texts[SEASON_REPORT_VOICES_LABEL_PATH]);
        assert.equals('', texts[SEASON_REPORT_EMPTY_HINT_PATH]);
    });

    suite.test('精力行只列達標者（可結緣），不達標的不列、不計入「另有 X 位」', () => {
        const row = (id: string, pct: number): QuarterlyBattleReportRow => ({ generalId: id, ...quarterlyBattleReport(`將${id}`, pct) });
        const rows = buildSeasonReportPanelRows([row('a', 90), row('b', 20), row('c', 51), row('d', 50)]);
        assert.equals(2, rows.length);
        assert.isTrue(rows[0].lineText.includes('將a'));
        assert.isTrue(rows[1].lineText.includes('將c'));
        const none = buildSeasonReportPanelTexts('第 1 年 春季', [row('b', 20)], [], '', []);
        assert.equals(SEASON_QUIET_LINE, none[SEASON_REPORT_EMPTY_HINT_PATH]);
        assert.equals('', none['DialogCard/FooterBar/HintLabel']);
    });

    suite.test('官職預告在沒事的季也會顯示，接在簡短一句之後', () => {
        const texts = buildSeasonReportPanelTexts('第 1 年 春季', [], [], '下一官職「郡守」將開放：天下沙盤', []);
        assert.equals(`${SEASON_QUIET_LINE}\n下一官職「郡守」將開放：天下沙盤`, texts[SEASON_REPORT_EMPTY_HINT_PATH]);
    });

    suite.test('標籤高度依行數估算：沒字為 0，長文會折行撐高，不會被 CLAMP 截掉', () => {
        assert.equals(0, seasonReportLabelHeight(''));
        const one = seasonReportLabelHeight('本季行動\n戰鬥：1 勝 0 敗');
        const many = seasonReportLabelHeight(['本季行動', ...Array.from({ length: 8 }, () => `新武將：${'甲'.repeat(60)}`)].join('\n'));
        assert.isTrue(many > one);
        assert.equals(1, estimateWrappedLines('短', 37));
        assert.equals(2, estimateWrappedLines('甲'.repeat(38), 37));
        assert.equals(3, estimateWrappedLines('a\nb\nc', 34));
    });

    suite.test('新增的區段標籤都存在於 season-report-main.json', () => {
        const names = layoutNames();
        const texts = buildSeasonReportPanelTexts('第 1 年 春季', [], [], '', []);
        const missing = Object.keys(texts).filter((key) => !names.has(key));
        assert.equals(0, missing.length);
        for (const key of [SEASON_REPORT_ACTIONS_LABEL_PATH, SEASON_REPORT_POPULATION_LABEL_PATH, SEASON_REPORT_VOICES_LABEL_PATH]) assert.isTrue(names.has(key));
    });

    return suite;
}
