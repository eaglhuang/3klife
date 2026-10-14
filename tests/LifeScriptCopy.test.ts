/**
 * LifeScriptCopy — 壽命與階段劇本文案（LIFE-13，PROG-2-0430）
 *
 * 覆蓋：每個文案 Key 都存在於 zh-TW.json；佔位符個數與參數個數一致；
 * 參數順序（死亡為名字再享年）；歲數無條件捨去顯示。
 */
import { assert, TestSuite } from './TestRunner';
import {
    LIFE_AGE_DISPLAY_KEY,
    LIFE_DEATH_NOTIFY_KEY,
    LIFE_LIFESPAN_BAR_KEY,
    LIFE_PHASE_KEYS,
    LIFE_SCRIPT_ARG_COUNT,
    LIFE_SCRIPT_KEYS,
    ageDisplayCopy,
    lifeDeathNotifyCopy,
    lifePhaseCopy,
    lifeScriptCopy,
    lifespanBarCopy,
    type LifeScriptEvent,
} from '../assets/scripts/core/systems/LifeScriptCopy';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');

const ZH_TW_PATH = 'assets/resources/i18n/zh-TW.json';

function loadZhTw(): Record<string, string> {
    return JSON.parse(fs.readFileSync(ZH_TW_PATH, 'utf8')) as Record<string, string>;
}

/** 字串中最大的佔位符索引 + 1；沒有佔位符時為 0 */
function placeholderCount(template: string): number {
    const indices = [...template.matchAll(/\{(\d+)\}/g)].map((m) => Number(m[1]));
    return indices.length === 0 ? 0 : Math.max(...indices) + 1;
}

export function createLifeScriptCopySuite(): TestSuite {
    const suite = new TestSuite('LifeScriptCopy (壽命劇本文案 LIFE-13)');

    suite.test('所有劇本、階段與 UI 文案 Key 都存在於 zh-TW.json', () => {
        const zh = loadZhTw();
        const keys: string[] = [
            ...Object.values(LIFE_PHASE_KEYS),
            ...Object.values(LIFE_SCRIPT_KEYS),
            LIFE_DEATH_NOTIFY_KEY,
            LIFE_AGE_DISPLAY_KEY,
            LIFE_LIFESPAN_BAR_KEY,
        ];
        for (const key of keys) {
            assert.isTrue(typeof zh[key] === 'string' && zh[key].length > 0, `zh-TW 缺少 ${key}`);
        }
    });

    suite.test('佔位符個數與參數個數一致（劇本、死亡通知、壽命條）', () => {
        const zh = loadZhTw();
        for (const event of Object.keys(LIFE_SCRIPT_KEYS) as LifeScriptEvent[]) {
            const key = LIFE_SCRIPT_KEYS[event];
            assert.equals(LIFE_SCRIPT_ARG_COUNT[event], placeholderCount(zh[key]), `${key} 佔位符數量不符`);
        }
        assert.equals(2, placeholderCount(zh[LIFE_DEATH_NOTIFY_KEY]));
        assert.equals(2, placeholderCount(zh[LIFE_LIFESPAN_BAR_KEY]));
        assert.equals(2, placeholderCount(zh[LIFE_AGE_DISPLAY_KEY]));
    });

    suite.test('階段文案：每個階段對應一個 Key，不需要參數', () => {
        assert.equals('life.phase.youth', lifePhaseCopy('youth').key);
        assert.equals('life.phase.peak', lifePhaseCopy('peak').key);
        assert.equals(0, lifePhaseCopy('elder').args.length);
    });

    suite.test('非死亡劇本：參數只有武將名', () => {
        const copy = lifeScriptCopy('retire', '關羽');
        assert.equals('life.script.retire', copy.key);
        assert.equals(1, copy.args.length);
        assert.equals('關羽', copy.args[0]);
    });

    suite.test('死亡劇本：參數順序為武將名，再享年（整數）', () => {
        const copy = lifeScriptCopy('death', '呂布', 72.75);
        assert.equals('life.script.death', copy.key);
        assert.equals('呂布', copy.args[0]);
        assert.equals('72', copy.args[1]);
    });

    suite.test('死亡通知與年齡顯示：歲數無條件捨去', () => {
        const notify = lifeDeathNotifyCopy('曹操', 65.99);
        assert.equals(LIFE_DEATH_NOTIFY_KEY, notify.key);
        assert.equals('65', notify.args[1]);
        assert.equals('25', ageDisplayCopy('孫權', 25.25).args[1]);
    });

    suite.test('壽命條：年齡與壽命上限依序為第一、第二參數', () => {
        const bar = lifespanBarCopy(61.5, 72);
        assert.equals(LIFE_LIFESPAN_BAR_KEY, bar.key);
        assert.equals('61', bar.args[0]);
        assert.equals('72', bar.args[1]);
    });

    return suite;
}
