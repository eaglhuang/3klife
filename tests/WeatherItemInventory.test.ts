/**
 * WeatherItemInventory — 天氣道具庫存扣除（PROG-2-0932 / APT-15）
 *
 * 用真實 BattleController 跑完整回合：庫存為 0 不生效；成功才扣 1；同場重複使用不扣；
 * 道具生效 3 回合後回到排程，庫存不會因為回合推進而變動。
 *
 * Unity 對照：像背包 UseItem 在 Play Mode 跑幾個 Turn，檢查數量與場景天氣是否同步變化。
 */
import { Faction, Weather } from '../assets/scripts/core/config/Constants';
import { BattleController } from '../assets/scripts/battle/controllers/BattleController';
import { useWeatherItemFromInventory, weatherItemStock, WEATHER_ITEM_INVENTORY_ID } from '../assets/scripts/battle/controllers/WeatherItemUseFlow';
import { ITEM_DISPLAY_NAMES, ITEM_WEATHER_RAIN, ITEM_WEATHER_WIND, type PlayerInventory } from '../assets/scripts/core/systems/PlayerInventory';
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

function battleWithClearSchedule(): BattleController {
    services().initialize();
    const ctrl = new BattleController();
    ctrl.initBattle(general('p', Faction.Player), general('e', Faction.Enemy));
    ctrl.setWeatherSchedule([{ turnStart: 1, turnEnd: 10, weather: Weather.Clear }]);
    return ctrl;
}

export function createWeatherItemInventorySuite(): TestSuite {
    const suite = new TestSuite('WeatherItemInventory (天氣道具庫存 APT-15 / PROG-2-0932)');

    suite.test('道具 id 與顯示名稱齊全：祈風令、祈雨符各自對應庫存 id', () => {
        assert.equals(ITEM_WEATHER_WIND, WEATHER_ITEM_INVENTORY_ID['wind-prayer']);
        assert.equals(ITEM_WEATHER_RAIN, WEATHER_ITEM_INVENTORY_ID['rain-charm']);
        assert.equals('祈風令', ITEM_DISPLAY_NAMES[ITEM_WEATHER_WIND]);
        assert.equals('祈雨符', ITEM_DISPLAY_NAMES[ITEM_WEATHER_RAIN]);
    });

    suite.test('庫存為 0：不改天氣、不扣庫存（NO_STOCK）', () => {
        const ctrl = battleWithClearSchedule();
        const inventory: PlayerInventory = {};
        const result = useWeatherItemFromInventory(ctrl, inventory, 'wind-prayer');
        assert.isFalse(result.ok);
        assert.equals('NO_STOCK', result.ok ? '' : result.reason);
        assert.equals(Weather.Clear, ctrl.state.weather);
        assert.equals(0, weatherItemStock(result.inventory, 'wind-prayer'));
    });

    suite.test('真實多回合：有庫存時使用成功扣 1，生效 3 回合後回到排程，庫存不隨回合變動', () => {
        const ctrl = battleWithClearSchedule();
        const start: PlayerInventory = { [ITEM_WEATHER_WIND]: 2 };

        const first = useWeatherItemFromInventory(ctrl, start, 'wind-prayer');
        assert.isTrue(first.ok);
        assert.equals(1, weatherItemStock(first.inventory, 'wind-prayer'));
        assert.equals(Weather.Windy, ctrl.state.weather);

        fullTurn(ctrl);
        fullTurn(ctrl);
        assert.equals(Weather.Windy, ctrl.state.weather, '第 3 回合仍在道具期間');
        assert.equals(1, weatherItemStock(first.inventory, 'wind-prayer'));

        fullTurn(ctrl);
        assert.equals(Weather.Clear, ctrl.state.weather, '第 4 回合回到排程');
    });

    suite.test('同場重複使用同一種道具：第二次被擋（ALREADY_USED），庫存不再扣', () => {
        const ctrl = battleWithClearSchedule();
        const first = useWeatherItemFromInventory(ctrl, { [ITEM_WEATHER_RAIN]: 3 }, 'rain-charm');
        fullTurn(ctrl);
        const second = useWeatherItemFromInventory(ctrl, first.inventory, 'rain-charm');
        assert.isFalse(second.ok);
        assert.equals('ALREADY_USED', second.ok ? '' : second.reason);
        assert.equals(2, weatherItemStock(second.inventory, 'rain-charm'));
    });

    suite.test('不同道具各扣各的：祈風令與祈雨符分別扣 1，互不影響', () => {
        const ctrl = battleWithClearSchedule();
        const a = useWeatherItemFromInventory(ctrl, { [ITEM_WEATHER_WIND]: 1, [ITEM_WEATHER_RAIN]: 1 }, 'wind-prayer');
        fullTurn(ctrl);
        const b = useWeatherItemFromInventory(ctrl, a.inventory, 'rain-charm');
        assert.isTrue(b.ok);
        assert.equals(0, weatherItemStock(b.inventory, 'wind-prayer'));
        assert.equals(0, weatherItemStock(b.inventory, 'rain-charm'));
        assert.equals(Weather.Rain, ctrl.state.weather);
    });

    return suite;
}
