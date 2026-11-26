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
    resolveCrowdLine,
    type CeremonyCrowdConfig,
} from '../assets/scripts/core/systems/YearEndCeremonyCrowd';

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
            for (const key of config.cheerKeys) {
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

    return suite;
}
