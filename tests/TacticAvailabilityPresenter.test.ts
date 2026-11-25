/**
 * TacticAvailabilityPresenter — 戰法可用狀態與原因（PROG-2-0408）的純邏輯測試
 */
import * as fs from 'fs';
import * as path from 'path';
import { TestSuite, assert } from './TestRunner';
import { allFriendliesFullHp, castFailedToastKey } from '../assets/scripts/battle/views/BattleSkillTargetingFlow';
import { Faction } from '../assets/scripts/core/config/Constants';
import {
    buildTacticAvailability,
    TACTIC_REASON_NO_POINTS,
    TACTIC_REASON_NO_SP,
    TACTIC_REASON_WEATHER,
    tacticReasonText,
} from '../assets/scripts/ui/core/TacticAvailabilityPresenter';
import { Weather } from '../assets/scripts/core/config/Constants';

const FIRE = { id: 'zhou-yu-inferno', label: '赤壁焚風', tags: ['fire'] };
const PLAIN = { id: 'zhuge-liang-storm', label: '臥龍', tags: [] as string[] };
const READY = { weather: Weather.Clear, tacticPointEnabled: true, generalCanUseSkill: true };

export function createTacticAvailabilityPresenterSuite(): TestSuite {
    const suite = new TestSuite('TacticAvailabilityPresenter (戰法可用狀態 PROG-2-0408)');

    suite.test('晴天且計謀點與 SP 足夠時，每個戰法都可用', () => {
        const out = buildTacticAvailability([FIRE, PLAIN], READY);
        assert.equals(2, out.length);
        assert.equals(true, out.every((item) => item.enabled && item.reason === null));
        assert.equals('赤壁焚風', out[0].label);
    });

    suite.test('火計在雨天不可用，原因是天氣禁用；非火計照常可用', () => {
        const out = buildTacticAvailability([FIRE, PLAIN], { ...READY, weather: Weather.Rain });
        assert.equals(false, out[0].enabled);
        assert.equals(TACTIC_REASON_WEATHER, out[0].reason ?? '');
        assert.equals(true, out[1].enabled);
    });

    suite.test('原因優先序：計謀點 → SP → 天氣，與施放流程一致', () => {
        const noPoints = buildTacticAvailability([FIRE], { ...READY, tacticPointEnabled: false, weather: Weather.Rain });
        assert.equals(TACTIC_REASON_NO_POINTS, noPoints[0].reason ?? '');
        const noSp = buildTacticAvailability([FIRE], { ...READY, generalCanUseSkill: false, weather: Weather.Rain });
        assert.equals(TACTIC_REASON_NO_SP, noSp[0].reason ?? '');
    });

    suite.test('沒有戰法時回傳空陣列', () => {
        assert.equals(0, buildTacticAvailability([], READY).length);
    });

    suite.test('三種灰色提示走 i18n 鍵：reason 是翻譯結果、reasonKey 是鍵（PROG-2-10015）', () => {
        const noPoints = buildTacticAvailability([FIRE], { ...READY, tacticPointEnabled: false })[0];
        assert.equals('ui.battle.skill.reason.no_points', noPoints.reasonKey ?? '');
        assert.equals(tacticReasonText(TACTIC_REASON_NO_POINTS), noPoints.reason ?? '');
        const noSp = buildTacticAvailability([FIRE], { ...READY, generalCanUseSkill: false })[0];
        assert.equals(TACTIC_REASON_NO_SP, noSp.reasonKey ?? '');
        assert.equals(tacticReasonText(TACTIC_REASON_NO_SP), noSp.reason ?? '');
        const weather = buildTacticAvailability([FIRE], { ...READY, weather: Weather.Rain })[0];
        assert.equals(TACTIC_REASON_WEATHER, weather.reasonKey ?? '');
        assert.equals(tacticReasonText(TACTIC_REASON_WEATHER), weather.reason ?? '');
    });

    suite.test('四語 i18n 鍵齊全：三個灰色提示與沒人要補血', () => {
        const keys = [TACTIC_REASON_NO_POINTS, TACTIC_REASON_NO_SP, TACTIC_REASON_WEATHER, 'ui.battle.skill.cast_failed_no_wounded'];
        for (const locale of ['zh-TW', 'zh-CN', 'en', 'ja']) {
            const file = path.join(__dirname, '..', 'assets', 'resources', 'i18n', `${locale}.json`);
            const table = JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, string>;
            for (const key of keys) assert.isTrue(typeof table[key] === 'string' && table[key].length > 0, `${locale} 缺 ${key}`);
        }
    });

    suite.test('Presenter 原始碼不再寫死三句中文', () => {
        const src = fs.readFileSync(path.join(__dirname, '..', 'assets', 'scripts', 'ui', 'core', 'TacticAvailabilityPresenter.ts'), 'utf8');
        for (const text of ['計謀點不足', 'SP 不足', '天氣禁用']) assert.isFalse(src.replace(/\/\/.*$/gm, '').includes(text), text);
    });

    suite.test('補血招式：我方全員滿血改提示沒有需要補血的部隊，有人受傷才用原句', () => {
        const unit = (faction: Faction, hp: number, max: number, dead = false) =>
            ({ faction, isDead: () => dead, currentHp: hp, getEffectiveMaxHp: () => max });
        assert.isTrue(allFriendliesFullHp([unit(Faction.Player, 100, 100), unit(Faction.Enemy, 10, 100)]));
        assert.isTrue(allFriendliesFullHp([unit(Faction.Player, 0, 100, true)]), '陣亡的不算受傷');
        assert.isFalse(allFriendliesFullHp([unit(Faction.Player, 99, 100)]));
        assert.equals('ui.battle.skill.cast_failed_no_wounded', castFailedToastKey(true, true));
        assert.equals('ui.battle.skill.cast_failed', castFailedToastKey(true, false));
        assert.equals('ui.battle.skill.cast_failed_no_enemy', castFailedToastKey(false));
    });

    return suite;
}
