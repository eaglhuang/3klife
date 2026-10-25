/**
 * RecruitHall.test.ts — 招賢館（PROG-2-1089）headless 測試
 *
 * 驗證：名將池 20 位都對得到 generals.json、FlowView key 都在 layout、分頁、
 * 金幣招募入冊、已在名冊與金幣不足擋下、內政畫面有入口。
 */
import { TestSuite, assert } from './TestRunner';
import { RECRUIT_GOLD_COST, RECRUIT_ROWS_PER_PAGE, RecruitHallController } from '../assets/scripts/ui/core/RecruitHallController';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

const ROOT = path.resolve(__dirname, '..');
const readJson = (rel: string) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));

function heroPool(): GeneralConfig[] {
    const pool = (readJson('assets/resources/data/gacha-config.json') as Array<{ poolId: string; candidateIds: string[] }>).find((p) => p.poolId === 'hero-pool')!;
    const generals = readJson('assets/resources/data/generals.json') as GeneralConfig[];
    return pool.candidateIds.map((id) => generals.find((g) => g.id === id)).filter((g): g is GeneralConfig => !!g);
}

function harness(gold: number, owned: string[] = []) {
    const state = { gold, owned: new Set(owned) };
    const candidates = heroPool();
    const controller = new RecruitHallController({
        candidates: () => candidates,
        ownedIds: () => state.owned,
        gold: () => state.gold,
        spendGold: (n) => { if (state.gold < n) return false; state.gold -= n; return true; },
        recruit: async (g) => { state.owned.add(g.id); },
    });
    return { state, controller, candidates };
}

function layoutIds(rel: string): Set<string> {
    const ids = new Set<string>();
    const walk = (n: { id?: string; children?: unknown[] }): void => {
        if (n.id) ids.add(n.id);
        for (const c of n.children ?? []) walk(c as { id?: string; children?: unknown[] });
    };
    walk(readJson(rel).root);
    return ids;
}

export function createRecruitHallSuite(): TestSuite {
    const suite = new TestSuite('RecruitHall (招賢館 PROG-2-1089)');

    suite.test('名將池 20 位都在 generals.json，分 2 頁', () => {
        const { controller, candidates } = harness(0);
        assert.equals(20, candidates.length);
        assert.equals(2, controller.pageCount);
    });

    suite.test('FlowView key 都在 layout；內政畫面有招賢館入口', () => {
        const ids = layoutIds('assets/resources/ui-spec/layouts/recruit-hall-main.json');
        const view = harness(0).controller.getFlowView();
        for (const key of [...Object.keys(view.texts), ...Object.keys(view.enabled), ...Object.keys(view.actives)]) {
            assert.equals(true, ids.has(key), `${key} 要在 layout 裡`);
        }
        for (let i = 0; i < RECRUIT_ROWS_PER_PAGE; i++) assert.equals(true, ids.has(`btnRecruitRow${i}`));
        assert.equals(true, layoutIds('assets/resources/ui-spec/layouts/domestic-main.json').has('btnOpenRecruit'));
    });

    suite.test('招募：扣金幣入冊；已在名冊與金幣不足擋下；翻頁後招第 2 頁', async () => {
        const { state, controller, candidates } = harness(RECRUIT_GOLD_COST * 2, [heroPool()[1].id]);
        assert.equals(false, controller.getFlowView().enabled.btnRecruitRow1, '已在名冊停用');
        assert.equals(false, await controller.recruitRow(1));
        assert.equals(true, await controller.recruitRow(0));
        assert.equals(true, state.owned.has(candidates[0].id));
        assert.equals(RECRUIT_GOLD_COST, state.gold);
        controller.next();
        assert.equals('2 / 2', controller.getFlowView().texts.pageLabel);
        assert.equals(true, await controller.recruitRow(0));
        assert.equals(true, state.owned.has(candidates[RECRUIT_ROWS_PER_PAGE].id));
        assert.equals(false, await controller.recruitRow(1), '金幣不足');
        assert.equals(true, controller.getFlowView().texts.noticeLabel.includes('金幣不足'));
    });

    return suite;
}
