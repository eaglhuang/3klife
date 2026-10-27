/**
 * WeatherItemBattleFlow — 天氣道具接進戰場多回合流程（PROG-2-0930 / APT-15）
 *
 * 以真實的 BattleController 跑完整回合（玩家、敵方、收尾），不用 spy。
 * 驗證：道具立即改變天氣、覆寫排程、生效 3 回合後回到排程、同一種道具只能用一次。
 *
 * Unity 對照：像在 Play Mode 連續跑幾個 Turn，每回合檢查場景的 Weather 欄位是否照時間表走。
 */
import { Faction, Weather } from '../assets/scripts/core/config/Constants';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { GeneralUnit } from '../assets/scripts/core/models/GeneralUnit';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { TestSuite, assert } from './TestRunner';

function general(id: string, faction: Faction): GeneralUnit {
    return new GeneralUnit({
        id, name: id, faction, hp: 1000, maxSp: 100, initialSp: 0, str: 90, int: 60, lea: 80,
        skillId: 'cao-cao-tactics', battlePrimarySkillId: 'cao-cao-tactics',
    });
}

function fullTurn(ctrl: BattleController): void {
    ctrl.resolvePlayerTurn();
    ctrl.resolveEnemyTurn();
    ctrl.finalizeEnemyTurn();
}

function turnNow(): number {
    return services().battle.getSnapshot().turn;
}

export function createWeatherItemBattleFlowSuite(): TestSuite {
    const suite = new TestSuite('WeatherItemBattleFlow (天氣道具多回合流程 APT-15 / PROG-2-0930)');

    suite.test('祈風令覆寫排程 3 回合，第 4 回合回到排程天氣（真實多回合）', () => {
        services().initialize();
        const ctrl = new BattleController();
        ctrl.initBattle(general('p', Faction.Player), general('e', Faction.Enemy));
        ctrl.setWeatherSchedule([{ turnStart: 1, turnEnd: 10, weather: Weather.Clear }]);

        const used = ctrl.useWeatherItem('wind-prayer');
        assert.isTrue(used.ok, '第一次使用應成功');
        assert.equals(Weather.Windy, ctrl.state.weather);

        fullTurn(ctrl);
        assert.equals(2, turnNow());
        assert.equals(Weather.Windy, ctrl.state.weather, '第 2 回合仍在道具期間');

        fullTurn(ctrl);
        assert.equals(3, turnNow());
        assert.equals(Weather.Windy, ctrl.state.weather, '第 3 回合仍在道具期間');

        fullTurn(ctrl);
        assert.equals(4, turnNow());
        assert.equals(Weather.Clear, ctrl.state.weather, '第 4 回合應回到排程天氣');
    });

    suite.test('同一種道具每場只能用一次：重複使用不改變天氣', () => {
        services().initialize();
        const ctrl = new BattleController();
        ctrl.initBattle(general('p', Faction.Player), general('e', Faction.Enemy));
        ctrl.setWeatherSchedule([{ turnStart: 1, turnEnd: 10, weather: Weather.Clear }]);

        ctrl.useWeatherItem('rain-charm');
        fullTurn(ctrl);
        const second = ctrl.useWeatherItem('rain-charm');
        assert.isFalse(second.ok);
        assert.equals('ALREADY_USED', second.reason);
        assert.equals(Weather.Rain, ctrl.state.weather, '第 2 回合仍是第一次使用的雨天，重複使用不生效');
    });

    suite.test('不同道具可各用一次：第二個道具從使用當回合起重新計 3 回合（真實多回合）', () => {
        services().initialize();
        const ctrl = new BattleController();
        ctrl.initBattle(general('p', Faction.Player), general('e', Faction.Enemy));
        ctrl.setWeatherSchedule([{ turnStart: 1, turnEnd: 10, weather: Weather.Clear }]);

        ctrl.useWeatherItem('wind-prayer');
        fullTurn(ctrl);
        const rain = ctrl.useWeatherItem('rain-charm');
        assert.isTrue(rain.ok, '不同道具應可使用');
        assert.equals(Weather.Rain, ctrl.state.weather);

        fullTurn(ctrl); // 第 3 回合
        assert.equals(Weather.Rain, ctrl.state.weather);
        fullTurn(ctrl); // 第 4 回合
        assert.equals(Weather.Rain, ctrl.state.weather);
        fullTurn(ctrl); // 第 5 回合：雨天道具期間（2~4）已結束
        assert.equals(5, turnNow());
        assert.equals(Weather.Clear, ctrl.state.weather);
    });

    return suite;
}
