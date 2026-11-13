// @spec-source → 轉蛋系統.md §L；PROG-2-9020 統一轉蛋入口與池呈現設定
import { assert, TestSuite } from './TestRunner';
import * as fs from 'fs';
import * as path from 'path';
import { GachaSystem, type GachaPoolRule } from '../assets/scripts/core/systems/GachaSystem';
import { gachaPoolHeader, gachaPoolTitle, resolveGachaPoolPresentation } from '../assets/scripts/core/systems/GachaPoolPresentation';
import type { GachaConfig } from '../assets/scripts/core/models/GachaConfig';
import { GOLD_SUMMON_POOL_ID, TICKET_SUMMON_POOL_ID, registerLocalGachaRules } from '../assets/scripts/core/systems/GachaLocalRules';
import type { LocalGachaService } from '../assets/scripts/core/services/LocalGachaService';

const pools: GachaConfig[] = JSON.parse(fs.readFileSync(path.join(__dirname, '../assets/resources/data/gacha-config.json'), 'utf-8'));
const byId = (id: string) => pools.find(p => p.poolId === id)!;
const fakeRule = (tag: string, calls: string[]): GachaPoolRule => ({
    async pull(req) { calls.push(`${tag}:${req.poolId}:${req.drawCount}`); return []; },
});

export function createGachaSystemSuite(): TestSuite {
    const suite = new TestSuite('GachaSystem');

    suite.test('四個池都有呈現設定：名將、紅顏、支援卡、宿命', () => {
        for (const id of ['hero-pool', 'support-pool', 'mentor-pool', 'destiny-pool']) {
            assert.isTrue(!!byId(id)?.presentation, id);
        }
    });

    suite.test('宿命池：免費重轉、展示後收起武將、池別文案與重轉次數', () => {
        const p = resolveGachaPoolPresentation(byId('destiny-pool'));
        assert.equals('freeReroll', p.repull);
        assert.equals('hide', p.heroReveal);
        assert.equals('免費重轉', p.labels?.repull);
        assert.equals('確定 · 全部收下', p.labels?.back);
        assert.equals('宿命轉蛋 · 十連全收', gachaPoolHeader(p, 0));
        assert.equals('宿命轉蛋 · 十連全收（已重轉 2 次）', gachaPoolHeader(p, 2));
    });

    suite.test('紅顏池與支援卡池沿用原標題與貨幣；支援卡只產生教官卡', () => {
        const beauty = resolveGachaPoolPresentation(byId('support-pool'));
        assert.equals('召喚券十連', gachaPoolTitle(beauty, 10));
        assert.equals('召喚券', gachaPoolTitle(beauty, 1));
        assert.equals('tickets', beauty.currency);
        const mentor = resolveGachaPoolPresentation(byId('mentor-pool'));
        assert.equals('支援券十連', gachaPoolTitle(mentor, 10));
        assert.equals('mentorTickets', mentor.currency);
        assert.equals('mentorCard', mentor.inventory);
        assert.equals(null, mentor.labels);
    });

    suite.test('不在設定檔的池用保底呈現（常設池單抽／十連抽）', () => {
        const p = resolveGachaPoolPresentation(null, 'GENERAL_STANDARD_01');
        assert.equals('單抽', gachaPoolTitle(p, 1));
        assert.equals('十連抽', gachaPoolTitle(p, 10));
        assert.equals('side', p.heroReveal);
    });

    suite.test('依池類型選規則；指定池 id 的規則優先；設定未載入時用類型提示', async () => {
        const calls: string[] = [];
        let loaded: GachaConfig[] = [];
        const sys = new GachaSystem(() => loaded)
            .registerType('support', fakeRule('beauty', calls))
            .registerType('hero', fakeRule('hero', calls))
            .registerPool('GENERAL_STANDARD_01', fakeRule('standard', calls));
        await sys.pull({ poolId: 'support-pool', drawCount: 10, generals: [], poolTypeHint: 'support' });
        loaded = pools;
        const out = await sys.pull({ poolId: 'hero-pool', drawCount: 1, generals: [] });
        await sys.pull({ poolId: 'GENERAL_STANDARD_01', drawCount: 10, generals: [], poolTypeHint: 'hero' });
        assert.equals('beauty:support-pool:10,hero:hero-pool:1,standard:GENERAL_STANDARD_01:10', calls.join(','));
        assert.equals('hero-pool', out.presentation.poolId);
    });

    suite.test('沒有規則的池明確報錯，不默默改走別池', async () => {
        const sys = new GachaSystem(() => pools);
        let message = '';
        try { await sys.pull({ poolId: 'destiny-pool', drawCount: 10, generals: [] }); } catch (e) { message = String(e); }
        assert.isTrue(message.includes('destiny-pool'));
    });

    suite.test('金幣召喚、召喚券是轉蛋系統的程式池：走各自規則、帶原標題與貨幣（PROG-2-9021）', async () => {
        const calls: string[] = [];
        const service = {
            async performGoldSummon(n: number, _g: unknown, o: { factionFilter?: string }) { calls.push(`gold:${n}:${o.factionFilter}`); return []; },
            async performTicketSummon(n: number, _g: unknown, o: { factionFilter?: string }) { calls.push(`ticket:${n}:${o.factionFilter}`); return []; },
        } as unknown as LocalGachaService;
        const sys = registerLocalGachaRules(new GachaSystem(() => pools), service, { rollOptions: { factionFilter: 'player' } });
        const gold = await sys.pull({ poolId: GOLD_SUMMON_POOL_ID, drawCount: 1, generals: [] });
        const ticket = await sys.pull({ poolId: TICKET_SUMMON_POOL_ID, drawCount: 1, generals: [] });
        assert.equals('gold:1:player,ticket:1:player', calls.join(','));
        assert.equals('金幣召喚', gold.presentation.title);
        assert.equals('gold', gold.presentation.currency);
        assert.equals('召喚券', ticket.presentation.title);
        assert.equals('tickets', ticket.presentation.currency);
        assert.equals('paid', ticket.presentation.repull);
    });

    return suite;
}
