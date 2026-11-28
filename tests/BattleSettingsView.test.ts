/**
 * BattleSettingsView — 戰場設定面板純邏輯（PROG-2-1890）
 *
 * 覆蓋：音訊偏好讀取與防呆、開關文字、撤退兩段式確認與慢速確認。
 *
 * Unity 對照：像測 OptionsMenu ViewModel，不需要場景或 UI。
 */
import { assert, TestSuite } from './TestRunner';
import {
    audioToggleText, hitStopToggleKey, parseAudioPrefs, retreatButtonText, retreatClick, toggleHitStopPref,
} from '../assets/scripts/core/systems/BattleSettingsView';
import { DEFAULT_JUICE_PREFS } from '../assets/scripts/battle/shared/BattleJuice';
import * as fs from 'fs';
import * as path from 'path';

export function createBattleSettingsViewSuite(): TestSuite {
    const suite = new TestSuite('BattleSettingsView (戰場設定面板 PROG-2-1890)');

    suite.test('音訊偏好：沒有存檔或格式錯誤時全部開啟', () => {
        assert.equals(false, parseAudioPrefs(null).bgmMuted);
        assert.equals(false, parseAudioPrefs('not json').sfxMuted);
        const p = parseAudioPrefs('{"bgmMuted":true}');
        assert.equals(true, p.bgmMuted);
        assert.equals(false, p.sfxMuted);
    });

    suite.test('開關文字依靜音狀態顯示開或關', () => {
        assert.equals('音樂：開', audioToggleText('bgm', false));
        assert.equals('音效：關', audioToggleText('sfx', true));
    });

    suite.test('撤退：第一次只待確認，第二次才生效', () => {
        const first = retreatClick(null, 1000);
        assert.equals(false, first.confirmed);
        assert.equals(1000, first.armedAt);
        const second = retreatClick(first.armedAt, 4000);
        assert.equals(true, second.confirmed);
        assert.equals(null, second.armedAt);
        assert.equals(true, retreatButtonText(true) !== retreatButtonText(false));
    });

    suite.test('撤退：慢速點擊不會被隱藏期限吞掉', () => {
        const late = retreatClick(1000, 61000);
        assert.equals(true, late.confirmed);
        assert.equals(null, late.armedAt);
    });

    suite.test('命中頓格開關（PROG-2-10266）：預設開、切換只動頓格、鍵名對應開關狀態', () => {
        assert.equals(true, DEFAULT_JUICE_PREFS.hitStop);
        const off = toggleHitStopPref({ hitStop: true, cameraShake: true });
        assert.equals(false, off.hitStop);
        assert.equals(true, off.cameraShake);
        assert.equals(true, toggleHitStopPref(off).hitStop);
        assert.equals('battle.settings.hitstop.on', hitStopToggleKey(true));
        assert.equals('battle.settings.hitstop.off', hitStopToggleKey(false));
    });

    suite.test('命中頓格開關：四語系鍵齊備、面板版面有 BtnHitStop', () => {
        const root = path.join(__dirname, '..');
        for (const lang of ['zh-TW', 'zh-CN', 'en', 'ja']) {
            const j = JSON.parse(fs.readFileSync(path.join(root, `assets/resources/i18n/${lang}.json`), 'utf8')) as Record<string, string>;
            for (const k of ['battle.settings.hitstop.on', 'battle.settings.hitstop.off']) assert.isTrue(typeof j[k] === 'string' && j[k].length > 0, `${lang} 缺 ${k}`);
        }
        assert.isTrue(fs.readFileSync(path.join(root, 'assets/resources/ui-spec/layouts/battle-settings-main.json'), 'utf8').includes('BtnHitStop'));
    });

    return suite;
}
