/**
 * CityEconomy — 太守府經濟公式（人口紅利、人口成長、民心）與 GameSession 接線（PROG-2-9138）
 */
import { assert, TestSuite } from './TestRunner';
import { readFileSync } from 'fs';
import { join } from 'path';
import { GameSession, InMemoryRosterStore, type HallMissionWallet } from '../assets/scripts/core/managers/GameSession';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { PlayerSaveService, type PlayerSaveSnapshot } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import {
    advancePopulation, applyPopulationRout, clampMorale, commerceGoldBase, normalizeCityEconomy,
    populationBonusAmount, populationBonusRate, populationCapOf, populationGrowthRate,
} from '../assets/scripts/core/systems/CityEconomy';
import { buildGovernorHallView } from '../assets/scripts/core/systems/GovernorHallView';
import { realBundle } from './mission/missionTestKit';
import { seasonModifiersOf } from '../assets/scripts/core/systems/SeasonModifiers';
import { FOOD_PER_SEASON } from '../assets/scripts/core/systems/MilitaryReserve';

const readData = (name: string): unknown => JSON.parse(readFileSync(join(__dirname, '..', 'assets/resources/data', name), 'utf8'));

function general(id: string, cha = 50): GeneralConfig {
    return { id, name: id, faction: 'shu', gender: '男', age: 30, hp: 1000, vitality: 100, maxVitality: 100, str: 50, int: 50, lea: 50, pol: 50, cha, luk: 50 } as unknown as GeneralConfig;
}

function wallet(): HallMissionWallet & { amount: () => number } {
    let gold = 0;
    return { gold: () => gold, spend: (n: number) => { gold -= n; return true; }, grant: (n: number) => { gold += n; }, amount: () => gold };
}

function newSession(adapter = new MemoryStorageAdapter()): GameSession {
    services().initialize();
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore([]));
    session.setSaveService(new PlayerSaveService(adapter));
    session.setAutoSave(false);
    session.setLifecycle({
        settleSeason: async (r: GeneralConfig[]) => ({ roster: r, settlement: { spiritCards: [] } }),
        retireGeneral: async () => { throw new Error('not used'); },
    } as never);
    session.startNewGame(7);
    session.addGenerals([general('zhang', 50)]);
    return session;
}

export function createCityEconomySuite(): TestSuite {
    const suite = new TestSuite('CityEconomy (太守府經濟公式 PROG-2-9138)');

    suite.test('人口紅利率：人口 ÷ 400000 × (0.7 + 民心 ÷ 200)，上限 30%', () => {
        assert.isTrue(Math.abs(populationBonusRate(80000, 60) - 0.2) < 1e-9);
        assert.equals(0.3, populationBonusRate(400000, 100));
        assert.equals(0, populationBonusRate(0, 60));
        assert.equals(40, populationBonusAmount(200, 80000, 60));
        assert.equals(0, populationBonusAmount(0, 80000, 60));
    });

    suite.test('人口成長率 (民心−40)÷2000；民心低於 40 流失；成長不超過上限，流失不低於 0', () => {
        assert.equals(0.01, populationGrowthRate(60));
        assert.equals(-0.005, populationGrowthRate(30));
        assert.equals(80800, advancePopulation(80000, 60, 100000));
        assert.equals(100000, advancePopulation(99900, 100, 100000), '成長夾在上限');
        assert.equals(110000, advancePopulation(110000, 60, 100000), '已超過上限不被砍回');
        assert.equals(79600, advancePopulation(80000, 30, 100000));
        assert.equals(0, advancePopulation(0, 0, 100000));
    });

    suite.test('人口上限 = 100000 + 50000 × (等級 − 1)；守城大敗 −3%；民心夾 0～100', () => {
        assert.equals(100000, populationCapOf(1));
        assert.equals(300000, populationCapOf(5));
        assert.equals(77600, applyPopulationRout(80000));
        assert.equals(0, clampMorale(-9));
        assert.equals(100, clampMorale(150));
    });

    suite.test('黃金基礎值只看本季商業任務實際產出', () => {
        const log = { lastSeason: 3, lastTask: 'commerce', lastGrant: { resource: 'gold', amount: 200 } };
        assert.equals(200, commerceGoldBase(log, 3));
        assert.equals(0, commerceGoldBase(log, 4), '換季後歸 0');
        assert.equals(0, commerceGoldBase({ ...log, lastTask: 'scouting' }, 3));
        assert.equals(0, commerceGoldBase({ lastSeason: null, lastTask: null }, 3));
    });

    suite.test('舊存檔補值：民心 60、人口用傳入的舊算法值；有欄位則照讀並夾範圍', () => {
        assert.equals(JSON.stringify({ population: 83000, morale: 60 }), JSON.stringify(normalizeCityEconomy(undefined, 83000)));
        assert.equals(JSON.stringify({ population: 5, morale: 100 }), JSON.stringify(normalizeCityEconomy({ population: 5, morale: 999 }, 83000)));
    });

    suite.test('新局：人口 80000、民心 60；太守府未選商業任務時黃金基礎 0、政策修正 +0', () => {
        const session = newSession();
        assert.equals(80000, session.cityPopulation);
        assert.equals(60, session.cityMorale);
        const view = buildGovernorHallView(session.governorSnapshot());
        assert.equals('人口 80000', view.populationText);
        assert.equals('民心 60', view.moraleText);
        assert.equals('基礎值 0（本季未選商業任務）', view.goldCard.baseText);
        assert.equals('人口紅利 +0（換季入帳）', view.goldCard.populationBonusText);
        assert.equals('政策修正 +0', view.goldCard.policyModifierText);
        assert.equals('政策修正 +0', view.foodCard.policyModifierText);
        const foodBase = Math.floor(FOOD_PER_SEASON * seasonModifiersOf(session.gameTime.currentSeason).foodMultiplier);
        assert.equals(`基礎值 ${foodBase}`, view.foodCard.baseText);
        assert.equals(`人口紅利 +${Math.floor(foodBase * 0.2 + 1e-9)}`, view.foodCard.populationBonusText);
    });

    suite.test('選商業任務並指派 CHR 50 武將：基礎值 50 + 50×3 = 200，紅利 +40，總計 240', async () => {
        const session = newSession();
        assert.isTrue(session.assignGovernor('commerce', 'zhang').ok);
        const result = await session.chooseDomesticTask('commerce');
        assert.isTrue(result.ok);
        const view = buildGovernorHallView(session.governorSnapshot());
        assert.equals('基礎值 200（已入帳）', view.goldCard.baseText);
        assert.equals('人口紅利 +40（換季入帳）', view.goldCard.populationBonusText);
        assert.equals('總計 240', view.goldCard.totalText);
    });

    suite.test('季結：糧草足夠民心 +1，上季外交任務再 +2，人口依新民心成長', async () => {
        const session = newSession();
        await session.chooseDomesticTask('diplomacy');
        await session.advanceSeason();
        assert.equals(63, session.cityMorale);
        assert.equals(Math.floor(80000 * (1 + 23 / 2000) + 1e-9), session.cityPopulation);
        await session.advanceSeason();
        assert.equals(64, session.cityMorale, '沒選外交只有糧草足夠 +1');
    });

    suite.test('季結：糧荒民心 −5，民心低於 40 人口流失', async () => {
        const session = newSession();
        (session as unknown as { _military: { food: number } })._military = { ...session.military, food: 0 };
        (session as unknown as { _cityEconomy: { population: number; morale: number } })._cityEconomy = { population: 80000, morale: 30 };
        await session.advanceSeason();
        assert.equals(25, session.cityMorale);
        assert.isTrue(session.cityPopulation < 80000, '人口流失');
    });

    suite.test('季結：人口紅利以結算前數值入帳到黃金（上季商業任務）與糧草', async () => {
        const session = newSession();
        const w = wallet();
        session.bindMissionData(realBundle(), w);
        session.assignGovernor('commerce', 'zhang');
        await session.chooseDomesticTask('commerce');
        const foodBefore = session.military.food;
        const previousSeason = session.gameTime.currentSeason;
        await session.advanceSeason();
        assert.equals(40, w.amount(), '黃金紅利 = 200 × 20%');
        const foodBase = Math.floor(FOOD_PER_SEASON * seasonModifiersOf(previousSeason).foodMultiplier);
        const expectedGain = foodBase + Math.floor(foodBase * 0.2 + 1e-9);
        assert.equals(Math.min(session.military.foodCap, foodBefore + expectedGain), session.military.food);
    });

    suite.test('守城戰敗：民心 −3；守城大敗另扣人口 3%（尚無戰場呼叫端，僅公開方法）', async () => {
        const session = newSession();
        await session.applyDefenseDefeat('defeat');
        assert.equals(57, session.cityMorale);
        assert.equals(80000, session.cityPopulation);
        await session.applyDefenseDefeat('rout');
        assert.equals(54, session.cityMorale);
        assert.equals(77600, session.cityPopulation);
    });

    suite.test('存讀檔：人口與民心寫進存檔讀回；舊檔缺欄位民心補 60、人口補舊算法值', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = newSession(adapter);
        session.setAutoSave(true);
        await session.applyDefenseDefeat('rout');
        const restored = new GameSession();
        restored.setRosterStore(new InMemoryRosterStore([]));
        restored.setSaveService(new PlayerSaveService(adapter));
        assert.isTrue(await restored.load());
        assert.equals(57, restored.cityMorale);
        assert.equals(77600, restored.cityPopulation);

        restored.restoreLifespanState({} as unknown as PlayerSaveSnapshot);
        assert.equals(60, restored.cityMorale);
        assert.equals(80000 + 1500 * restored.gameTime.totalSeasonsElapsed, restored.cityPopulation);
    });

    return suite;
}
