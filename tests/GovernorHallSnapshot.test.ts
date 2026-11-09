/**
 * GovernorHallSnapshot — 太守府接玩家實際儲備（TSK-11）的 headless 測試
 *
 * 鎖住：兵源與糧草是實際值、沒有資料來源的欄位顯示「—」而不是 0。
 */
import { assert, TestSuite } from './TestRunner';
import { buildGovernorHallView, buildGovernorSnapshot } from '../assets/scripts/core/systems/GovernorHallView';
import { FOOD_PER_SEASON, STARTER_MILITARY } from '../assets/scripts/core/systems/MilitaryReserve';
import { seasonModifiersOf } from '../assets/scripts/core/systems/SeasonModifiers';
import { GameSession } from '../assets/scripts/core/managers/GameSession';

const MILITARY = { ...STARTER_MILITARY, cityTroops: 1200, cityTroopsCap: 8000, recruitRegen: 300 };

export function createGovernorHallSnapshotSuite(): TestSuite {
    const suite = new TestSuite('GovernorHallSnapshot');

    suite.test('兵源卡顯示實際儲備', () => {
        const card = buildGovernorHallView(buildGovernorSnapshot(MILITARY)).cityTroopCard;
        assert.equals('目前兵源 1200 / 8000', card.stockText);
        assert.equals('每回合補兵 +300', card.recruitText);
        assert.equals('距離回滿 23 回合', card.recoverText);
    });

    suite.test('糧草基礎值含季節倍率', () => {
        assert.equals(FOOD_PER_SEASON, buildGovernorSnapshot(MILITARY).food.base);
        assert.equals(Math.floor(FOOD_PER_SEASON * 1.5), buildGovernorSnapshot(MILITARY, 1.5).food.base);
    });

    suite.test('人口、民心、金錢沒有來源時顯示「—」，不顯示 0', () => {
        const view = buildGovernorHallView(buildGovernorSnapshot(MILITARY));
        assert.equals('人口 —', view.populationText);
        assert.equals('民心 —', view.moraleText);
        assert.equals('總計 —', view.goldCard.totalText);
        assert.equals('—', view.flows.find((flow) => flow.key === 'gold')!.valueText);
    });

    suite.test('GameSession 快照與目前儲備、目前季節一致', () => {
        const session = new GameSession();
        const snapshot = session.governorSnapshot();
        assert.equals(session.military.cityTroops, snapshot.cityTroops.current);
        assert.equals(session.military.cityTroopsCap, snapshot.cityTroops.cap);
        const multiplier = seasonModifiersOf(session.gameTime.currentSeason).foodMultiplier;
        assert.equals(Math.floor(FOOD_PER_SEASON * multiplier), snapshot.food.base);
    });

    return suite;
}
