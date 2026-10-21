/**
 * SoulInjectStrings.test.ts — 寄宿戰魂的語系字串與 UI 接線（PROG-2-1070）headless 測試
 *
 * 鎖住：失敗原因碼都有語系 key，四種語系檔都有對應字串；人物頁有總 TP 標籤且寄宿後會重讀名冊。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { SOUL_INJECT_REASON_I18N_KEY } from '../assets/scripts/core/systems/SoulInjectCandidates';

const ROOT = path.resolve(__dirname, '..');
const LANGS = ['zh-TW', 'zh-CN', 'en', 'ja'];
const EXTRA_KEYS = ['ui.general.soul_inject.failed', 'ui.general.soul_inject.total_tp'];

function bundleOf(lang: string): Record<string, string> {
    return JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/i18n', `${lang}.json`), 'utf8')) as Record<string, string>;
}

export function createSoulInjectStringsSuite(): TestSuite {
    const suite = new TestSuite('SoulInjectStrings (寄宿戰魂語系與接線 PROG-2-1070)');

    suite.test('失敗原因碼都對應到語系 key，且四種語系都有字串', () => {
        const keys = new Set<string>([...Object.values(SOUL_INJECT_REASON_I18N_KEY), ...EXTRA_KEYS]);
        for (const lang of LANGS) {
            const bundle = bundleOf(lang);
            for (const key of keys) {
                assert.isTrue(typeof bundle[key] === 'string' && bundle[key].length > 0, `${lang} 缺少 ${key}`);
            }
        }
    });

    suite.test('失敗提示含 {0} 佔位，且原因字串不是英文原因碼', () => {
        for (const lang of LANGS) {
            assert.isTrue(bundleOf(lang)['ui.general.soul_inject.failed'].includes('{0}'), `${lang} 缺少 {0}`);
        }
        for (const reason of Object.keys(SOUL_INJECT_REASON_I18N_KEY)) {
            const text = bundleOf('zh-TW')[SOUL_INJECT_REASON_I18N_KEY[reason as keyof typeof SOUL_INJECT_REASON_I18N_KEY]];
            assert.isFalse(text.includes(reason), `${reason} 的字串仍含原因碼`);
        }
    });

    suite.test('人物頁總 TP 標籤存在；寄宿後 LobbyScene 重讀名冊並刷新標籤', () => {
        const layout = fs.readFileSync(path.join(ROOT, 'assets/resources/ui-spec/fragments/layouts/character-ds3-overview-content.json'), 'utf8');
        assert.isTrue(layout.includes('"id": "totalTpLabel"'));
        const lobby = fs.readFileSync(path.join(ROOT, 'assets/scripts/ui/scenes/LobbyScene.ts'), 'utf8');
        assert.isTrue(lobby.includes("getLabel('totalTpLabel')"));
        assert.isTrue(lobby.includes('services().session.roster.find((g) => g.id === general.id)'));
    });

    return suite;
}
