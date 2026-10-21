/**
 * BattleRosterSeasonStats.test.ts — 戰後結算寫入賽季戰績、換季分段與舊存檔相容 headless 測試（PROG-2-0950）
 *
 * Unity 對照：EditMode Test，驗證戰後把本場寫進當季計分表、換季時舊表不被覆蓋。
 */
import { TestSuite, assert } from './TestRunner';
import { settleBattle } from '../assets/scripts/core/systems/BattleRoster';
import { GAME_SEASONS_PER_PVP_SEASON, pvpSeasonIdOf } from '../assets/scripts/core/systems/BattleSeasonStats';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function general(id: string): GeneralConfig {
    return {
        id, name: id, faction: 'shu', gender: '男', age: 30, hp: 1000,
        vitality: 100, maxVitality: 100,
        str: 90, int: 50, lea: 85, pol: 40, cha: 50, luk: 40,
    } as unknown as GeneralConfig;
}

export function createBattleRosterSeasonStatsSuite(): TestSuite {
    const suite = new TestSuite('BattleRosterSeasonStats');

    suite.test('戰後結算帶 seasonId：出戰武將的賽季戰績依勝負與表現累加', () => {
        const first = settleBattle([general('A')], {
            deployedIds: ['A'], result: 'player-win', seasonId: 'S1',
            performance: { A: { kills: 4, damageDealt: 300, damageTaken: 50, healingDone: 10 } },
        });
        const season = (first.roster[0] as GeneralConfig & { battleRecord?: { season?: { wins: number; kills: number; guardianPower: number } } }).battleRecord?.season;
        assert.equals(1, season?.wins ?? -1);
        assert.equals(4, season?.kills ?? -1);
        assert.equals(60, season?.guardianPower ?? -1);

        const second = settleBattle(first.roster, {
            deployedIds: ['A'], result: 'enemy-win', seasonId: 'S1',
        });
        const season2 = (second.roster[0] as GeneralConfig & { battleRecord?: { season?: { wins: number; losses: number; kills: number } } }).battleRecord?.season;
        assert.equals(1, season2?.wins ?? -1);
        assert.equals(1, season2?.losses ?? -1);
        assert.equals(4, season2?.kills ?? -1);
    });

    suite.test('換季後新賽季從零開始，舊季統計不混入', () => {
        const s1 = settleBattle([general('A')], { deployedIds: ['A'], result: 'player-win', seasonId: 'S1' });
        const s2 = settleBattle(s1.roster, { deployedIds: ['A'], result: 'player-win', seasonId: 'S2' });
        const season = (s2.roster[0] as GeneralConfig & { battleRecord?: { season?: { seasonId: string; wins: number } } }).battleRecord?.season;
        assert.equals('S2', season?.seasonId ?? '');
        assert.equals(1, season?.wins ?? -1);
    });

    suite.test('未提供 seasonId 時不寫入賽季戰績（舊呼叫端行為不變）', () => {
        const result = settleBattle([general('A')], { deployedIds: ['A'], result: 'player-win' });
        const record = (result.roster[0] as GeneralConfig & { battleRecord?: { season?: unknown; wins: number } }).battleRecord;
        assert.equals(undefined, record?.season);
        assert.equals(1, record?.wins ?? -1);
    });

    suite.test('舊存檔的 battleRecord 沒有 season 欄位時照常結算', () => {
        const legacy = { ...general('A'), battleRecord: { wins: 2, losses: 1, draws: 0, merit: 25 } } as unknown as GeneralConfig;
        const result = settleBattle([legacy], { deployedIds: ['A'], result: 'player-win', seasonId: 'S1' });
        const record = (result.roster[0] as GeneralConfig & { battleRecord?: { wins: number; season?: { wins: number } } }).battleRecord;
        assert.equals(3, record?.wins ?? -1);
        assert.equals(1, record?.season?.wins ?? -1);
    });

    suite.test('pvpSeasonIdOf：每 4 個遊戲季換一個賽季 ID，負數與 NaN 視為第 1 季', () => {
        assert.equals(4, GAME_SEASONS_PER_PVP_SEASON);
        assert.equals('S1', pvpSeasonIdOf(0));
        assert.equals('S1', pvpSeasonIdOf(3));
        assert.equals('S2', pvpSeasonIdOf(4));
        assert.equals('S3', pvpSeasonIdOf(8));
        assert.equals('S1', pvpSeasonIdOf(-5));
        assert.equals('S1', pvpSeasonIdOf(Number.NaN));
    });

    return suite;
}
