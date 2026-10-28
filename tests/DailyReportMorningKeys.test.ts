/**
 * DailyReportMorningKeys.test.ts — 登入面板的晨報開場與條目查表（PROG-2-1500）
 *
 * 鎖住：有 key 的晨報條目與開場走查表譯文（參數照傳）；沒有 key 或缺譯文退回 zh-TW；
 * 已讀或沒有未讀條目時不開面板；真實 GameSession 寫入帶 key 的日誌、登入產生晨報、
 * 存讀檔後，面板仍用查表取文字。
 *
 * Unity 對照：晨報面板的 LocalizedString 欄位，表缺就顯示基礎語系原句。
 */
import { assert, TestSuite } from './TestRunner';
import type { DailyNewsState } from '../assets/scripts/core/systems/DailyNewsEngine';
import { EMPTY_MORNING_REPORT, MORNING_REPORT_OPENING, type MorningReportState } from '../assets/scripts/core/systems/MorningReport';
import { DAILY_REPORT_FALLBACK_ZH_TW } from '../assets/scripts/ui/core/DailyReportTexts';
import { DailyReportController } from '../assets/scripts/ui/core/DailyReportController';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { PlayerSaveService, PLAYER_SAVE_KEY } from '../assets/scripts/core/services/PlayerSaveService';
import { DISPATCH_COMPLETE_KEY, dispatchCompleteArgs, dispatchCompleteLine } from '../assets/scripts/core/systems/DispatchQuality';

const DATE = new Date(2026, 9, 28);
const SEED = 1500;

/** 沒有日報、只有晨報的狀態（日報為空時 capture 只看晨報） */
function emptyNews(): DailyNewsState {
    return { lastGeneratedDay: null, lastLoginMs: 0, news: [] } as unknown as DailyNewsState;
}

function morningWith(items: MorningReportState['items'], read = false): MorningReportState {
    return { journalMark: items.length, items, read };
}

/** 查表回傳 [key:參數]，方便辨認 */
const tagLookup = (key: string, ...args: string[]): string => `[${key}${args.length ? ':' + args.join('|') : ''}]`;

function sessionOn(adapter: MemoryStorageAdapter): GameSession {
    const session = new GameSession(SEED);
    session.setSaveService(new PlayerSaveService(adapter));
    return session;
}

/** 中午 12:00（UTC+8）的毫秒數，確保切日後落在指定登入日 */
function noonOf(day: string): number {
    return Date.parse(`${day}T04:00:00Z`);
}

async function roundTrip(adapter: MemoryStorageAdapter): Promise<void> {
    const raw = await adapter.get<unknown>(PLAYER_SAVE_KEY);
    await adapter.set(PLAYER_SAVE_KEY, JSON.parse(JSON.stringify(raw)));
}

export function createDailyReportMorningKeysSuite(): TestSuite {
    const suite = new TestSuite('DailyReportMorningKeys (晨報查表 PROG-2-1500)');

    suite.test('有 key 的晨報條目與開場走查表譯文，參數照傳', () => {
        const morning = morningWith([{
            entryId: 'A',
            summary: dispatchCompleteLine('張飛', '巡邏', '糧草 +30'),
            summaryKey: DISPATCH_COMPLETE_KEY,
            summaryArgs: dispatchCompleteArgs('張飛', '巡邏', '糧草 +30'),
        }]);
        const view = DailyReportController.capture(emptyNews(), morning, DATE, false, tagLookup)!.getFlowView();
        assert.equals(`[UI_JOURNAL_STORY_MORNING_OPENING]`, view.texts.morningHeader);
        assert.equals('[UI_JOURNAL_STORY_DISPATCH_DONE:張飛|巡邏|糧草 +30]', view.texts.morningLine0);
        assert.isTrue(view.actives.morningLine0);
    });

    suite.test('沒有查表時，開場與條目都是 zh-TW 原句', () => {
        const morning = morningWith([{ entryId: 'A', summary: '甲事', summaryKey: DISPATCH_COMPLETE_KEY, summaryArgs: ['x', 'y', 'z'] }]);
        const view = DailyReportController.capture(emptyNews(), morning, DATE)!.getFlowView();
        assert.equals(MORNING_REPORT_OPENING, view.texts.morningHeader);
        assert.equals('甲事', view.texts.morningLine0);
    });

    suite.test('沒有 key 的舊條目照常顯示 summary，不經查表', () => {
        const morning = morningWith([{ entryId: 'A', summary: '舊的一句' }]);
        const view = DailyReportController.capture(emptyNews(), morning, DATE, false, tagLookup)!.getFlowView();
        assert.equals('舊的一句', view.texts.morningLine0);
    });

    suite.test('查表缺譯文（回傳 key）時，條目退回 zh-TW 原句', () => {
        const morning = morningWith([{ entryId: 'A', summary: '甲事', summaryKey: DISPATCH_COMPLETE_KEY, summaryArgs: ['a', 'b', 'c'] }]);
        const view = DailyReportController.capture(emptyNews(), morning, DATE, false, (key) => key)!.getFlowView();
        assert.equals('甲事', view.texts.morningLine0);
        assert.equals(MORNING_REPORT_OPENING, DailyReportController.capture(emptyNews(), morning, DATE, false, (key) => key)!.getFlowView().texts.morningHeader);
    });

    suite.test('已讀或沒有晨報條目時，晨報不算未讀；日報也沒有時不開面板', () => {
        assert.isTrue(DailyReportController.capture(emptyNews(), morningWith([{ entryId: 'A', summary: '甲' }], true), DATE, false, tagLookup) === null);
        assert.isTrue(DailyReportController.capture(emptyNews(), EMPTY_MORNING_REPORT, DATE, false, tagLookup) === null);
    });

    suite.test('面板的分區標題與按鈕沿用既有查表（不受晨報改動影響）', () => {
        const view = DailyReportController.capture(emptyNews(), morningWith([{ entryId: 'A', summary: '甲' }]), DATE)!.getFlowView();
        assert.equals(DAILY_REPORT_FALLBACK_ZH_TW.UI_DAILY_REPORT_OPEN_HUB, view.texts.btnOpenJournalHubLabel);
    });

    suite.test('存讀檔流程：帶 key 的派遣條目進晨報，存讀檔後面板仍用查表取文字', async () => {
        const adapter = new MemoryStorageAdapter();
        const source = sessionOn(adapter);
        source.startNewGame(SEED);
        source.recordJournal({
            entryId: 'DISPATCH_JOB-1',
            timestamp: '2026-10-28T06:00:00',
            category: 'DISPATCH',
            relatedGeneralUids: ['zhang-fei'],
            priority: 90,
            summary: dispatchCompleteLine('張飛', '巡邏', '糧草 +30'),
            summaryKey: DISPATCH_COMPLETE_KEY,
            summaryArgs: dispatchCompleteArgs('張飛', '巡邏', '糧草 +30'),
        });
        source.recordLoginAt(noonOf('2026-10-28'));
        await source.save();
        await roundTrip(adapter);

        const restored = sessionOn(adapter);
        assert.isTrue(await restored.load());
        const keyed = restored.morningReport.items.find((item) => item.summaryKey === DISPATCH_COMPLETE_KEY);
        assert.isTrue(keyed !== undefined, '晨報條目應帶回 key');

        const view = DailyReportController.capture(restored.dailyNews, restored.morningReport, DATE, false, tagLookup)!.getFlowView();
        const lines = [0, 1, 2].map((i) => view.texts[`morningLine${i}`]).filter((text) => text !== '');
        assert.isTrue(lines.includes('[UI_JOURNAL_STORY_DISPATCH_DONE:張飛|巡邏|糧草 +30]'), `實際面板行：${lines.join(' / ')}`);
    });

    return suite;
}
