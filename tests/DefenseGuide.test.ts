// @spec-source → PROG-2-10019 年終守城玩家引導（進場提示、部署橫幅、未部署閘門）
import * as fs from 'fs';
import { TestSuite, assert } from './TestRunner';
import { DEFENSE_GUIDE_TEXT_FALLBACK_ZH_TW, defenseBannerKey, fallbackDefenseGuideText, isDefenseDeployBlocked, withDefenseGuideFallback } from '../assets/scripts/core/systems/DefenseGuide';

export function createDefenseGuideSuite(): TestSuite {
    const suite = new TestSuite('DefenseGuide');
    const langs = ['zh-TW', 'zh-CN', 'en', 'ja'];

    suite.test('四語鍵齊全且非空，entry 帶 {0} 回合數參數', () => {
        for (const lang of langs) {
            const table = JSON.parse(fs.readFileSync(`assets/resources/i18n/${lang}.json`, 'utf8')) as Record<string, string>;
            for (const key of Object.keys(DEFENSE_GUIDE_TEXT_FALLBACK_ZH_TW)) assert.isTrue((table[key] ?? '').length > 0, `${lang}:${key}`);
            assert.isTrue(table['ui.battle.defense.entry'].includes('{0}'), `${lang} entry 缺 {0}`);
        }
    });

    suite.test('zh-TW 語系表與程式內預設一致', () => {
        const table = JSON.parse(fs.readFileSync('assets/resources/i18n/zh-TW.json', 'utf8')) as Record<string, string>;
        for (const key of Object.keys(DEFENSE_GUIDE_TEXT_FALLBACK_ZH_TW)) assert.equals(DEFENSE_GUIDE_TEXT_FALLBACK_ZH_TW[key], table[key], key);
    });

    suite.test('文字：位置參數代入；語系缺 key 退回預設', () => {
        assert.isTrue(fallbackDefenseGuideText('ui.battle.defense.entry', '12').includes('12 回合'));
        assert.equals('x', withDefenseGuideFallback(() => 'x')('ui.battle.defense.entry'));
        assert.isTrue(withDefenseGuideFallback(k => k)('ui.battle.defense.banner_deploy').includes('結束回合'));
    });

    suite.test('橫幅：未部署顯示部署說明，部署後顯示開戰說明', () => {
        assert.equals('ui.battle.defense.banner_deploy', defenseBannerKey(0));
        assert.equals('ui.battle.defense.banner_ready', defenseBannerKey(2));
    });

    suite.test('閘門：守城且未部署才擋；已部署或非守城不擋', () => {
        assert.isTrue(isDefenseDeployBlocked(true, 0));
        assert.isFalse(isDefenseDeployBlocked(true, 1));
        assert.isFalse(isDefenseDeployBlocked(false, 0));
    });

    suite.test('接線：結束回合與自動代打都過閘門，BattleScene 進場掛提示與橫幅', () => {
        const turn = fs.readFileSync('assets/scripts/battle/views/TurnFlowManager.ts', 'utf8');
        const bridge = fs.readFileSync('assets/scripts/battle/views/BattleUIBridge.ts', 'utf8');
        const scene = fs.readFileSync('assets/scripts/battle/views/BattleScene.ts', 'utf8');
        assert.isTrue(turn.includes("blockIfDefenseUndeployed?.('end_turn')"));
        assert.isTrue(bridge.includes("blockIfDefenseUndeployed('auto')"));
        assert.isTrue(scene.includes('new DefenseDeployGuide(') && scene.includes("'ui.battle.defense.entry'"));
    });

    return suite;
}
