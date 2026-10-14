/**
 * BattleWeatherTurn — 戰場天氣依回合排程切換（PROG-2-0401）的 headless 測試
 */
import { TestSuite, assert } from './TestRunner';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { EVENT_NAMES, Faction, Weather } from '../assets/scripts/core/config/Constants';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import type { WeatherScheduleEntry } from '../assets/scripts/core/systems/WeatherSchedule';

const SCHEDULE: WeatherScheduleEntry[] = [
    { turnStart: 1, turnEnd: 2, weather: Weather.Rain },
    { turnStart: 3, turnEnd: 3, weather: Weather.Rain },
    { turnStart: 4, turnEnd: 5, weather: Weather.Thunder },
];

type WeatherHooks = { applyWeatherForTurn(turn: number): void };

function setup(): BattleController {
    services().initialize();
    const ctrl = new BattleController();
    const pg = new GeneralUnit({ id: 'guan-yu', name: 'guan-yu', faction: Faction.Player, hp: 1000, maxSp: 100, initialSp: 100, str: 100, int: 90, lea: 90, skillId: 'guan-yu-slash', battlePrimarySkillId: 'guan-yu-slash' });
    const eg = new GeneralUnit({ id: 'lu-bu', name: 'lu-bu', faction: Faction.Enemy, hp: 1000, maxSp: 100, initialSp: 100, str: 100, int: 90, lea: 90, skillId: 'lu-bu-rampage', battlePrimarySkillId: 'lu-bu-rampage' });
    ctrl.initBattle(pg, eg, undefined, Weather.Clear);
    return ctrl;
}

function collectWeatherEvents(): { events: Array<{ turn: number; previous: Weather; current: Weather }>; off: () => void } {
    const events: Array<{ turn: number; previous: Weather; current: Weather }> = [];
    const off = services().event.on(EVENT_NAMES.WeatherChanged, (data?: { turn: number; previous: Weather; current: Weather }) => {
        if (data) events.push(data);
    });
    return { events, off };
}

export function createBattleWeatherTurnSuite(): TestSuite {
    const suite = new TestSuite('BattleWeatherTurn (戰場天氣回合切換 PROG-2-0401)');

    suite.test('setWeatherSchedule 會立即套用第 1 回合天氣，並寫入排程', () => {
        const ctrl = setup();
        ctrl.setWeatherSchedule(SCHEDULE);
        assert.equals(Weather.Rain, (ctrl as unknown as { state: { weather: Weather } }).state.weather);
    });

    suite.test('沒有排程時 applyWeatherForTurn 不改動天氣，也不發事件', () => {
        const ctrl = setup();
        const { events, off } = collectWeatherEvents();
        (ctrl as unknown as WeatherHooks).applyWeatherForTurn(5);
        off?.();
        assert.equals(0, events.length, '沒有排程不應發事件');
        assert.equals(Weather.Clear, (ctrl as unknown as { state: { weather: Weather } }).state.weather);
    });

    suite.test('天氣改變時只發一次 WeatherChanged，內容含回合與前後天氣', () => {
        const ctrl = setup();
        ctrl.setWeatherSchedule(SCHEDULE);
        const { events, off } = collectWeatherEvents();
        (ctrl as unknown as WeatherHooks).applyWeatherForTurn(2);
        (ctrl as unknown as WeatherHooks).applyWeatherForTurn(3);
        (ctrl as unknown as WeatherHooks).applyWeatherForTurn(4);
        off?.();
        assert.equals(1, events.length, '只有 3→4 回合天氣改變');
        assert.equals(4, events[0].turn);
        assert.equals(Weather.Rain, events[0].previous);
        assert.equals(Weather.Thunder, events[0].current);
        assert.equals(Weather.Thunder, (ctrl as unknown as { state: { weather: Weather } }).state.weather);
    });

    suite.test('排程沒涵蓋的回合回到預設晴天，並發出切換事件', () => {
        const ctrl = setup();
        ctrl.setWeatherSchedule(SCHEDULE);
        const { events, off } = collectWeatherEvents();
        (ctrl as unknown as WeatherHooks).applyWeatherForTurn(6);
        off?.();
        assert.equals(1, events.length);
        assert.equals(Weather.Clear, events[0].current);
        assert.equals(Weather.Clear, (ctrl as unknown as { state: { weather: Weather } }).state.weather);
    });

    suite.test('回合推進（finalizeRuntimeTurnCycle）會依新回合更新天氣', () => {
        const ctrl = setup();
        ctrl.setWeatherSchedule(SCHEDULE);
        const state = (ctrl as unknown as { state: { weather: Weather } }).state;
        const turnBefore = services().battle.getSnapshot().turn;
        // 連續推進到第 4 回合（Thunder）；每次 finalize 都會 nextTurn 並切換天氣
        let guard = 0;
        while (services().battle.getSnapshot().turn < 4 && guard++ < 10) {
            (ctrl as unknown as { finalizeRuntimeTurnCycle(): void }).finalizeRuntimeTurnCycle();
        }
        assert.equals(4, services().battle.getSnapshot().turn, `回合應從 ${turnBefore} 推進到 4`);
        assert.equals(Weather.Thunder, state.weather);
    });

    return suite;
}
