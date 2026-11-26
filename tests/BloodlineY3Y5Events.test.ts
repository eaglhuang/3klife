/**
 * BloodlineY3Y5Events.test.ts — 血統第 3～5 年成長小事件（PROG-2-10057）
 * 鎖住：資料 schema 驗證（含 gold 不合法）、四語系 key 齊全、依年份／年齡觸發、
 * 每孩子每事件只觸發一次、各選項效果、存檔 normalize 與舊存檔相容。
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, TestSuite } from './TestRunner';
import {
    BLOODLINE_EVENT_AGE_OFFSET,
    bloodlineEventAgeOfYear,
    bloodlineSilverCost,
    bloodlineStatDeltas,
    chooseBloodlineEventOption,
    dueBloodlineEvent,
    emptyBloodlineEventState,
    hasTriggeredBloodlineEvent,
    loadBloodlineY3Y5Events,
    normalizeBloodlineEventState,
    validateBloodlineY3Y5Events,
} from '../assets/scripts/core/systems/BloodlineY3Y5Events';

const ROOT = join(__dirname, '..');
const LANGS = ['zh-TW', 'zh-CN', 'en', 'ja'] as const;

function readJson<T>(rel: string): T {
    return JSON.parse(readFileSync(join(ROOT, rel), 'utf8')) as T;
}

/** 每次回傳全新的合格資料副本，測試可自行改壞其中一處 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function freshRaw(): any {
    return readJson<unknown>('assets/resources/data/master/bloodline-y3y5-events.json');
}

export function createBloodlineY3Y5EventsSuite(): TestSuite {
    const suite = new TestSuite('BloodlineY3Y5Events');

    suite.test('正式資料通過驗證：第 3/4/5 年各一件、各兩選項、銀兩寫 silver', () => {
        const raw = freshRaw();
        assert.lengthEquals(0, validateBloodlineY3Y5Events(raw), validateBloodlineY3Y5Events(raw).join('；'));
        const table = loadBloodlineY3Y5Events(raw);
        assert.equals('3,4,5', table.events.map((e) => e.triggerYear).join(','));
        for (const e of table.events) assert.lengthEquals(2, e.options);
        const y4A = table.events[1].options[0].effects;
        assert.equals(-50, y4A.silver);
        assert.equals(undefined, (y4A as Record<string, unknown>).gold, '第 4 年 A 不可再用 gold');
    });

    suite.test('四語系都有每個事件的標題、描述、選項與結果文字', () => {
        const table = loadBloodlineY3Y5Events();
        for (const lang of LANGS) {
            const bundle = readJson<Record<string, string>>(`assets/resources/i18n/${lang}.json`);
            for (const e of table.events) {
                const keys = [e.titleKey, e.descKey, ...e.options.flatMap((o) => [o.labelKey, o.resultKey])];
                for (const key of keys) assert.isTrue(typeof bundle[key] === 'string' && bundle[key].length > 0, `${lang} 缺 ${key}`);
            }
        }
    });

    suite.test('schema 驗證：gold、未知欄位、非整數、缺年份、選項數錯誤都會被擋', () => {
        const withGold = freshRaw();
        withGold.events[1].options[0].effects = { int: 1, gold: -50 };
        assert.contains(validateBloodlineY3Y5Events(withGold).join('；'), 'silver');

        const unknown = freshRaw();
        unknown.events[0].options[0].effects.luck = 3;
        assert.contains(validateBloodlineY3Y5Events(unknown).join('；'), '未知欄位');

        const fractional = freshRaw();
        fractional.events[0].options[0].effects.favor = 1.5;
        assert.contains(validateBloodlineY3Y5Events(fractional).join('；'), '整數');

        const missingYear = freshRaw();
        missingYear.events.pop();
        assert.contains(validateBloodlineY3Y5Events(missingYear).join('；'), '缺少第 5 年');

        const oneOption = freshRaw();
        oneOption.events[2].options.pop();
        assert.contains(validateBloodlineY3Y5Events(oneOption).join('；'), '剛好 2 個選項');

        const dupYear = freshRaw();
        dupYear.events[1].triggerYear = 3;
        assert.contains(validateBloodlineY3Y5Events(dupYear).join('；'), '重複');

        const badFlag = freshRaw();
        badFlag.events[2].options[1].effects.friendUnlocked = 'yes';
        assert.contains(validateBloodlineY3Y5Events(badFlag).join('；'), '布林');

        assert.throws(() => loadBloodlineY3Y5Events(withGold), '載入不合格資料要丟例外');
        assert.isTrue(validateBloodlineY3Y5Events(null).length > 0);
        assert.isTrue(validateBloodlineY3Y5Events({ schemaVersion: 2, events: [] }).length > 0);
    });

    suite.test('觸發：培育第 3/4/5 年或孩子 9/10/11 歲才抽到對應事件，其餘年份沒有', () => {
        const table = loadBloodlineY3Y5Events();
        const state = emptyBloodlineEventState();
        assert.equals(6, BLOODLINE_EVENT_AGE_OFFSET);
        assert.equals(9, bloodlineEventAgeOfYear(3));
        assert.equals('child_y3_stove_sugar', dueBloodlineEvent(table, state, 'kid', { year: 3 })?.id);
        assert.equals('child_y4_academy_nap', dueBloodlineEvent(table, state, 'kid', { year: 4 })?.id);
        assert.equals('child_y5_push_cart', dueBloodlineEvent(table, state, 'kid', { age: 11 })?.id);
        assert.equals('child_y3_stove_sugar', dueBloodlineEvent(table, state, 'kid', { age: 9 })?.id);
        assert.equals(null, dueBloodlineEvent(table, state, 'kid', { year: 1 }));
        assert.equals(null, dueBloodlineEvent(table, state, 'kid', { year: 6 }));
        assert.equals(null, dueBloodlineEvent(table, state, 'kid', { age: 12 }));
        assert.equals(null, dueBloodlineEvent(table, state, 'kid', {}));
        assert.equals(null, dueBloodlineEvent(table, state, 'kid', { age: 9.5 }), '小數年齡不觸發');
    });

    suite.test('每個孩子每事件一生只觸發一次；另一個孩子不受影響', () => {
        const table = loadBloodlineY3Y5Events();
        const first = chooseBloodlineEventOption(table, emptyBloodlineEventState(), 'kid-a', 'child_y3_stove_sugar', 'B', 3);
        assert.isTrue(first.ok);
        if (!first.ok) return;
        assert.isTrue(hasTriggeredBloodlineEvent(first.state, 'kid-a', 'child_y3_stove_sugar'));
        assert.equals(null, dueBloodlineEvent(table, first.state, 'kid-a', { year: 3 }), '已觸發後不再抽到');
        assert.equals('child_y3_stove_sugar', dueBloodlineEvent(table, first.state, 'kid-b', { year: 3 })?.id);
        const again = chooseBloodlineEventOption(table, first.state, 'kid-a', 'child_y3_stove_sugar', 'A', 3);
        assert.isFalse(again.ok);
        if (!again.ok) assert.equals('already-triggered', again.reason);
        assert.lengthEquals(1, first.state.records, '重複選擇不增加紀錄');
        assert.equals('B', first.state.records[0].optionId, '第一次的選擇為準');
    });

    suite.test('選擇不存在的事件或選項：回傳原因且不改狀態', () => {
        const table = loadBloodlineY3Y5Events();
        const state = emptyBloodlineEventState();
        const noEvent = chooseBloodlineEventOption(table, state, 'kid', 'nope', 'A', 3);
        const noOption = chooseBloodlineEventOption(table, state, 'kid', 'child_y3_stove_sugar', 'C', 3);
        assert.isFalse(noEvent.ok);
        assert.isFalse(noOption.ok);
        if (!noEvent.ok) assert.equals('unknown-event', noEvent.reason);
        if (!noOption.ok) assert.equals('unknown-option', noOption.reason);
        assert.lengthEquals(0, state.records);
    });

    suite.test('六個選項的效果與結果文字 key 對得上資料', () => {
        const table = loadBloodlineY3Y5Events();
        const expected: Record<string, Record<string, object>> = {
            child_y3_stove_sugar: { A: { pol: 1, favor: -2 }, B: { favor: 5, epithetFragments: 1 } },
            child_y4_academy_nap: { A: { int: 1, silver: -50 }, B: { favor: 4 } },
            child_y5_push_cart: { A: { str: 1, prestige: 3 }, B: { cha: 1, friendUnlocked: true } },
        };
        for (const e of table.events) {
            for (const opt of e.options) {
                const out = chooseBloodlineEventOption(table, emptyBloodlineEventState(), 'kid', e.id, opt.id, e.triggerYear);
                assert.isTrue(out.ok);
                if (!out.ok) continue;
                assert.equals(JSON.stringify(expected[e.id][opt.id]), JSON.stringify(out.effects), `${e.id}/${opt.id} 效果`);
                assert.equals(opt.resultKey, out.resultKey);
                assert.equals(e.triggerYear, out.state.records[0].year);
            }
        }
    });

    suite.test('效果輔助：屬性加減只列有填的五維；銀兩支出為正數；回傳效果是複本', () => {
        assert.equals(JSON.stringify({ pol: 1 }), JSON.stringify(bloodlineStatDeltas({ pol: 1, favor: -2 })));
        assert.equals('{}', JSON.stringify(bloodlineStatDeltas({ favor: 5, str: 0 })));
        assert.equals(50, bloodlineSilverCost({ int: 1, silver: -50 }));
        assert.equals(0, bloodlineSilverCost({ silver: 20 }));
        assert.equals(0, bloodlineSilverCost({ favor: 1 }));
        const table = loadBloodlineY3Y5Events();
        const out = chooseBloodlineEventOption(table, emptyBloodlineEventState(), 'kid', 'child_y4_academy_nap', 'A', 4);
        if (!out.ok) throw new Error('應成功');
        out.effects.silver = 0;
        assert.equals(-50, table.events[1].options[0].effects.silver, '改回傳效果不影響資料表');
    });

    suite.test('存檔 normalize：舊存檔缺欄位視為沒觸發過，壞資料被濾掉，重複紀錄只留第一筆', () => {
        assert.lengthEquals(0, normalizeBloodlineEventState(undefined).records);
        assert.lengthEquals(0, normalizeBloodlineEventState(null).records);
        assert.lengthEquals(0, normalizeBloodlineEventState({}).records);
        assert.lengthEquals(0, normalizeBloodlineEventState({ records: 'x' }).records);
        const state = normalizeBloodlineEventState({
            records: [
                { childId: 'a', eventId: 'e1', optionId: 'A', year: 3 },
                { childId: 'a', eventId: 'e1', optionId: 'B', year: 3 },
                { childId: 'a', eventId: 'e2', optionId: 'C', year: 4 },
                { childId: '', eventId: 'e3', optionId: 'A', year: 5 },
                { childId: 'b', eventId: 'e1', optionId: 'B' },
                null,
                'junk',
            ],
        });
        assert.equals(2, state.records.length);
        assert.equals('A', state.records[0].optionId);
        assert.equals(0, state.records[1].year, '缺年份補 0');
    });

    suite.test('存檔來回：JSON 序列化後再 normalize，已觸發的事件仍擋得住', () => {
        const table = loadBloodlineY3Y5Events();
        const chosen = chooseBloodlineEventOption(table, emptyBloodlineEventState(), 'kid', 'child_y5_push_cart', 'B', 5);
        if (!chosen.ok) throw new Error('應成功');
        const loaded = normalizeBloodlineEventState(JSON.parse(JSON.stringify(chosen.state)));
        assert.equals(null, dueBloodlineEvent(table, loaded, 'kid', { year: 5 }));
        assert.equals('B', loaded.records[0].optionId);
    });

    return suite;
}
