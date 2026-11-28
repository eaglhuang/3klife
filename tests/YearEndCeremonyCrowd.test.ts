/**
 * YearEndCeremonyCrowd.test.ts — 年末典禮觀禮武將（PROG-2-10106）
 * 資料驅動名單（名冊優先、名將補位）、台詞性別變體、四語系鍵齊全且無男性專用自稱、輪播排程、畫面規格節點。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import crowdConfig from '../assets/resources/data/master/ceremony-crowd-lines.json';
import { selfOf } from '../assets/scripts/core/mind/SpeakerVoice';
import {
    crowdTurn,
    normalizeCrowdGender,
    pickCeremonyCrowd,
    pickNearPodiumLine,
    pickOathCongratsLine,
    pickOathWinnerEntry,
    resolveCrowdLine,
    resolveCrowdVoiceLine,
    type CeremonyCrowdConfig,
} from '../assets/scripts/core/systems/YearEndCeremonyCrowd';
import {
    CEREMONY_RIBBON_COLORS,
    CEREMONY_RIBBON_COUNT,
    RELAY_STEP_SECONDS,
    isPlayerWinner,
    planRelay,
    planRibbons,
    relayTriggerRank,
} from '../assets/scripts/core/systems/CeremonyHype';

const ok = (value: boolean, msg?: string): void => assert.isTrue(value, msg);
const equal = <T>(actual: T, expected: T): void => assert.equals(expected, actual);
const deepEqual = (actual: unknown, expected: unknown): void => assert.equals(JSON.stringify(expected), JSON.stringify(actual));
const ROOT = path.resolve(__dirname, '..');
const readJson = <T = any>(rel: string): T => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')) as T;
const LOCALES = ['zh-TW', 'zh-CN', 'en', 'ja'];
const config = crowdConfig as CeremonyCrowdConfig;
/** 男性專用自稱：通用台詞不得出現（女武將也會說） */
const MALE_ONLY = ['俺', '老子', '本座', '在下', '咱家', '朕', '孤', '吾', '某'];

export function createYearEndCeremonyCrowdSuite(): TestSuite {
    const suite = new TestSuite('YearEndCeremonyCrowd');

    suite.test('資料檔：名將至少 6 位、台詞至少 4 句、id 都是正式名冊 id 且有性別', () => {
        ok(config.crowdGenerals.length >= 6, `觀禮名將 ${config.crowdGenerals.length}`);
        ok(config.cheerKeys.length >= 4, `台詞鍵 ${config.cheerKeys.length}`);
        ok(config.lineIntervalSeconds > 0 && config.maxCrowd >= 4);
        const base = readJson<{ data: Array<{ id: string }> }>('assets/resources/data/master/generals-base.json').data;
        const ids = new Set(base.map((g) => g.id));
        for (const g of config.crowdGenerals) {
            ok(ids.has(g.generalId), `名冊找不到 ${g.generalId}`);
            ok(g.gender === '男' || g.gender === '女', `${g.generalId} 缺性別`);
        }
    });

    suite.test('名冊武將優先（好感高者在前）、名將補位且不重複、子嗣不入列', () => {
        const roster = [
            { id: 'guan-yu', name: '關羽', gender: '男' },
            { id: 'da-qiao', name: '大喬', gender: '女' },
            { id: 'child_9', name: '小娃', gender: '男' },
            { id: 'x-3', name: '三號', gender: '男' },
        ];
        const affinity: Record<string, number> = { 'da-qiao': 90, 'x-3': 10, 'guan-yu': 10 };
        const crowd = pickCeremonyCrowd(roster, (id) => affinity[id] ?? 0, config);
        equal(crowd.length, config.maxCrowd);
        deepEqual(crowd.slice(0, 3).map((m) => m.generalId), ['da-qiao', 'guan-yu', 'x-3']);
        equal(crowd[0].gender, 'F');
        ok(!crowd.some((m) => m.generalId.startsWith('child_')));
        equal(new Set(crowd.map((m) => m.generalId)).size, crowd.length);
    });

    suite.test('名冊為空時全由資料檔名將補滿；好感查詢丟例外不擋名單', () => {
        const crowd = pickCeremonyCrowd([], () => 0, config);
        equal(crowd.length, Math.min(config.maxCrowd, config.crowdGenerals.length));
        const safe = pickCeremonyCrowd([{ id: 'a', name: 'A' }], () => { throw new Error('boom'); }, config);
        equal(safe[0].generalId, 'a');
    });

    suite.test('台詞自稱走共用聲線：男「某」、女「妾身」，與 SpeakerVoice 一致', () => {
        const t = (key: string, ...args: string[]): string => `${key}|${args[0]}`;
        equal(resolveCrowdLine(t, 'k', 'M'), `k|${selfOf({ gender: '男' })}`);
        equal(resolveCrowdLine(t, 'k', 'F'), `k|${selfOf({ gender: '女' })}`);
        ok(selfOf({ gender: '男' }) !== selfOf({ gender: '女' }));
    });

    suite.test('四語系：台詞鍵齊全、無殘留佔位、通用版無男性專用自稱、說話格式有兩個佔位', () => {
        for (const locale of LOCALES) {
            const table = readJson<Record<string, string>>(`assets/resources/i18n/${locale}.json`);
            for (const key of [...config.cheerKeys, ...config.winRelayKeys, ...config.loseRelayKeys]) {
                const text = table[key];
                ok(typeof text === 'string' && text.length > 0, `${locale} 缺 ${key}`);
                ok(!/\{[1-9]\}/.test(text), `${locale} ${key} 多餘佔位`);
                for (const word of MALE_ONLY) ok(!text.includes(word), `${locale} ${key} 含男性專用自稱 ${word}`);
            }
            const say = table['ui.ceremony.crowd.say'];
            ok(say.includes('{0}') && say.includes('{1}'), `${locale} say 格式`);
        }
    });

    suite.test('輪播：說話人輪流、台詞錯開週期；空名單回 -1', () => {
        deepEqual(crowdTurn(0, 6, 6), { memberIndex: 0, lineIndex: 0 });
        deepEqual(crowdTurn(5, 6, 6), { memberIndex: 5, lineIndex: 5 });
        deepEqual(crowdTurn(6, 6, 6), { memberIndex: 0, lineIndex: 1 });
        equal(crowdTurn(3, 0, 6).memberIndex, -1);
        // 一整年典禮三幕合計 ≤ 30 秒，輪播不另外延長：這裡只確認間隔為正且不超過單幕
        ok(config.lineIntervalSeconds <= 7);
    });

    suite.test('畫面規格：ycCrowd 容器與 ycCrowdLine 台詞行存在', () => {
        const layout = readJson('assets/resources/ui-spec/layouts/year-end-ceremony-main.json');
        const ids = new Set<string>();
        const walk = (n: any): void => { if (n?.id) ids.add(n.id); (n?.children ?? []).forEach(walk); };
        walk(layout.root);
        ok(ids.has('ycCrowd') && ids.has('ycCrowdLine'));
    });

    suite.test('熱鬧感：得獎接力 2～3 人換人換句、間隔固定；落榜用拍肩偷笑台詞；人數不足不接力', () => {
        const keys = config.winRelayKeys;
        ok(keys.length >= 3 && config.loseRelayKeys.length >= 3);
        const even = planRelay(0, 6, keys);
        const odd = planRelay(1, 6, keys);
        equal(even.length, 2);
        equal(odd.length, 3);
        deepEqual(odd.map((s) => s.memberIndex), [1, 2, 3]);
        deepEqual(odd.map((s) => s.atSeconds), [0, RELAY_STEP_SECONDS, RELAY_STEP_SECONDS * 2]);
        ok(new Set(odd.map((s) => s.memberIndex)).size === odd.length, '同一輪不重複同一人');
        deepEqual(planRelay(1, 2, keys).map((s) => s.memberIndex), [1, 0]);
        deepEqual(planRelay(0, 1, keys), []);
        deepEqual(planRelay(0, 6, []), []);
        ok(odd[odd.length - 1].atSeconds < 3, '接力在 3 秒內收完，不拖長典禮');
    });

    suite.test('熱鬧感：前三名得獎在自己名次亮框時起鬨，落榜等第 3 名亮框後才拍肩', () => {
        ok(isPlayerWinner(1) && isPlayerWinner(3) && !isPlayerWinner(4) && !isPlayerWinner(0));
        equal(relayTriggerRank(1), 1);
        equal(relayTriggerRank(2), 2);
        equal(relayTriggerRank(3), 3);
        equal(relayTriggerRank(4), 3);
        equal(relayTriggerRank(6), 3);
    });

    suite.test('熱鬧感：彩帶固定 20 枚、橫向散佈在 0～1、五色輪流、延遲與落下秒數有界、同輸入同輸出', () => {
        const specs = planRibbons();
        equal(specs.length, CEREMONY_RIBBON_COUNT);
        equal(CEREMONY_RIBBON_COUNT, 20);
        ok(specs.every((r) => r.x >= 0 && r.x < 1 && r.fall >= 2 && r.fall <= 3.2 && r.delay >= 0 && r.delay < 0.6));
        equal(new Set(specs.map((r) => r.colorIndex)).size, CEREMONY_RIBBON_COLORS.length);
        ok(specs.some((r) => r.sway > 0) && specs.some((r) => r.sway < 0));
        deepEqual(planRibbons(), specs);
    });

    suite.test('台詞聲線：同一句依性別、性格、年齡代入不同自稱（走 SpeakerVoice）', () => {
        const t = (key: string, ...args: string[]): string => `${key}|${args[0]}`;
        const say = (m: { gender: 'M' | 'F'; type?: 'Brave' | 'Wise' | 'Loyal' | 'Playful'; age?: number }): string =>
            resolveCrowdVoiceLine(t, 'k', { generalId: 'x', name: 'X', ...m });
        equal(say({ gender: 'F', type: 'Brave' }), `k|${selfOf({ gender: '女', type: 'Brave' })}`);
        equal(say({ gender: 'F', type: 'Playful' }), 'k|人家');
        equal(say({ gender: 'M', type: 'Playful' }), 'k|咱');
        equal(say({ gender: 'M', age: 12 }), 'k|我');
        equal(say({ gender: 'M', age: 70 }), 'k|老夫');
        equal(say({ gender: 'F', age: 70 }), 'k|老身');
        equal(say({ gender: 'M' }), `k|${selfOf({ gender: '男' })}`);
    });

    suite.test('名冊的性格與年齡會帶進觀眾，資料檔名將沒有就缺省', () => {
        const crowd = pickCeremonyCrowd([{ id: 'a', name: 'A', gender: '女', personality: { type: 'Brave' }, age: 22 }], () => 0, config);
        equal(crowd[0].type, 'Brave');
        equal(crowd[0].age, 22);
        equal(crowd[1].type, undefined);
        equal(crowd[1].age, undefined);
    });

    suite.test('第 4～5 名勉勵：依實際和第 3 名的分差、門檻與名次區間決定', () => {
        const board = (rank: number, score: number) => ({
            entries: [
                { rank: 3, score: 1000, isPlayer: false },
                { rank, score, isPlayer: true },
            ],
        });
        const nearKeys = config.nearPodiumKeys!;
        equal(pickNearPodiumLine(board(4, 900), config, 0)?.deltaScore, 100);
        equal(pickNearPodiumLine(board(5, 750), config, 1)?.deltaScore, 250);
        equal(pickNearPodiumLine(board(5, 750), config, 1)?.key, nearKeys[1]);
        equal(pickNearPodiumLine(board(5, 749), config, 0), null);
        equal(pickNearPodiumLine(board(2, 1200), config, 0), null);
        equal(pickNearPodiumLine(board(6, 990), config, 0), null);
        equal(pickNearPodiumLine(board(4, 999.2), config, 0)?.deltaScore, 1);
        equal(pickNearPodiumLine({ entries: [{ rank: 4, score: 10, isPlayer: true }] }, config, 0), null);
        equal(pickNearPodiumLine(board(4, 900), { ...config, nearPodiumMaxDeltaScore: 50 }, 0), null);
        equal(pickNearPodiumLine(board(4, 900), { ...config, nearPodiumRanks: [5] }, 0), null);
        equal(pickNearPodiumLine(board(4, 900), { ...config, nearPodiumKeys: [] }, 0), null);
    });

    suite.test('結義彩蛋：非主角得獎時祝賀對象是得獎者自己，主角得獎照舊', () => {
        const crowd = [
            { generalId: 'guan-yu', name: '關羽', gender: 'M' as const, age: 30 },
            { generalId: 'zhang-fei', name: '張飛', gender: 'M' as const, age: 28 },
        ];
        // 主角劉備；非主角本府武將趙雲得獎，其結義兄弟是張飛（與劉備的兄弟關羽無關）
        const brothersOf = (id: string): string[] => (id === 'liu-bei' ? ['guan-yu'] : id === 'zhao-yun' ? ['zhang-fei'] : []);
        const fame = [
            { rank: 1, isPlayer: false, generalId: 'lu-bu' },
            { rank: 2, isPlayer: true, generalId: 'zhao-yun' },
        ];
        const winner = pickOathWinnerEntry(fame);
        equal(winner?.generalId, 'zhao-yun');
        const pick = pickOathCongratsLine({ crowd, winnerId: winner!.generalId, brotherIds: brothersOf(winner!.generalId), turn: 0 }, config);
        equal(pick?.memberIndex, 1);
        // 用主角 id 頂替會誤祝賀關羽（舊 bug）
        equal(pickOathCongratsLine({ crowd, winnerId: winner!.generalId, brotherIds: brothersOf('liu-bei'), memberIndex: 1, turn: 0 }, config), null);
        // 主角得獎：照舊以主角 id 查
        const house = pickOathWinnerEntry([{ rank: 1, isPlayer: true, generalId: 'liu-bei' }, { rank: 2, isPlayer: false }]);
        equal(house?.generalId, 'liu-bei');
        equal(pickOathCongratsLine({ crowd, winnerId: house!.generalId, brotherIds: brothersOf(house!.generalId), turn: 0 }, config)?.memberIndex, 0);
        // 本府沒進前三、或得獎項缺 id：不播
        equal(pickOathWinnerEntry([{ rank: 4, isPlayer: true, generalId: 'zhao-yun' }]), null);
        equal(pickOathWinnerEntry([{ rank: 1, isPlayer: true }]), null);
    });

    suite.test('結義彩蛋：只有結義兄弟觀眾觸發，稱謂依性別與年齡，可由資料關閉', () => {
        const crowd = [
            { generalId: 'cao-cao', name: '曹操', gender: 'M' as const, age: 40 },
            { generalId: 'guan-yu', name: '關羽', gender: 'M' as const, age: 30 },
            { generalId: 'da-qiao', name: '大喬', gender: 'F' as const, age: 18 },
        ];
        const rel = config.oathRelationKeys!;
        const base = { crowd, winnerId: 'liu-bei', winnerAge: 25, brotherIds: ['guan-yu', 'da-qiao'], turn: 0 };
        equal(pickOathCongratsLine({ ...base, memberIndex: 0 }, config), null);
        const elder = pickOathCongratsLine({ ...base, memberIndex: 1 }, config);
        equal(elder?.relationKey, rel.elderM);
        equal(elder?.key, config.oathCongratsKeys![0]);
        equal(pickOathCongratsLine({ ...base, memberIndex: 2, turn: 4 }, config)?.relationKey, rel.youngerF);
        equal(pickOathCongratsLine({ ...base, memberIndex: 2, turn: 4 }, config)?.key, config.oathCongratsKeys![1]);
        equal(pickOathCongratsLine(base, config)?.memberIndex, 1);
        equal(pickOathCongratsLine({ ...base, winnerAge: undefined, memberIndex: 2 }, config)?.relationKey, rel.elderF);
        equal(pickOathCongratsLine({ ...base, brotherIds: [], memberIndex: 1 }, config), null);
        equal(pickOathCongratsLine({ ...base, winnerId: 'guan-yu', memberIndex: 1 }, config), null);
        equal(pickOathCongratsLine({ ...base, memberIndex: 1 }, { ...config, oathEasterEggPriority: false }), null);
    });

    suite.test('四語系：勉勵與結義台詞鍵齊全，佔位 {0}{1}（結義再加 {2}）', () => {
        const nearKeys = config.nearPodiumKeys!;
        const oathKeys = config.oathCongratsKeys!;
        ok(nearKeys.length >= 3 && oathKeys.length >= 3);
        for (const locale of LOCALES) {
            const table = readJson<Record<string, string>>(`assets/resources/i18n/${locale}.json`);
            for (const key of nearKeys) {
                const text = table[key];
                ok(typeof text === 'string' && text.includes('{0}') && text.includes('{1}') && !/\{[2-9]\}/.test(text), `${locale} ${key}`);
            }
            for (const key of oathKeys) {
                const text = table[key];
                ok(typeof text === 'string' && text.includes('{0}') && text.includes('{1}') && text.includes('{2}'), `${locale} ${key}`);
            }
            for (const key of Object.values(config.oathRelationKeys!)) ok(!!table[key], `${locale} 缺 ${key}`);
        }
    });

    return suite;
}
