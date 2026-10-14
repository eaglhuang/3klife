/**
 * LocalGachaService.test.ts — 轉蛋服務層（錢包、保底跨實例、失敗不前進）headless 測試（PROG-2-0400）
 *
 * Unity 對照：PlayMode 測試用同一份 PlayerPrefs 建兩個 Manager 實例，檢查資料能被讀回。
 */
import { assert, TestSuite } from './TestRunner';
import { LocalGachaService } from '../assets/scripts/core/services/LocalGachaService';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function lcg(seed: number): () => number {
    let state = seed >>> 0;
    return () => {
        state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
        return state / 4294967296;
    };
}

function makeGenerals(): GeneralConfig[] {
    const out: GeneralConfig[] = [];
    for (let i = 0; i < 40; i++) {
        out.push({ id: `g${i}`, name: `n${i}`, faction: 'player', rarityTier: i < 3 ? 'legendary' : i < 10 ? 'epic' : 'common' } as unknown as GeneralConfig);
    }
    return out;
}

export function createLocalGachaServiceSuite(): TestSuite {
    const suite = new TestSuite('LocalGachaService (轉蛋服務層 保底與錢包)');

    suite.test('保底計數跨服務實例保留：10 抽 + 新實例再 40 抽，第 50 抽必為 SR 以上', async () => {
        const generals = makeGenerals();
        const a = new LocalGachaService();
        a.grantCurrency('tickets', 100);
        await a.performTicketSummon(10, generals, { rng: lcg(7) });
        const b = new LocalGachaService();
        const rest = await b.performTicketSummon(40, generals, { rng: lcg(8) });
        assert.notEquals('common', rest[39].rarityTier, '第 50 抽（保底）不能是 R');
    });

    suite.test('召喚紀錄寫入失敗：不扣款，保底計數也不前進', async () => {
        const generals = makeGenerals();
        const svc = new LocalGachaService();
        svc.grantCurrency('tickets', 100);
        const tickets = svc.getCurrencyAmount('tickets');
        const sync = services().sync as unknown as { pushAction: (...args: unknown[]) => boolean };
        const original = sync.pushAction;
        sync.pushAction = () => false;
        try {
            let threw = false;
            try { await svc.performTicketSummon(10, generals, { rng: lcg(1) }); } catch { threw = true; }
            assert.isTrue(threw);
        } finally {
            sync.pushAction = original;
        }
        assert.equals(tickets, svc.getCurrencyAmount('tickets'), '失敗不扣券');
        // 失敗的 10 抽不算：再抽 49 次都不該觸發保底，第 50 次才觸發
        const results = await svc.performTicketSummon(50, generals, { rng: lcg(2) });
        assert.notEquals('common', results[49].rarityTier, '保底仍照第 50 抽觸發');
    });

    suite.test('大量抽樣經服務層：SSR 約 3%、SR 約 10%+保底提升', async () => {
        const generals = makeGenerals();
        const svc = new LocalGachaService();
        svc.grantCurrency('tickets', 20000);
        const rng = lcg(99);
        let ssr = 0; let sr = 0; let total = 0;
        for (let i = 0; i < 100; i++) {
            const batch = await svc.performTicketSummon(100, generals, { rng });
            for (const r of batch) { total++; if (r.rarityTier === 'legendary') ssr++; else if (r.rarityTier === 'epic') sr++; }
        }
        assert.isTrue(Math.abs(ssr / total - 0.03) < 0.01, `SSR 比例 ${ssr / total}`);
        assert.isTrue(Math.abs(sr / total - 0.1174) < 0.015, `SR 比例 ${sr / total}`);
    });

    return suite;
}
