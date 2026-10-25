/**
 * GachaPullCurrency.test.ts — 轉蛋扣費照規格（PROG-2-1094）headless 測試
 *
 * 驗證：單抽 150／十連 1500、常設池先扣銅錢符、不足改扣靈玉、兩者都不足拒絕、限定池不收銅錢符、
 * 紅顏與支援卡池可十連、開局送一次十連份的銅錢符。
 */
import { TestSuite, assert } from './TestRunner';
import { pickGachaCurrency } from '../assets/scripts/core/systems/GachaCurrency';
import { STARTER_GACHA_WALLET } from '../assets/scripts/core/services/GachaWalletRules';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

export function createGachaPullCurrencySuite(): TestSuite {
    const suite = new TestSuite('GachaPullCurrency (轉蛋扣費照規格 PROG-2-1094)');

    suite.test('常設池先扣銅錢符；不夠改扣靈玉；兩者都不夠回 null', () => {
        assert.equals(JSON.stringify({ coin: 'bronze', cost: 1500 }), JSON.stringify(pickGachaCurrency('HERO', 10, { gems: 9999, bronze: 1500 })));
        assert.equals(JSON.stringify({ coin: 'gems', cost: 1500 }), JSON.stringify(pickGachaCurrency('HERO', 10, { gems: 1500, bronze: 1499 })));
        assert.equals(JSON.stringify({ coin: 'gems', cost: 150 }), JSON.stringify(pickGachaCurrency('HERO', 1, { gems: 150, bronze: 0 })));
        assert.equals(null, pickGachaCurrency('HERO', 1, { gems: 149, bronze: 149 }));
    });

    suite.test('限定池不收銅錢符，只扣靈玉', () => {
        assert.equals('gems', pickGachaCurrency('LIMITED', 1, { gems: 150, bronze: 99999 })?.coin);
    });

    suite.test('開局錢包夠抽一次十連（銅錢符 1500）', () => {
        assert.equals(1500, STARTER_GACHA_WALLET.bronze);
        assert.equals('bronze', pickGachaCurrency('HERO', 10, STARTER_GACHA_WALLET)?.coin);
    });

    suite.test('大廳單抽／十連把次數傳給紅顏池與支援卡池；價格標示 150／1500', () => {
        const lobby = read('assets/scripts/ui/scenes/LobbyScene.ts');
        assert.isTrue(lobby.includes('this._runLocalGacha(10), 10)'));
        assert.isTrue(lobby.includes('this._runBeautySummon(drawCount)'));
        assert.isTrue(lobby.includes('this._runSupportSummon(drawCount)'));
        assert.isTrue(lobby.includes("GachaDs3_div_47: '150'"));
        assert.isTrue(lobby.includes("GachaDs3_div_53: '1500'"));
        const flow = read('assets/scripts/ui/core/GachaFlowCoordinator.ts');
        assert.isTrue(flow.includes('performSupportCardSummon(poolId, drawCount, generals)'));
        assert.isTrue(flow.includes('performPoolTicketSummon(poolId, drawCount, generals)'));
        assert.isTrue(flow.includes('pickGachaCurrency('));
    });

    return suite;
}
