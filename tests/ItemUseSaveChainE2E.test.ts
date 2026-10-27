/**
 * ItemUseSaveChainE2E.test.ts — 道具使用（刷新券／安胎藥）與初始虎符的存讀檔多季複查（PROG-2-0678）
 *
 * Unity 對照：像按下道具欄的「使用」，確認數量、冷卻時間戳、armed 標記都寫進存檔，重開後行為不變。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { ITEM_FERTILITY, ITEM_FERTILITY_ARMED, ITEM_REFRESH } from '../assets/scripts/core/systems/PlayerInventory';
import { isFemalePoolRefreshDue } from '../assets/scripts/core/systems/FemalePoolRefresh';
import { isRescueRefreshDue } from '../assets/scripts/core/systems/DungeonRescue';

function build(adapter: MemoryStorageAdapter): GameSession {
    const s = new GameSession(5);
    s.setRosterStore(new InMemoryRosterStore([]));
    s.setSaveService(new PlayerSaveService(adapter));
    s.setAutoSave(false);
    s.startNewGame(5);
    return s;
}

const NOW = 1_800_000_000_000;

export function createItemUseSaveChainE2ESuite(): TestSuite {
    const suite = new TestSuite('ItemUseSaveChainE2E (PROG-2-0678 道具使用存讀檔)');

    suite.test('刷新券：用完數量少 1、冷卻立即到期；存讀檔後時間戳與數量一致', async () => {
        const adapter = new MemoryStorageAdapter();
        const a = build(adapter);
        await a.addItem(ITEM_REFRESH, 2);
        // 先讓兩個冷卻都剛刷新過
        a.refreshFemalePoolIfDue([], NOW, () => 0.5);
        a.rollDungeonRescueIfDue(NOW, () => 0.5);
        assert.isFalse(isFemalePoolRefreshDue(a.femaleSystemState.poolRefreshedAtMs!, NOW));

        const result = a.useItem(ITEM_REFRESH, NOW);
        assert.isTrue(result.ok);
        assert.equals(1, a.itemCount(ITEM_REFRESH));
        assert.isTrue(isFemalePoolRefreshDue(a.femaleSystemState.poolRefreshedAtMs!, NOW));
        assert.isTrue(isRescueRefreshDue(a.femaleSystemState.rescueRefreshedAtMs!, NOW));
        await a.save();

        const b = build(adapter);
        assert.isTrue(await b.load());
        assert.equals(1, b.itemCount(ITEM_REFRESH));
        assert.equals(a.femaleSystemState.poolRefreshedAtMs!, b.femaleSystemState.poolRefreshedAtMs!);
        assert.isTrue(isRescueRefreshDue(b.femaleSystemState.rescueRefreshedAtMs!, NOW));
    });

    suite.test('刷新券用光後再用：被拒絕且不改冷卻與數量', async () => {
        const a = build(new MemoryStorageAdapter());
        a.rollDungeonRescueIfDue(NOW, () => 0.5);
        const before = a.femaleSystemState.rescueRefreshedAtMs;
        const result = a.useItem(ITEM_REFRESH, NOW);
        assert.isFalse(result.ok);
        assert.equals(before!, a.femaleSystemState.rescueRefreshedAtMs!);
    });

    suite.test('安胎藥：用一張記 armed，存讀檔保留，已 armed 再用被拒絕，結緣後清除', async () => {
        const adapter = new MemoryStorageAdapter();
        const a = build(adapter);
        await a.addItem(ITEM_FERTILITY, 2);
        assert.isTrue(a.useItem(ITEM_FERTILITY, NOW).ok);
        assert.equals(1, a.itemCount(ITEM_FERTILITY));
        assert.equals(1, a.itemCount(ITEM_FERTILITY_ARMED));
        const second = a.useItem(ITEM_FERTILITY, NOW);
        assert.isFalse(second.ok);
        assert.equals(1, a.itemCount(ITEM_FERTILITY));
        await a.save();

        const b = build(adapter);
        assert.isTrue(await b.load());
        assert.equals(1, b.itemCount(ITEM_FERTILITY_ARMED));
        b.clearFertilityArm();
        assert.equals(0, b.itemCount(ITEM_FERTILITY_ARMED));
        b.clearFertilityArm();
        assert.equals(0, b.itemCount(ITEM_FERTILITY_ARMED));
        assert.equals(1, b.itemCount(ITEM_FERTILITY));
    });

    suite.test('初始虎符：只寫一次，存讀檔保留，重開新局清掉', async () => {
        const adapter = new MemoryStorageAdapter();
        const a = build(adapter);
        const first = a.completeTeachingBattle({ spiritId: 'S1', spiritName: '趙雲', geneIds: ['A', 'B'] })!;
        a.completeTeachingBattle({ spiritId: 'S2', spiritName: '關羽', geneIds: ['C'] });
        assert.equals('S1', a.startingTalisman!.sourceSpiritId);
        await a.advanceSeason();
        await a.save();

        const b = build(adapter);
        assert.isTrue(await b.load());
        assert.equals(first.sourceSpiritId, b.startingTalisman!.sourceSpiritId);

        b.startNewGame(9);
        assert.isTrue(b.startingTalisman === null);
    });

    return suite;
}
