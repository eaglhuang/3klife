/**
 * TacticAvailabilityPresenter — 戰法可用狀態與原因（PROG-2-0408）的純邏輯測試
 */
import { TestSuite, assert } from './TestRunner';
import {
    buildTacticAvailability,
    TACTIC_REASON_NO_POINTS,
    TACTIC_REASON_NO_SP,
    TACTIC_REASON_WEATHER,
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

    return suite;
}
