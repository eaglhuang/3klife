/**
 * RivalDiplomacy.test.ts — 外交／出征畫面流程（PROG-2-1088）headless 測試
 *
 * 驗證：畫面 JSON 節點與控制器 key 對得上、送禮扣金幣、出征自動結算發金幣、
 * 存檔正規化保留勢力狀態。
 */
import { TestSuite, assert } from './TestRunner';
import { RIVAL_NATION_SLOTS, RivalDiplomacyController } from '../assets/scripts/ui/core/RivalDiplomacyController';
import { GIFT_GOLD_COST, createRivalWorld, declareWar, normalizeRivalWorld } from '../assets/scripts/core/systems/RivalNations';
import type { RivalWorld } from '../assets/scripts/core/systems/RivalNations';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

const ROOT = path.resolve(__dirname, '..');

function harness(gold = 5000, squad = [{ name: '關羽', str: 97, int: 75, lea: 95 }, { name: '張飛', str: 98, int: 30, lea: 85 }]) {
    const state = { world: createRivalWorld() as RivalWorld, gold };
    const controller = new RivalDiplomacyController({
        world: () => state.world,
        setWorld: async (w) => { state.world = w; },
        squad: () => squad,
        gold: () => state.gold,
        spendGold: (n) => { if (state.gold < n) return false; state.gold -= n; return true; },
        grantGold: (n) => { state.gold += n; },
        random: () => 0.5,
        leaderName: (id) => (id === 'liu-zhang' ? '劉璋' : undefined),
    });
    return { state, controller };
}

function layoutIds(): Set<string> {
    const ids = new Set<string>();
    const walk = (n: { id?: string; children?: unknown[] }): void => {
        if (n.id) ids.add(n.id);
        for (const c of n.children ?? []) walk(c as { id?: string; children?: unknown[] });
    };
    walk(JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/ui-spec/layouts/rival-diplomacy-main.json'), 'utf8')).root);
    return ids;
}

export function createRivalDiplomacySuite(): TestSuite {
    const suite = new TestSuite('RivalDiplomacy (外交／出征畫面 PROG-2-1088)');

    suite.test('FlowView 的每個 key 都是 layout 節點；內政畫面有外交入口', () => {
        const ids = layoutIds();
        const view = harness().controller.getFlowView();
        for (const key of [...Object.keys(view.texts), ...Object.keys(view.enabled)]) {
            assert.equals(true, ids.has(key), `${key} 要在 layout 裡`);
        }
        for (let i = 0; i < RIVAL_NATION_SLOTS; i++) assert.equals(true, ids.has(`btnNation${i}`));
        const hud = fs.readFileSync(path.join(ROOT, 'assets/resources/ui-spec/layouts/domestic-main.json'), 'utf8');
        assert.equals(true, hud.includes('"btnOpenRival"'));
    });

    suite.test('送禮扣 1000 金幣並提升邦交；金幣不足不扣', async () => {
        const { state, controller } = harness();
        controller.select(5);
        await controller.gift();
        assert.equals(5000 - GIFT_GOLD_COST, state.gold);
        assert.equals(15, state.world.nations.find((n) => n.id === 'liuzhang')!.relation);
        const poor = harness(10);
        await poor.controller.gift();
        assert.equals(10, poor.state.gold);
    });

    suite.test('出征劉璋：自動結算勝利、發金幣、奪地、畫面顯示結算句與君主中文名', async () => {
        const { state, controller } = harness(0);
        controller.select(5);
        await controller.campaign();
        assert.equals(true, state.gold > 0);
        assert.equals(1, state.world.nations.find((n) => n.id === 'liuzhang')!.territories);
        const view = controller.getFlowView();
        assert.equals(true, view.texts.resultLabel.includes('大勝'));
        assert.equals(true, view.texts.nationDetail.includes('劉璋'));
        assert.equals(false, view.enabled.btnWar, '交戰中不能再宣戰');
    });

    suite.test('沒有武將不能出征；存檔正規化保留交戰狀態', () => {
        assert.equals(false, harness(0, []).controller.getFlowView().enabled.btnCampaign);
        const war = declareWar(createRivalWorld(), 'wei').world;
        const loaded = normalizeRivalWorld(JSON.parse(JSON.stringify(war)));
        assert.equals(true, loaded.nations.find((n) => n.id === 'wei')!.atWar);
    });

    return suite;
}
