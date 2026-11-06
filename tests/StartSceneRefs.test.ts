/**
 * check-start-scene-refs.js 的純邏輯（HOT-09；PROG-2-1924）
 */
import { assert, TestSuite } from './TestRunner';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const tool = require('../tools_node/check-start-scene-refs.js') as {
    collectSceneUuids: (text: string) => string[];
    findViolations: (refs: Array<{ uuid: string; path: string }>, forbidden: string[]) => Array<{ uuid: string; path: string; rule: string }>;
};

export function createStartSceneRefsSuite(): TestSuite {
    const suite = new TestSuite('StartSceneRefs (啟動場景靜態參照審計 HOT-09 PROG-2-1924)');

    suite.test('收集 uuid：去掉子資源後綴並去重', () => {
        const text = '[{"a":{"__uuid__":"aaa@f9941"}},{"b":{"__uuid__": "aaa"}},{"c":{"__uuid__":"bbb"}}]';
        assert.equals('aaa,bbb', tool.collectSceneUuids(text).join(','));
    });

    suite.test('命中禁止清單即違規；其他資源放行', () => {
        const v = tool.findViolations([
            { uuid: '1', path: 'assets/resources/sprites/battle/hp.png' },
            { uuid: '2', path: 'assets/resources/sprites/ui/logo.png' },
        ], ['/sprites/battle/']);
        assert.equals(1, v.length);
        assert.equals('1', v[0].uuid);
        assert.equals('/sprites/battle/', v[0].rule);
    });

    return suite;
}
