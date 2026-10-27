/**
 * PROG-2-1183：武將日誌回看抽屜（doc_spec_0015 範圍 #6）
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import {
    formatJournalSeason, GENERAL_JOURNAL_MAX_LINES, GeneralJournalController, type GeneralJournalLine,
} from '../assets/scripts/ui/core/GeneralJournalController';
import { UIValidationRunner } from '../assets/scripts/ui/core/UIValidationRunner';
import type { UILayoutSpec, UISkinManifest } from '../assets/scripts/ui/core/UISpecTypes';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

const SPEC = 'assets/resources/ui-spec';
const GENERALS = [{ id: 'zhao', name: '趙雲' }, { id: 'zhang', name: '張飛' }, { id: 'guan', name: '關羽' }];

function readJson(rel: string): unknown {
    return JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8'));
}

function collectIds(node: { id?: string; children?: unknown[] }, out: Set<string>): Set<string> {
    if (node.id) out.add(node.id);
    for (const child of node.children ?? []) collectIds(child as { id?: string; children?: unknown[] }, out);
    return out;
}

function controller(entries: Record<string, GeneralJournalLine[]>, generals = GENERALS): GeneralJournalController {
    return new GeneralJournalController({ generals: () => generals, entries: (id) => entries[id] ?? [] });
}

export function createGeneralJournalControllerSuite(): TestSuite {
    const suite = new TestSuite('GeneralJournalController (PROG-2-1183 武將日誌回看)');

    suite.test('時間格式：季節時間戳轉「N年春」，其他格式取日期', () => {
        assert.equals('184年春', formatJournalSeason('0184-01-01T00:00:00'));
        assert.equals('200年冬', formatJournalSeason('0200-04-01T00:00:00'));
        assert.equals('2026-10-27', formatJournalSeason('2026-10-27T06:00:00'));
    });

    suite.test('列出最新在前、隱藏不列、最多 6 則', () => {
        const many: GeneralJournalLine[] = Array.from({ length: 9 }, (_, i) => ({ timestamp: '0184-02-01T00:00:00', summary: `事${i}` }));
        many.splice(1, 0, { timestamp: '0184-02-01T00:00:00', summary: '密', visibility: 'HIDDEN' });
        const lines = controller({ zhao: many }).lines();
        assert.equals(GENERAL_JOURNAL_MAX_LINES, lines.length);
        assert.equals('184年夏　事0', lines[0]);
        assert.isTrue(lines.every((l) => !l.includes('密')));
    });

    suite.test('切換武將循環、指定武將、FlowView 文字與按鈕', () => {
        const c = controller({ zhang: [{ timestamp: '0184-03-01T00:00:00', summary: '出戰告捷。' }] });
        assert.equals('趙雲的日誌', c.getFlowView().texts.journalTitle);
        assert.isTrue(c.getFlowView().actives.journalEmptyLabel);
        c.prev();
        assert.equals('關羽', c.currentGeneral?.name ?? '');
        c.next();
        c.next();
        const view = c.getFlowView();
        assert.equals('張飛的日誌', view.texts.journalTitle);
        assert.equals('2／3', view.texts.journalPageLabel);
        assert.isTrue(view.actives.journalLine0);
        assert.isTrue(view.enabled.btnNextGeneral);
        assert.isFalse(c.select('nobody'));
        assert.isTrue(c.select('guan'));
        assert.equals('關羽', c.currentGeneral?.name ?? '');
    });

    suite.test('空名冊與單一武將：不可切換', () => {
        const empty = controller({}, []);
        assert.equals('名冊中沒有武將', empty.getFlowView().texts.journalEmptyLabel);
        empty.next();
        assert.isTrue(empty.currentGeneral === null);
        assert.isFalse(controller({}, [GENERALS[0]]).getFlowView().enabled.btnPrevGeneral);
    });

    suite.test('接 GameSession：戰鬥日誌出現在該武將日誌', () => {
        const session = new GameSession(1);
        session.enrollGenerals([{ id: 'zhao', name: '趙雲', faction: 'shu', hp: 1000, str: 80, int: 70, lea: 80, pol: 60, cha: 70 } as GeneralConfig]);
        session.startDispatchJob({ jobId: 'J', name: '巡查', tags: [], requiredStats: {}, storyTags: [], durationMs: 1000, rewardText: '無' }, 'zhao', 0);
        session.settleDispatchJobs(1000);
        const c = new GeneralJournalController({
            generals: () => session.roster.map((g) => ({ id: g.id, name: g.name })),
            entries: (id) => session.queryJournal({ generalUid: id }),
        });
        assert.isTrue(c.lines().length >= 1);
        assert.isTrue(c.lines()[0].includes('巡查'));
    });

    suite.test('版面與皮膚驗證無 error；版面含 FlowView 全部 key；派遣板有入口', () => {
        const layout = readJson(`${SPEC}/layouts/general-journal-main.json`) as UILayoutSpec;
        const skin = readJson(`${SPEC}/skins/general-journal-screen.skin.json`) as UISkinManifest;
        const errors = new UIValidationRunner().validate(layout, skin).issues.filter((i) => i.severity === 'error').map((i) => i.message);
        assert.equals(0, errors.length, errors.join('；'));
        const ids = collectIds((layout as unknown as { root: { id?: string; children?: unknown[] } }).root, new Set<string>());
        const view = controller({}).getFlowView();
        const missing = Object.keys(view.texts).concat(Object.keys(view.actives), Object.keys(view.enabled)).filter((k) => !ids.has(k));
        assert.equals(0, missing.length, missing.join(','));
        const hub = readJson(`${SPEC}/layouts/journal-hub-main.json`) as { root: { id?: string; children?: unknown[] } };
        assert.isTrue(collectIds(hub.root, new Set<string>()).has('btnOpenGeneralJournal'));
    });

    return suite;
}
