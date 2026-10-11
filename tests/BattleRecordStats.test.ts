/**
 * BattleRecordStats.test.ts — 武將戰績、城市兵源與糧草寫回 headless 測試（PROG-2-0072）
 *
 * Unity 對照：EditMode Test，驗證 StatsTracker 累加、戰後 SaveData 寫回與讀檔。
 */
import { TestSuite, assert } from './TestRunner';
import {
    BattlePerformanceTracker,
    buildBattleRecordPanel,
    formatPerformance,
    newlyReachedMilestones,
    retireScore,
    retireTallyGrade,
    winRate,
} from '../assets/scripts/core/systems/BattleRecordStats';
import { applySortieResult, FOOD_PER_SEASON, normalizeMilitaryReserve, regenMilitaryOneSeason, STARTER_MILITARY } from '../assets/scripts/core/systems/MilitaryReserve';
import { formatSortieSummary } from '../assets/scripts/core/systems/SortieDeploy';
import { BattleRosterGeneral, settleBattle } from '../assets/scripts/core/systems/BattleRoster';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function adult(id: string, extra: Partial<BattleRosterGeneral> = {}): GeneralConfig {
    return {
        id, name: id, faction: 'shu', gender: '男', age: 30, hp: 1000,
        vitality: 100, maxVitality: 100,
        str: 90, int: 50, lea: 85, pol: 40, cha: 50, luk: 40,
        ...extra,
    } as unknown as GeneralConfig;
}

export function createBattleRecordStatsSuite(): TestSuite {
    const suite = new TestSuite('BattleRecordStats');

    suite.test('單場表現：我方傷害、承傷、擊殺、治療分開累加，敵方治療不算', () => {
        const t = new BattlePerformanceTracker('player');
        t.observeUnitDamaged(30, 'player', 'enemy');
        t.observeUnitDamaged(12, 'enemy', 'player');
        t.observeUnitDamaged(-5, 'player', 'enemy');
        t.observeGeneralDamaged(40, 'enemy');
        t.observeGeneralDamaged(8, 'player');
        t.observeUnitDied('enemy');
        t.observeUnitDied('player');
        t.observeHealed(20, 'player');
        t.observeHealed(99, 'enemy');
        const s = t.snapshot();
        assert.equals(70, s.damageDealt);
        assert.equals(20, s.damageTaken);
        assert.equals(1, s.kills);
        assert.equals(20, s.healingDone);
        assert.equals('本場戰績：斬敵 1｜傷害 70｜守護 40', formatPerformance(s));
        t.reset();
        assert.equals(0, t.snapshot().damageDealt);
    });

    suite.test('勝率與退役評分：分母為 0 保護，門檻 1000/5000/10000', () => {
        assert.equals(0, winRate({ wins: 0, losses: 0 }));
        assert.equals(75, winRate({ wins: 3, losses: 1 }));
        assert.equals(66.7, winRate({ wins: 2, losses: 1 }));
        assert.equals(3 * 10 + 2 * 5 + 2 + 1, retireScore({ wins: 10, losses: 0, kills: 5, totalDamage: 2000, guardianPower: 1000 }));
        assert.equals('N', retireTallyGrade({ wins: 0, losses: 0 }));
        assert.equals('R', retireTallyGrade({ wins: 0, losses: 0, kills: 500 }));
        assert.equals('SR', retireTallyGrade({ wins: 0, losses: 0, kills: 2500 }));
        assert.equals('SSR', retireTallyGrade({ wins: 0, losses: 0, kills: 5000 }));
    });

    suite.test('里程碑：達成才回報、不重複；不敗神話需 50 勝 0 敗', () => {
        assert.equals('KILL_100', newlyReachedMilestones({ wins: 1, losses: 0, kills: 100 }).join(','));
        assert.equals('', newlyReachedMilestones({ wins: 1, losses: 0, kills: 150, milestones: ['KILL_100'] }).join(','));
        assert.equals('UNDEFEATED_50', newlyReachedMilestones({ wins: 50, losses: 0 }).join(','));
        assert.equals('', newlyReachedMilestones({ wins: 50, losses: 1 }).join(','));
        assert.equals('GUARDIAN_WALL,ASURA', newlyReachedMilestones({ wins: 0, losses: 0, guardianPower: 50000, totalDamage: 100000 }).join(','));
    });

    suite.test('戰績面板：五項 + 勝率 + 里程碑名稱 + 生涯文案；舊存檔沒有新欄位當 0', () => {
        const panel = buildBattleRecordPanel({ wins: 3, losses: 1, kills: 120, totalDamage: 4500, guardianPower: 800, milestones: ['KILL_100'] });
        assert.equals('勝場,敗場,擊殺數,傷害總量,守護力', panel.rows.map((r) => r.label).join(','));
        assert.equals('3,1,120,4500,800', panel.rows.map((r) => r.value).join(','));
        assert.equals('勝率 75%', panel.winRateText);
        assert.equals('百人斬', panel.milestones.join(','));
        assert.equals('生涯戰績：3勝 1敗 斬120人', panel.careerText);
        assert.isTrue(panel.hasRecord);
        const legacy = buildBattleRecordPanel({ wins: 1, losses: 0 });
        assert.equals(0, legacy.rows[2].value);
        assert.isFalse(buildBattleRecordPanel(null).hasRecord);
    });

    suite.test('settleBattle：表現累加進戰績並回報新里程碑；沒給表現只記勝敗', () => {
        const roster = [adult('a', { battleRecord: { wins: 0, losses: 0, draws: 0, merit: 0, kills: 95 } }), adult('b')];
        const result = settleBattle(roster, {
            deployedIds: ['a', 'b'],
            result: 'player-win',
            performance: { a: { kills: 6, damageDealt: 300, damageTaken: 50, healingDone: 25 } },
        });
        const a = result.entries.find((e) => e.generalId === 'a')!;
        assert.equals(101, a.record.kills!);
        assert.equals(300, a.record.totalDamage!);
        assert.equals(75, a.record.guardianPower!);
        assert.equals('KILL_100', a.newMilestones.join(','));
        assert.equals('KILL_100', a.record.milestones!.join(','));
        const b = result.entries.find((e) => e.generalId === 'b')!;
        assert.equals(1, b.record.wins);
        assert.equals(0, b.record.kills!);
        assert.equals(0, b.newMilestones.length);
    });

    suite.test('城市兵源與糧草：正規化、戰後扣戰損與糧草、每季補回不超過上限', () => {
        assert.equals(JSON.stringify(STARTER_MILITARY), JSON.stringify(normalizeMilitaryReserve(undefined)));
        const broken = normalizeMilitaryReserve({ cityTroops: 99999, cityTroopsCap: 9000, food: -3 });
        assert.equals(9000, broken.cityTroops, '不超過上限');
        assert.equals(STARTER_MILITARY.food, broken.food, '壞值補起始值');
        const after = applySortieResult(STARTER_MILITARY, { lostTroops: 1700, foodSpent: 42 });
        assert.equals(STARTER_MILITARY.cityTroops - 1700, after.cityTroops);
        assert.equals(STARTER_MILITARY.food - 42, after.food);
        const regen = regenMilitaryOneSeason(after);
        assert.equals(after.cityTroops + STARTER_MILITARY.recruitRegen, regen.cityTroops);
        assert.equals(Math.min(STARTER_MILITARY.foodCap, after.food + FOOD_PER_SEASON), regen.food);
        assert.equals(STARTER_MILITARY.cityTroopsCap, regenMilitaryOneSeason(after, 10).cityTroops);
    });

    suite.test('結算面板六項文案', () => {
        const lines = formatSortieSummary({
            poolMax: 8000, poolRemaining: 7300, returnedTroops: 300, lostTroops: 700, foodSpent: 14, foodRemaining: 286,
            cityTroopsBefore: 10000, cityTroopsAfter: 9300, recruitRegen: 750, turnsToRecover: 1, militiaDeployed: 0, eliteDeployed: 0,
        });
        assert.equals('出征軍勢 8000｜返還 300｜戰損 700｜糧草 -14', lines[0]);
        assert.equals('城市兵源 10000→9300｜補兵 750/季｜約 1 季恢復', lines[1]);
    });

    suite.test('GameSession：出征設定讀儲備；戰後寫回兵源、糧草、戰績並存檔；換季補兵；讀檔還原', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = new GameSession(7);
        session.setRosterStore(new InMemoryRosterStore([adult('g')]));
        session.setSaveService(new PlayerSaveService(adapter));

        const input = session.getSortieInput('g')!;
        assert.equals(STARTER_MILITARY.cityTroops, input.cityTroops);
        assert.equals(STARTER_MILITARY.food, input.food);
        assert.isTrue(input.commandCapacity >= 8000);
        assert.equals(null, session.getSortieInput('nobody'));

        const settled = await session.recordBattle(['g'], 'player-win', {
            sortie: { lostTroops: 1200, foodSpent: 30 },
            performance: { g: { kills: 4, damageDealt: 210, damageTaken: 90, healingDone: 0 } },
        });
        assert.equals(STARTER_MILITARY.cityTroops - 1200, settled.military!.cityTroops);
        assert.equals(STARTER_MILITARY.food - 30, session.military.food);

        const restored = new GameSession(7);
        restored.setRosterStore(new InMemoryRosterStore());
        restored.setSaveService(new PlayerSaveService(adapter));
        assert.isTrue(await restored.load());
        assert.equals(STARTER_MILITARY.cityTroops - 1200, restored.military.cityTroops);
        const record = (restored.roster[0] as BattleRosterGeneral).battleRecord!;
        assert.equals(4, record.kills!);
        assert.equals(90, record.guardianPower!);

        await restored.advanceSeason();
        assert.equals(STARTER_MILITARY.cityTroops - 1200 + STARTER_MILITARY.recruitRegen, restored.military.cityTroops);

        const noSortie = await restored.recordBattle(['g'], 'enemy-win');
        assert.equals(undefined, noSortie.military, '沒有出征帳本時不動兵源');
    });

    return suite;
}
