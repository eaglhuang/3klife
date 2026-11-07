/**
 * LocaleFallback — 多語系回退鏈（doc_spec_0342 §4.2；PROG-2-2027）
 */
import { assert, TestSuite } from './TestRunner';
import { localeLookupOrder, resolveLocalizedString } from '../assets/scripts/core/systems/LocaleFallback';

const TABLES: Record<string, Record<string, string>> = {
    'zh-TW': { A: '白毦兵', B: '本營全場僅限調遣 1 隊' },
    'zh-CN': { A: '白毦兵', C: '出征粮耗' },
    en: { A: 'White Feather Guard', B: '' },
};
const tableOf = (l: string) => TABLES[l];

export function createLocaleFallbackSuite(): TestSuite {
    const suite = new TestSuite('LocaleFallback (多語系回退 doc_spec_0342 PROG-2-2027)');

    suite.test('查表順序：目標 → zh-TW → zh-CN，不重複', () => {
        assert.equals('ja,zh-TW,zh-CN', localeLookupOrder('ja').join(','));
        assert.equals('zh-CN,zh-TW', localeLookupOrder('zh-CN').join(','));
    });

    suite.test('§4.2 依序回退，最後回傳鍵名', () => {
        assert.equals('White Feather Guard', resolveLocalizedString('A', 'en', tableOf));
        assert.equals('本營全場僅限調遣 1 隊', resolveLocalizedString('B', 'en', tableOf));
        assert.equals('出征粮耗', resolveLocalizedString('C', 'ja', tableOf));
        assert.equals('UI_TROOP_NAME_X', resolveLocalizedString('UI_TROOP_NAME_X', 'en', tableOf));
        assert.equals('K', resolveLocalizedString('K', 'en', () => undefined));
    });

    return suite;
}
