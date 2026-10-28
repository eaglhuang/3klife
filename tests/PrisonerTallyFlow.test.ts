/**
 * PrisonerTallyFlow.test.ts — 俘虜身上虎符的轉移接進 GameSession 流程（POW-08 暫定）
 *
 * 鎖住（用 GameSession 真實的 capture → 跨季 → save → load → resolve 流程）：
 * - 勸降成功：記在俘虜身上的虎符轉給他（持有人改為俘虜 id），存讀檔後仍然正確。
 * - 勸降失敗：虎符留在君主手上，俘虜仍在待處置清單並保留虎符紀錄。
 * - 放走：君主持有的虎符跟著他離開，從持有關係與卡表移除。
 * - 放走但虎符已被我方武將持有：不動，武將仍持有。
 * - 沒有記錄虎符的俘虜：勸降或放走都不轉移任何虎符。
 *
 * Unity 對照：像 Prefab 上掛的 Item 組件，俘虜被招攬時 Item 的 Owner 改成新角色；
 * 角色離場時背包裡的物件跟著他走，但不能搶正在別人手上的物件。
 */
import { TestSuite, assert } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import type { TigerTallyCard } from '../assets/scripts/core/models/TigerTallyCard';

const TALLY_UID = 't-gao-shun';

function general(id: string): GeneralConfig {
    return {
        id, name: id, rarityTier: 'rare', cha: 60, luk: 60, int: 40, pol: 40, loyalty: 40,
        gender: '男', age: 30, hp: 1000, vitality: 100, maxVitality: 100, maxLifespan: 120,
        str: 80, lea: 70, careerClass: 'Warrior', role: 'Combat',
    } as unknown as GeneralConfig;
}

function tallyCard(uid: string): TigerTallyCard {
    return { uid, templateId: 'tally-template', quality: 'R', stars: 1 } as unknown as TigerTallyCard;
}

function newSession(adapter: MemoryStorageAdapter, random: () => number): GameSession {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore([general('lead')]));
    session.setSaveService(new PlayerSaveService(adapter));
    session.setRandomSource(random);
    session.setAutoSave(false);
    return session;
}

/** 存檔後用新的 session 讀回（跨季、跨存讀檔的真實路徑） */
async function reloadThrough(adapter: MemoryStorageAdapter, random: () => number): Promise<GameSession> {
    const reloaded = newSession(adapter, random);
    assert.isTrue(await reloaded.load());
    return reloaded;
}

export function createPrisonerTallyFlowSuite(): TestSuite {
    const suite = new TestSuite('PrisonerTallyFlow (俘虜虎符轉移接進流程 POW-08 暫定)');

    suite.test('勸降成功：記錄的虎符跨季、存讀檔後轉給俘虜', async () => {
        const adapter = new MemoryStorageAdapter();
        const a = newSession(adapter, () => 0);
        await a.registerTallyCards([tallyCard(TALLY_UID)]);
        await a.capturePrisoner(general('gao-shun'), TALLY_UID);
        await a.advanceSeason();
        await a.save();

        const b = await reloadThrough(adapter, () => 0);
        assert.equals(1, b.prison.pending.length);
        const resolution = await b.resolvePrisoner('gao-shun', 'persuade');
        assert.isTrue(resolution !== null && resolution.joined);
        assert.equals('gao-shun', b.tallyHoldings[TALLY_UID]);
        assert.isTrue(b.roster.some(g => g.id === 'gao-shun'));

        await b.save();
        const c = await reloadThrough(adapter, () => 0);
        assert.equals('gao-shun', c.tallyHoldings[TALLY_UID]);
    });

    suite.test('勸降失敗：虎符留在君主手上，俘虜仍待處置並保留虎符紀錄', async () => {
        const adapter = new MemoryStorageAdapter();
        const a = newSession(adapter, () => 0.999);
        await a.registerTallyCards([tallyCard(TALLY_UID)]);
        await a.capturePrisoner(general('gao-shun'), TALLY_UID);
        await a.advanceSeason();
        const resolution = await a.resolvePrisoner('gao-shun', 'persuade');
        assert.isFalse(resolution !== null && resolution.joined);
        assert.isTrue(a.tallyHoldings[TALLY_UID] === null);
        assert.equals(TALLY_UID, a.prison.pending[0].tallyId);
    });

    suite.test('放走：君主持有的虎符跟著他離開，持有關係與卡表都移除', async () => {
        const adapter = new MemoryStorageAdapter();
        const a = newSession(adapter, () => 0);
        await a.registerTallyCards([tallyCard(TALLY_UID)]);
        await a.capturePrisoner(general('gao-shun'), TALLY_UID);
        await a.advanceSeason();
        await a.resolvePrisoner('gao-shun', 'release');
        assert.isFalse(TALLY_UID in a.tallyHoldings);
        assert.isFalse(TALLY_UID in a.tallyCards);
    });

    suite.test('放走但虎符已由我方武將持有：不動，武將仍持有', async () => {
        const adapter = new MemoryStorageAdapter();
        const a = newSession(adapter, () => 0);
        await a.registerTallyCards([tallyCard(TALLY_UID)]);
        await a.equipTally(TALLY_UID, 'lead');
        await a.capturePrisoner(general('gao-shun'), TALLY_UID);
        await a.advanceSeason();
        await a.resolvePrisoner('gao-shun', 'release');
        assert.equals('lead', a.tallyHoldings[TALLY_UID]);
    });

    suite.test('沒有記錄虎符的俘虜：勸降成功或放走都不轉移任何虎符', async () => {
        const adapter = new MemoryStorageAdapter();
        const a = newSession(adapter, () => 0);
        await a.registerTallyCards([tallyCard(TALLY_UID)]);
        await a.capturePrisoner(general('gao-shun'));
        await a.advanceSeason();
        await a.resolvePrisoner('gao-shun', 'persuade');
        assert.isTrue(a.tallyHoldings[TALLY_UID] === null);
        assert.isTrue(a.prison.pending.length === 0);
    });

    return suite;
}
