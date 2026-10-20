/**
 * VitalityStrings.test.ts — 精力劇本字串進語系表（VIT-09 / PROG-2-0728）headless 測試
 *
 * 鎖住：四個語系都有 ui.vit.script.* 四個 key；zh-TW 文案與資源循環系統.md 第 G 節一致。
 */
import { assert, TestSuite } from './TestRunner';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

const ROOT = path.resolve(__dirname, '..');
const readLocale = (lang: string): Record<string, string> =>
    JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/i18n', `${lang}.json`), 'utf8')) as Record<string, string>;
const VITALITY_SCRIPT_KEYS = [
    'ui.vit.script.exhausted',
    'ui.vit.script.pill_used',
    'ui.vit.script.pregnancy_lock',
    'ui.vit.script.hint_late_bloomer',
];

export function createVitalityStringsSuite(): TestSuite {
    const suite = new TestSuite('VitalityStrings (精力劇本字串進語系表 VIT-09)');

    suite.test('四個語系都有四個 ui.vit.script.* key', () => {
        for (const lang of ['zh-TW', 'zh-CN', 'en', 'ja']) {
            const locale = readLocale(lang);
            assert.isTrue(VITALITY_SCRIPT_KEYS.every((k) => typeof locale[k] === 'string' && locale[k].length > 0));
        }
    });

    suite.test('zh-TW 文案與資源循環系統.md 第 G 節一致', () => {
        const zh = readLocale('zh-TW');
        assert.equals('{0} 已精疲力竭，暫無法行動。', zh['ui.vit.script.exhausted']);
        assert.equals('{0} 服下補元散，精力恢復！', zh['ui.vit.script.pill_used']);
        assert.equals('{0} 正在待產中，精力回復暫停…', zh['ui.vit.script.pregnancy_lock']);
        assert.equals('{0} 雖然虛弱，但眼中似有異光…', zh['ui.vit.script.hint_late_bloomer']);
    });

    return suite;
}
