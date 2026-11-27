/**
 * SeasonNews.test.ts — 季末小報選事與組稿（PROG-2-10150，doc_spec_1345）
 *
 * 鎖住：同輸入同輸出、依 priority 取前三、同種合併與「等 N 人」、不足補 filler、
 * 日誌只取剛結束的季、吐槽走 SpeakerVoice、資料檔壞掉退回預設、四語系鍵齊全、Lobby 接線與排隊順序。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import {
    DEFAULT_SEASON_NEWS_RULES,
    SEASON_NEWS_TYPES,
    buildSeasonNews,
    collectSeasonNewsFacts,
    formatSeasonNewsHeadline,
    journalKindPrefix,
    parseSeasonNewsRules,
    seasonJournalStamp,
    seasonNewsRoastKey,
    seasonNewsRoastLine,
    type SeasonNewsContext,
    type SeasonNewsFact,
    type SeasonNewsInput,
} from '../assets/scripts/core/systems/SeasonNews';

const root = path.resolve(__dirname, '..');
const LOCALES = ['zh-TW', 'zh-CN', 'en', 'ja'];

function locale(name: string): Record<string, string> {
    return JSON.parse(fs.readFileSync(path.join(root, 'assets/resources/i18n', `${name}.json`), 'utf8'));
}

const rules = parseSeasonNewsRules(JSON.parse(fs.readFileSync(path.join(root, 'assets/resources/data/season-news-rules.json'), 'utf8')));
const NAMES: Record<string, string> = { a: '甲', b: '乙', c: '丙', d: '丁', e: '戊' };
const ctxOf = (seasonIndex = 3): SeasonNewsContext => ({ seasonIndex, fallbackRoasterIds: ['a'], rosterIds: new Set(Object.keys(NAMES)) });
const same = (expected: unknown, actual: unknown, msg?: string): void => assert.equals(JSON.stringify(expected), JSON.stringify(actual), msg);
const fact = (kind: string, ...ids: string[]): SeasonNewsFact => ({ kind, ids, names: ids.map((id) => NAMES[id]) });

function inputOf(partial: Partial<SeasonNewsInput> = {}): SeasonNewsInput {
    return { journal: [], sinceTimestamp: '0001-02-01T00:00:00', mind: [], mindSinceSeason: 5, recruits: [], nameOf: (id) => NAMES[id], ...partial };
}

export function createSeasonNewsSuite(): TestSuite {
    const suite = new TestSuite('SeasonNews (PROG-2-10150 每季小報)');
    const zh = locale('zh-TW');
    const t = (key: string, ...args: string[]): string => (zh[key] ?? key).replace(/\{(\d+)\}/g, (_m, i) => args[Number(i)] ?? '');

    suite.test('TC-NEWS-01 同事實輸入兩次，輸出完全相同（與輸入順序無關）', () => {
        const facts = [fact('battle_win', 'a'), fact('marriage', 'b', 'c'), fact('retire', 'd')];
        assert.equals(JSON.stringify(buildSeasonNews(facts, rules, ctxOf())), JSON.stringify(buildSeasonNews([...facts].reverse(), rules, ctxOf())));
    });

    suite.test('TC-NEWS-02 事實多於三種只留 priority 最高的三種', () => {
        const issue = buildSeasonNews([fact('dispatch_fail', 'a'), fact('marriage', 'b'), fact('battle_lose', 'c'), fact('birth', 'd'), fact('promotion', 'e')], rules, ctxOf());
        same(['marriage', 'birth', 'promotion'], issue.headlines.map((h) => h.kind));
    });

    suite.test('TC-NEWS-03 同 kind 合併成一行，超過 maxNames 寫「等 N 人」', () => {
        const issue = buildSeasonNews([fact('battle_win', 'a', 'b', 'c', 'd', 'e')], rules, ctxOf());
        const first = issue.headlines[0];
        assert.equals(rules.maxNames, first.names.length);
        assert.equals(2, first.more);
        const line = formatSeasonNewsHeadline(first, t);
        assert.isTrue(line.includes('甲、乙、丙') && line.includes('等 2 人'), `頭條：${line}`);
    });

    suite.test('TC-NEWS-04 事實不足補 filler，行數永遠等於 headlineCount，filler 不重複', () => {
        for (const facts of [[], [fact('birth', 'a')]]) {
            const issue = buildSeasonNews(facts, rules, ctxOf(7));
            assert.equals(rules.headlineCount, issue.headlines.length);
            const fillers = issue.headlines.filter((h) => h.kind === null).map((h) => h.key);
            assert.equals(new Set(fillers).size, fillers.length, 'filler 不應重複');
            for (const key of fillers) assert.isTrue(typeof zh[key] === 'string', `缺 ${key}`);
        }
        assert.equals('quiet', buildSeasonNews([], rules, ctxOf()).tone);
        assert.equals('good', buildSeasonNews([fact('birth', 'a')], rules, ctxOf()).tone);
        assert.equals('bad', buildSeasonNews([fact('battle_lose', 'a')], rules, ctxOf()).tone);
    });

    suite.test('TC-NEWS-05 日誌只取剛結束的季及之後；舊季、未收錄前綴不入報；婚嫁需 marriage 標記', () => {
        const since = seasonJournalStamp(1, 2);
        assert.equals('0001-02-01T00:00:00', since);
        const facts = collectSeasonNewsFacts(inputOf({
            journal: [
                { entryId: 'BATTLE_WIN-3', timestamp: '0001-01-01T00:00:00', relatedGeneralUids: ['a'] },
                { entryId: 'BATTLE_LOSE-9', timestamp: '0001-02-01T00:00:00', relatedGeneralUids: ['b'] },
                { entryId: 'GENERAL_BORN-10', timestamp: '0001-03-01T00:00:00', relatedGeneralUids: ['c', 'zz'] },
                { entryId: 'CHILD_OMEN-11', timestamp: '0001-02-01T00:00:00', relatedGeneralUids: ['d'] },
            ],
            mind: [
                { generalId: 'd', kind: 'BOND_FORMED', season: 5, tags: ['marriage'] },
                { generalId: 'e', kind: 'BOND_FORMED', season: 5, tags: [] },
                { generalId: 'e', kind: 'BOND_FORMED', season: 4, tags: ['marriage'] },
            ],
            promotion: { rankName: '縣令' },
            recruits: [{ id: 'e', name: '戊' }],
        }), rules);
        const byKind = Object.fromEntries(facts.map((f) => [f.kind, f.names]));
        assert.equals(undefined, byKind.battle_win, '舊季戰果不入報');
        same(['乙'], byKind.battle_lose);
        same(['丙'], byKind.birth, '查不到名字的人不入報');
        same(['丁'], byKind.marriage);
        same(['縣令'], byKind.promotion);
        same(['戊'], byKind.recruit);
        assert.equals(undefined, byKind.CHILD_OMEN);
        assert.equals('GENERAL_BORN', journalKindPrefix('GENERAL_BORN-10'));
    });

    suite.test('TC-NEWS-06 吐槽台詞自稱走 SpeakerVoice：女將不稱某、少年稱我；找不到句子回空字串', () => {
        for (const tone of ['good', 'bad', 'quiet'] as const) {
            for (const type of SEASON_NEWS_TYPES) {
                const female = seasonNewsRoastLine(tone, { gender: '女', type, age: 30 }, (k) => zh[k] ?? k);
                assert.isTrue(female.length > 0 && !female.includes('{') && !female.includes('某'), `女將台詞：${female}`);
                const youth = seasonNewsRoastLine(tone, { gender: '男', type, age: 14 }, (k) => zh[k] ?? k);
                assert.isTrue(youth.includes('我') && !youth.includes('某'), `少年台詞：${youth}`);
            }
        }
        const wise = seasonNewsRoastLine('good', { gender: '女', type: 'Wise', age: 30 }, (k) => zh[k] ?? k);
        assert.isTrue(wise.includes('妾身'), `智女應自稱妾身：${wise}`);
        assert.equals('', seasonNewsRoastLine('good', {}, (k) => k));
    });

    suite.test('吐槽者優先取頭條第一行的相關武將；不在名冊就退回主將', () => {
        const hit = buildSeasonNews([fact('marriage', 'c', 'd')], rules, ctxOf());
        assert.equals('c', hit.roasterId);
        const gone = buildSeasonNews([fact('marriage', 'zz')], rules, { ...ctxOf(), rosterIds: new Set(['a']) });
        assert.equals('a', gone.roasterId);
        assert.equals(null, buildSeasonNews([], rules, { ...ctxOf(), rosterIds: new Set() }).roasterId);
    });

    suite.test('TC-NEWS-07 資料檔壞掉退回預設、不拋例外；不合法種類略過', () => {
        for (const bad of [null, undefined, 42, 'x', [], {}, { kinds: 5 }, { kinds: { x: { priority: 'hi', tone: 'good' } } }]) {
            const parsed = parseSeasonNewsRules(bad);
            assert.equals(DEFAULT_SEASON_NEWS_RULES.headlineCount, parsed.headlineCount);
            assert.isTrue('marriage' in parsed.kinds, '應退回預設種類');
        }
        const partial = parseSeasonNewsRules({ headlineCount: 2, kinds: { birth: { priority: 5, tone: 'good' }, junk: { priority: 1, tone: 'x' } }, sources: { journal: { GENERAL_BORN: 'birth', BATTLE_WIN: 'nope' } } });
        assert.equals(2, partial.headlineCount);
        same(['birth'], Object.keys(partial.kinds));
        same({ GENERAL_BORN: 'birth' }, partial.sources.journal);
    });

    suite.test('TC-NEWS-08 四語系鍵一致：每個 kind 有 item 句、每個語氣×性格有吐槽句、filler 與版面字串齊全', () => {
        for (const name of LOCALES) {
            const table = locale(name);
            const need = ['ui.seasonNews.title', 'ui.seasonNews.edition', 'ui.seasonNews.hint', 'ui.seasonNews.etc'];
            for (const kind of Object.keys(rules.kinds)) need.push(`ui.seasonNews.item.${kind}`);
            for (let i = 1; i <= rules.fillerCount; i += 1) need.push(`ui.seasonNews.filler.${i}`);
            for (const tone of ['good', 'bad', 'quiet'] as const) for (const type of SEASON_NEWS_TYPES) need.push(seasonNewsRoastKey(tone, type));
            for (const key of need) assert.isTrue(typeof table[key] === 'string' && table[key].length > 0, `${name} 缺 ${key}`);
        }
        for (const kind of Object.keys(rules.kinds)) assert.isTrue(rules.kinds[kind].tone === 'good' || rules.kinds[kind].tone === 'bad', `${kind} tone`);
    });

    suite.test('接線：LobbyScene 用資料檔規則、小報在季報之後且在其他彈窗之前、彈窗用比例版面與共用頭像元件', () => {
        const lobby = fs.readFileSync(path.join(root, 'assets/scripts/ui/scenes/LobbyScene.ts'), 'utf8');
        assert.isTrue(lobby.includes("'data/season-news-rules'"), '應讀資料檔');
        assert.isTrue(/followUps = \(\): void => \{ void this\._showSeasonNews\(/.test(lobby), '小報應排在季報關閉後的最前面');
        const afterNews = lobby.indexOf('const afterNews = (): void => {');
        assert.isTrue(afterNews > 0 && lobby.indexOf("this._openSeasonChronicle('season-advance')", afterNews) > afterNews, '其他彈窗應排在小報之後');
        const popup = fs.readFileSync(path.join(root, 'assets/scripts/ui/components/SeasonNewsPopup.ts'), 'utf8');
        assert.isTrue(popup.includes('showPopupSpeaker') && popup.includes('SIZE_CHANGED') && popup.includes('SEASON_NEWS_PAPER_RATIO'), '應重用頭像元件並依尺寸重排');
    });

    return suite;
}
