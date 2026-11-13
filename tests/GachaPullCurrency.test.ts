/**
 * GachaPullCurrency.test.ts — 轉蛋扣費照規格（PROG-2-1094）headless 測試
 *
 * 驗證：單抽 150／十連 1500、常設池先扣銅錢符、不足改扣靈玉、兩者都不足拒絕、限定池不收銅錢符、
 * 紅顏與支援卡池可十連、開局送一次十連份的銅錢符。
 */
import { TestSuite, assert } from './TestRunner';
import { pickGachaCurrency } from '../assets/scripts/core/systems/GachaCurrency';
import { STARTER_GACHA_WALLET } from '../assets/scripts/core/services/GachaWalletRules';
import { GACHA_NODES, gachaPullBarTexts } from '../assets/scripts/ui/core/GachaScreenNodes';
import { disableCharCache, disableCharCacheForCjk } from '../assets/scripts/ui/core/LabelCjkCache';
import { Label, Node } from 'cc';

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
        const bar = gachaPullBarTexts();
        assert.equals('150', bar[GACHA_NODES.pullSingleCost]);
        assert.equals('1500', bar[GACHA_NODES.pullTenCost]);
        // 抽卡規則統一在轉蛋系統（PROG-2-9020）
        const rules = read('assets/scripts/core/systems/GachaLocalRules.ts');
        assert.isTrue(rules.includes('performSupportCardSummon(req.poolId, req.drawCount, req.generals)'));
        assert.isTrue(rules.includes('performPoolTicketSummon(req.poolId, req.drawCount, req.generals)'));
        assert.isTrue(rules.includes('pickGachaCurrency('));
    });

    suite.test('結果畫面含中文的 CHAR 快取 Label 改不快取，英數字不動（PROG-2-2243）', () => {
        const root = new Node('root');
        const mk = (text: string): Label => { const n = new Node(text); root.children.push(n); const l = n.addComponent(Label); l.string = text; l.cacheMode = 2; return l; };
        const cjk = mk('確定 · 全部收下');
        const ascii = mk('SR x1');
        disableCharCacheForCjk(root);
        assert.equals(0, cjk.cacheMode);
        assert.equals(2, ascii.cacheMode);
    });

    suite.test('結果畫面所有 CHAR 快取 Label 改不快取，卡片掛頭像（PROG-2-2247）', () => {
        const root = new Node('root');
        const mk = (text: string, mode: number): Label => { const n = new Node(text); root.children.push(n); const l = n.addComponent(Label); l.string = text; l.cacheMode = mode; return l; };
        const ascii = mk('SSR+ x0', 2);
        const bitmap = mk('x1', 1);
        disableCharCache(root);
        assert.equals(0, ascii.cacheMode);
        assert.equals(1, bitmap.cacheMode);
        const flow = read('assets/scripts/ui/core/GachaFlowCoordinator.ts');
        assert.isTrue(flow.includes('this._updateCardPortraits(binder, cards, results)'));
        assert.isTrue(flow.includes('loadGeneralAvatar(entry.general.id)'));
        // #2107-8：先全螢幕展示武將，點擊後才亮出結果面板
        assert.isTrue(flow.includes('this._stageHeroReveal(binder, topResult !== null, flow.hideHeroAfterReveal === true)'));
        assert.isTrue(flow.includes('panel.active = false'));
    });

    return suite;
}
