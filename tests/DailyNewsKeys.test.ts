/**
 * DailyNewsKeys.test.ts — 日報插槽的查表 key 與參數（PROG-2-1501）
 *
 * 鎖住：復仇、代勞、切磋、特訓、八卦的行為與結果帶 key 與參數，zh-TW 原文不變；
 * zh-TW.json 的句型與核心模板一致；en／ja 的 key 與佔位符齊全；讀檔正規化保留合法 key、去掉非法參數；
 * 面板逐條查表，缺譯文或沒有 key 的條目退回 zh-TW；真實 GameSession 登入產生日報，存讀檔後面板仍取到譯文。
 *
 * Unity 對照：Localization 的 Smart String，句型放在表裡、由參數填入，缺譯文退回基礎語系。
 */
import { assert, TestSuite } from './TestRunner';
import {
    buildNarrative, dailyNewsToastLines, DAILY_NEWS_EMOTION, DAILY_NEWS_TEMPLATE, normalizeDailyNewsState, type DailyNewsGeneral, type DailyNewsState,
} from '../assets/scripts/core/systems/DailyNewsEngine';
import { DailyReportController } from '../assets/scripts/ui/core/DailyReportController';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { PlayerSaveService, PLAYER_SAVE_KEY } from '../assets/scripts/core/services/PlayerSaveService';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');

const DATE = new Date(2026, 9, 28);
const SEED = 1501;
const ZERO_RANDOM = () => 0;

const KEYED_TYPES = ['REVENGE', 'AUTO_TASK', 'OFFLINE_SOCIAL', 'TRAINING', 'GOSSIP'] as const;
const I18N_KEYS = [
    ...Object.keys(DAILY_NEWS_TEMPLATE).map((k) => `UI_DAILY_NEWS_${k}`),
    'UI_DAILY_NEWS_EMOTION_REVENGE', 'UI_DAILY_NEWS_EMOTION_AUTO_TASK', 'UI_DAILY_NEWS_EMOTION_OFFLINE_SOCIAL',
    'UI_DAILY_NEWS_EMOTION_TRAINING', 'UI_DAILY_NEWS_EMOTION_GOSSIP',
];

function general(name: string): DailyNewsGeneral {
    return { name };
}

function hero(id: string, name: string): GeneralConfig {
    return { id, name, faction: 'shu', hp: 1000, str: 80, int: 70, lea: 80, pol: 60, cha: 70 } as unknown as GeneralConfig;
}

function placeholderCount(text: string): number {
    return new Set(text.match(/\{\d+\}/g) ?? []).size;
}

/** 查表回傳 [key:參數]，方便辨認 */
const tagLookup = (key: string, ...args: string[]): string => `[${key}${args.length ? ':' + args.join('|') : ''}]`;

function newsState(items: DailyNewsState['news']): DailyNewsState {
    return { lastGeneratedDay: '2026-10-28', lastLoginMs: 0, news: items };
}

function sessionOn(adapter: MemoryStorageAdapter): GameSession {
    const session = new GameSession(SEED);
    session.setSaveService(new PlayerSaveService(adapter));
    return session;
}

async function roundTrip(adapter: MemoryStorageAdapter): Promise<void> {
    const raw = await adapter.get<unknown>(PLAYER_SAVE_KEY);
    await adapter.set(PLAYER_SAVE_KEY, JSON.parse(JSON.stringify(raw)));
}

/** ISO 時間字串轉毫秒 */
function localMs(iso: string): number {
    return Date.parse(iso);
}

export function createDailyNewsKeysSuite(): TestSuite {
    const suite = new TestSuite('DailyNewsKeys (日報插槽查表 PROG-2-1501)');

    suite.test('復仇：句型加參數，zh-TW 原文不變，key 與參數齊全', () => {
        const n = buildNarrative('REVENGE', general('張飛'), [], '糧草', ZERO_RANDOM, 12);
        assert.equals('帶隊反搶昨日失去的糧草', n.action);
        assert.equals('取回了 12% 的糧草！', n.result);
        assert.equals('UI_DAILY_NEWS_REVENGE_ACTION', n.actionKey);
        assert.equals('糧草', n.actionArgs?.join(','));
        assert.equals('UI_DAILY_NEWS_REVENGE_RESULT', n.resultKey);
        assert.equals('12,糧草', n.resultArgs?.join(','));
    });

    suite.test('代勞、切磋、特訓、八卦：原文與參數正確（隨機取值固定為第一項）', () => {
        const auto = buildNarrative('AUTO_TASK', general('張飛'), [], '糧草', ZERO_RANDOM);
        assert.equals('自動幫你完成了「巡視城防」', auto.action);
        assert.equals('UI_DAILY_NEWS_AUTO_TASK_ACTION', auto.actionKey);
        assert.equals('巡視城防', auto.actionArgs?.join(','));

        const social = buildNarrative('OFFLINE_SOCIAL', general('張飛'), [general('關羽')], '糧草', ZERO_RANDOM);
        assert.equals('在路邊遇到了另一位主公的 關羽', social.action);
        assert.equals('另一位主公,關羽', social.actionArgs?.join(','));

        const training = buildNarrative('TRAINING', general('張飛'), [], '糧草', ZERO_RANDOM);
        assert.equals('武力 +1！', training.result);
        assert.equals('武力,1', training.resultArgs?.join(','));

        const gossip = buildNarrative('GOSSIP', general('張飛'), [], '糧草', ZERO_RANDOM);
        assert.equals('和營中眾將在營中閒聊', gossip.action);
        assert.equals('營中眾將', gossip.actionArgs?.join(','));
    });

    suite.test('沒有 key 化的類型（安慰、購物）維持原樣，不帶 key', () => {
        const comfort = buildNarrative('COMFORT', general('張飛'), [], '糧草', ZERO_RANDOM);
        assert.isTrue(comfort.actionKey === undefined && comfort.resultKey === undefined);
        const shopping = buildNarrative('SHOPPING', general('張飛'), [], '糧草', ZERO_RANDOM);
        assert.isTrue(shopping.actionKey === undefined);
    });

    suite.test('zh-TW.json 的句型與核心模板一致，情緒與核心表一致', () => {
        const dict = JSON.parse(fs.readFileSync('assets/resources/i18n/zh-TW.json', 'utf8')) as Record<string, string>;
        for (const [name, template] of Object.entries(DAILY_NEWS_TEMPLATE)) {
            assert.equals(template, dict[`UI_DAILY_NEWS_${name}`], name);
        }
        for (const type of KEYED_TYPES) {
            assert.equals(DAILY_NEWS_EMOTION[type], dict[`UI_DAILY_NEWS_EMOTION_${type}`], type);
        }
    });

    suite.test('en／ja 有同樣的新 key，且佔位符數量與 zh-TW 相同', () => {
        const zh = JSON.parse(fs.readFileSync('assets/resources/i18n/zh-TW.json', 'utf8')) as Record<string, string>;
        for (const lang of ['en', 'ja']) {
            const dict = JSON.parse(fs.readFileSync(`assets/resources/i18n/${lang}.json`, 'utf8')) as Record<string, string>;
            for (const key of I18N_KEYS) {
                assert.isTrue(typeof dict[key] === 'string' && dict[key].length > 0, `${lang} 缺 ${key}`);
                assert.equals(placeholderCount(zh[key]), placeholderCount(dict[key]), `${lang} ${key} 佔位符數量`);
            }
        }
    });

    suite.test('讀檔正規化：保留合法的 key 與參數，去掉非字串參數；沒有 key 的條目不多出欄位', () => {
        const restored = normalizeDailyNewsState({
            lastGeneratedDay: '2026-10-28',
            lastLoginMs: 1,
            news: [
                { type: 'REVENGE', character: '張飛', emotion: '憤怒', action: '甲', result: '乙', pct: 12,
                    actionKey: 'UI_DAILY_NEWS_REVENGE_ACTION', actionArgs: ['糧草'], resultKey: 'UI_DAILY_NEWS_REVENGE_RESULT', resultArgs: ['12', 3] },
                { type: 'GOSSIP', character: '關羽', emotion: '開心', action: '丙', result: '丁', actionKey: 'UI_DAILY_NEWS_GOSSIP_ACTION' },
                { type: 'COMFORT', character: '趙雲', emotion: '擔憂', action: '戊', result: '己' },
            ],
        });
        assert.equals('UI_DAILY_NEWS_REVENGE_ACTION', restored.news[0].actionKey);
        assert.equals('糧草', restored.news[0].actionArgs?.join(','));
        assert.isFalse('resultArgs' in restored.news[0]);
        assert.equals('UI_DAILY_NEWS_GOSSIP_ACTION', restored.news[1].actionKey);
        assert.isFalse('actionArgs' in restored.news[1]);
        assert.isFalse('actionKey' in restored.news[2]);
    });

    suite.test('面板：有 key 的情緒、行為、結果走查表；沒有 key 的條目與缺譯文退回 zh-TW', () => {
        const items: DailyNewsState['news'] = [
            { type: 'REVENGE', character: '張飛', emotion: '憤怒', action: '帶隊反搶昨日失去的糧草', result: '取回了 12% 的糧草！', read: false,
                actionKey: 'UI_DAILY_NEWS_REVENGE_ACTION', actionArgs: ['糧草'], resultKey: 'UI_DAILY_NEWS_REVENGE_RESULT', resultArgs: ['12', '糧草'], pct: 12 },
            { type: 'COMFORT', character: '趙雲', emotion: '擔憂', action: '主動來營帳探望主公', result: '勝敗乃兵家常事，明日再戰。', read: false },
        ];
        const view = DailyReportController.capture(newsState(items), { journalMark: 0, items: [], read: true }, DATE, false, tagLookup)!.getFlowView();
        assert.equals('張飛（[UI_DAILY_NEWS_EMOTION_REVENGE]）：[UI_DAILY_NEWS_REVENGE_ACTION:糧草]，[UI_DAILY_NEWS_REVENGE_RESULT:12|糧草]', view.texts.newsLine0);
        assert.equals('趙雲（擔憂）：主動來營帳探望主公，勝敗乃兵家常事，明日再戰。', view.texts.newsLine1);

        const missing = DailyReportController.capture(newsState(items), { journalMark: 0, items: [], read: true }, DATE, false, (key) => key)!.getFlowView();
        assert.equals('張飛（憤怒）：帶隊反搶昨日失去的糧草，取回了 12% 的糧草！', missing.texts.newsLine0);
    });

    suite.test('面板：沒有查表時，每則日報行與核心 dailyNewsToastLines 的文字完全相同', () => {
        const items: DailyNewsState['news'] = [
            { type: 'TRAINING', character: '呂布', emotion: '淡定', action: '離線期間自行練功', result: '統率 +2！', read: false,
                actionKey: 'UI_DAILY_NEWS_TRAINING_ACTION', resultKey: 'UI_DAILY_NEWS_TRAINING_RESULT', resultArgs: ['統率', '2'] },
            { type: 'GOSSIP', character: '貂蟬', emotion: '開心', action: '和營中眾將在營中閒聊', result: '傳出了一則趣聞。', read: true },
        ];
        const state = newsState(items);
        const coreLines = dailyNewsToastLines(state, DATE).slice(1);
        const view = DailyReportController.capture(state, { journalMark: 0, items: [], read: true }, DATE)!.getFlowView();
        assert.equals(coreLines.join('\n'), view.texts.newsLine0);
    });

    suite.test('存讀檔流程：登入產生的日報，key 與參數經 JSON 往返後保留，面板仍用查表取文字', async () => {
        const adapter = new MemoryStorageAdapter();
        const source = sessionOn(adapter);
        source.startNewGame(SEED);
        source.enrollGenerals([hero('zhang-fei', '張飛'), hero('guan-yu', '關羽')]);
        source.recordLoginAt(localMs('2026-10-28T04:00:00Z'));
        source.recordPlayerLog('BATTLE_WIN', undefined, localMs('2026-10-28T13:00:00Z'));
        source.recordPlayerLog('GACHA_SUCCESS', undefined, localMs('2026-10-28T13:00:00Z'));
        source.recordLoginAt(localMs('2026-10-29T12:00:00Z'));
        await source.save();
        await roundTrip(adapter);

        const restored = sessionOn(adapter);
        assert.isTrue(await restored.load());
        const keyed = restored.dailyNews.news.filter((item) => item.actionKey !== undefined);
        assert.isTrue(keyed.length > 0, '登入應產生至少一則帶 key 的日報');

        const view = DailyReportController.capture(restored.dailyNews, restored.morningReport, DATE, false, tagLookup)!.getFlowView();
        const lines = [0, 1, 2].map((i) => view.texts[`newsLine${i}`]).filter((text) => text !== '');
        const first = keyed[0];
        assert.isTrue(lines.some((line) => line.includes(`[${first.actionKey}`)), `面板行：${lines.join(' / ')}`);
    });

    return suite;
}
