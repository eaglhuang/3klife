/**
 * RecruitHall.test.ts — 招賢館（PROG-2-1089）headless 測試
 *
 * 驗證：名將池 20 位都對得到 generals.json、FlowView key 都在 layout、分頁、
 * 黃金招募入冊、已在名冊與黃金不足擋下、內政畫面有入口。
 */
import { TestSuite, assert } from './TestRunner';
import { RECRUIT_GOLD_COST, RECRUIT_ROWS_PER_PAGE, RecruitHallController, recruitHallAccess } from '../assets/scripts/ui/core/RecruitHallController';
import { installOfficerFeatureUnlocks, resetOfficerFeatureUnlocks } from '../assets/scripts/core/systems/OfficerFeatureUnlocks';
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

    suite.test('名將池 20 位都在 generals.json，一頁六框分 4 頁', () => {
        const { controller, candidates } = harness(0);
        assert.equals(20, candidates.length);
        assert.equals(4, controller.pageCount);
    });

    suite.test('FlowView key 都在 layout；內政畫面有招賢館入口', () => {
        const ids = layoutIds('assets/resources/ui-spec/layouts/recruit-hall-main.json');
        const view = harness(0).controller.getFlowView();
        for (const key of [...Object.keys(view.texts), ...Object.keys(view.enabled), ...Object.keys(view.actives)]) {
            assert.equals(true, ids.has(key), `${key} 要在 layout 裡`);
        }
        for (let i = 0; i < RECRUIT_ROWS_PER_PAGE; i++) assert.equals(true, ids.has(`btnFrame${i}`) && ids.has(`frame${i}Portrait`));
        assert.equals(true, ids.has('btnRecruit'));
        assert.equals(true, layoutIds('assets/resources/ui-spec/layouts/domestic-main.json').has('btnOpenRecruit'));
    });

    suite.test('招募：扣黃金入冊；已在名冊與黃金不足擋下；翻頁後招第 2 頁', async () => {
        const { state, controller, candidates } = harness(RECRUIT_GOLD_COST * 2, [heroPool()[1].id]);
        controller.select(1);
        assert.equals(false, controller.getFlowView().enabled.btnRecruit, '已在名冊停用');
        assert.equals('已在名冊', controller.getFlowView().texts.frame1Sub);
        assert.equals(false, await controller.recruitRow(1));
        assert.equals(true, await controller.recruitRow(0));
        assert.equals(true, state.owned.has(candidates[0].id));
        assert.equals(RECRUIT_GOLD_COST, state.gold);
        controller.next();
        assert.equals('2 / 4', controller.getFlowView().texts.pageLabel);
        assert.equals(true, await controller.recruitRow(0));
        assert.equals(true, state.owned.has(candidates[RECRUIT_ROWS_PER_PAGE].id));
        assert.equals(false, await controller.recruitRow(1), '黃金不足');
        assert.equals(true, controller.getFlowView().texts.noticeLabel.includes('黃金不足'));
    });

    suite.test('官職門檻：大廳與內政兩入口共用 recruitHallAccess，未達第 2 階都擋、達到都開（#2811 第 9 項）', () => {
        installOfficerFeatureUnlocks(readJson('assets/resources/data/officer-feature-unlocks.json'));
        try {
            const low = recruitHallAccess(1, 0);
            assert.equals(false, low.allowed, '第 1 階擋下');
            assert.equals(true, low.message.includes('招賢館') && low.message.includes('才開放'), '提示要寫明招賢館與開放條件');
            assert.equals(true, low.message.includes('目前 0'), '提示帶目前官職經驗');
            assert.equals(true, recruitHallAccess(2, 100).allowed, '第 2 階開放');
            assert.equals(true, recruitHallAccess(5, 9999).allowed, '高階仍開放');
            assert.equals('', recruitHallAccess(2).message);
        } finally {
            resetOfficerFeatureUnlocks();
        }
        assert.equals(true, recruitHallAccess(1).allowed, '資料沒載入視為全開，不把玩家鎖在功能外');
    });

    suite.test('兩個入口都經過同一個判斷：LobbyScene 內政入口與選單入口都呼叫 _guardRecruitHallAccess', () => {
        const src = fs.readFileSync(path.join(ROOT, 'assets/scripts/ui/scenes/LobbyScene.ts'), 'utf8');
        assert.equals(1, (src.match(/recruitHallAccess\(/g) ?? []).length, '全專案只有一處呼叫判斷函式');
        assert.equals(true, /btnOpenRecruit.*_guardRecruitHallAccess\(\)/.test(src), '內政入口走判斷');
        assert.equals(true, /private _openRecruitHall\(\): void \{\s*if \(!this\._guardRecruitHallAccess\(\)\) return;/.test(src), '選單入口走判斷');
    });

    return suite;
}
