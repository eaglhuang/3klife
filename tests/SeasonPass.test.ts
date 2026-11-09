// @spec-source → 季度通行證軍功任務追蹤與雙軌獎勵階梯規格書.md (doc_spec_0627)；裁決 11/09 第 12 題；PROG-2-2197
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { ITEM_ORACLE_TOKEN, ITEM_VITALITY_PILL } from '../assets/scripts/core/systems/ItemDef';
import {
    claimAllSeasonPass,
    createSeasonPassState,
    mockSeasonPassLevelUp,
    normalizeSeasonPassState,
    SEASON_PASS_MOCK_MAX_LEVEL,
    seasonPassLevel,
    seasonPassRewardStatus,
    seasonPassTier,
} from '../assets/scripts/core/systems/SeasonPass';
import { SeasonPassController, seasonPassView } from '../assets/scripts/ui/core/SeasonPassController';
import { actionAt } from '../assets/scripts/ui/core/LobbyCityHubController';

function levelled(n: number) {
    let state = createSeasonPassState();
    for (let i = 0; i < n; i += 1) state = mockSeasonPassLevelUp(state);
    return state;
}

function layoutIds(): Set<string> {
    const file = path.join(process.cwd(), 'assets/resources/ui-spec/layouts/season-pass-main.json');
    const ids = new Set<string>();
    const walk = (node: { id?: string; children?: unknown[] }): void => {
        if (node.id) ids.add(node.id);
        (node.children ?? []).forEach((c) => walk(c as { id?: string; children?: unknown[] }));
    };
    walk(JSON.parse(fs.readFileSync(file, 'utf8')).root);
    return ids;
}

async function newSession(adapter: MemoryStorageAdapter): Promise<GameSession> {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore([]));
    session.setSaveService(new PlayerSaveService(adapter));
    await session.load();
    return session;
}

export function createSeasonPassSuite(): TestSuite {
    const suite = new TestSuite('SeasonPass');

    suite.test('等級：每 1000 軍功 1 級，Mock 封頂 30 級', () => {
        assert.equals(0, seasonPassLevel(createSeasonPassState()));
        assert.equals(3, seasonPassLevel(levelled(3)));
        assert.equals(SEASON_PASS_MOCK_MAX_LEVEL, seasonPassLevel(levelled(40)));
        assert.equals(30000, levelled(40).exp);
    });

    suite.test('里程碑照規格，一般等級是暫定', () => {
        assert.equals('求籤令 ×5', seasonPassTier(10).premium.label);
        assert.equals(null, seasonPassTier(20).premium.itemId);
        assert.isTrue(seasonPassTier(30).isMilestone);
        assert.isFalse(seasonPassTier(11).isMilestone);
    });

    suite.test('領取：未解鎖只領白銀，解鎖後補領黃金，不重複', () => {
        const first = claimAllSeasonPass(levelled(2));
        assert.equals(2, first.rewards.length);
        assert.equals('needPremium', seasonPassRewardStatus(first.state, 1, 'premium'));
        assert.equals('claimed', seasonPassRewardStatus(first.state, 1, 'free'));
        assert.equals('locked', seasonPassRewardStatus(first.state, 3, 'free'));
        const second = claimAllSeasonPass({ ...first.state, premium: true });
        assert.equals(2, second.rewards.length);
        assert.equals(0, claimAllSeasonPass(second.state).rewards.length);
    });

    suite.test('存檔正規化：壞資料回預設，超界等級剔除', () => {
        assert.equals(0, normalizeSeasonPassState(null).exp);
        const state = normalizeSeasonPassState({ exp: 999999, premium: 'yes', claimedFree: [2, 2, 1, 99, 'x'] });
        assert.equals(30000, state.exp);
        assert.isFalse(state.premium);
        assert.equals('1,2', state.claimedFree.join(','));
    });

    suite.test('session：領取進背包、只記錄項目不進背包，存檔還原後不重領', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = await newSession(adapter);
        const oracleBefore = session.inventory[ITEM_ORACLE_TOKEN] ?? 0;
        for (let i = 0; i < 10; i += 1) await session.mockSeasonPassLevelUp();
        await session.mockUnlockSeasonPassPremium();
        const rewards = await session.claimAllSeasonPass();
        assert.equals(20, rewards.length);
        assert.equals(9, session.inventory[ITEM_VITALITY_PILL] ?? 0);
        assert.equals(oracleBefore + 5, session.inventory[ITEM_ORACLE_TOKEN] ?? 0);
        await session.save();
        const restored = await newSession(adapter);
        assert.equals(10, seasonPassLevel(restored.seasonPass));
        assert.equals(0, (await restored.claimAllSeasonPass()).length);
    });

    suite.test('面板：view key 對得到版面節點，翻頁有邊界，開窗停在目前等級', async () => {
        const ids = layoutIds();
        const view = seasonPassView(levelled(1), 1);
        const keys = [...Object.keys(view.texts), ...Object.keys(view.actives), ...Object.keys(view.enabled)];
        assert.equals('', keys.filter((k) => !ids.has(k)).join(','));
        assert.isFalse(view.enabled.btnPrevPassTier);
        assert.isFalse(seasonPassView(levelled(1), 30).enabled.btnNextPassTier);
        assert.isFalse(seasonPassView(createSeasonPassState(), 1).enabled.btnClaimPass);

        let state = levelled(5);
        const toasts: string[] = [];
        const ctrl = new SeasonPassController({
            mountHost: async () => ({ node: { active: true }, binder: null }) as never,
            apply: () => undefined,
            state: () => state,
            levelUp: async () => { state = mockSeasonPassLevelUp(state); },
            unlockPremium: async () => { state = { ...state, premium: true }; },
            claimAll: async () => { const r = claimAllSeasonPass(state); state = r.state; return r.rewards; },
            toast: (m) => { toasts.push(m); },
        });
        await ctrl.mount();
        ctrl.setOpen(true);
        assert.equals(5, ctrl.page);
        ctrl.turn(-10);
        assert.equals(1, ctrl.page);
        await ctrl.levelUp();
        assert.equals(6, ctrl.page);
        assert.equals(6, (await ctrl.claimAll()).length);
        assert.equals(0, (await ctrl.claimAll()).length);
        assert.equals('沒有可領取的獎勵', toasts[toasts.length - 1]);
    });

    suite.test('大廳入口：商城類別第 5 格是通行證', () => {
        assert.equals('seasonPass', actionAt('shop', 4));
    });

    return suite;
}
