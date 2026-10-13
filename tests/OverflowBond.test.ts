/**
 * OverflowBond.test.ts — 滿轉溢出轉結義點數 headless 測試（PROG-2-0315 / WBS GCH-06）
 *
 * Unity 對照：EditMode Test 驗證掉落表查表結果，再用 GameSession 驗證餘額與存讀檔。
 */
import { assert, TestSuite } from './TestRunner';
import {
    BOND_POINTS_BY_RARITY,
    normalizeBondPoints,
    overflowBondPoints,
    overflowRarityOf,
} from '../assets/scripts/core/systems/OverflowBond';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function general(id: string, extra: Partial<GeneralConfig> = {}): GeneralConfig {
    return { id, name: id, faction: 'shu', hp: 1000, age: 25, ...extra } as unknown as GeneralConfig;
}

export function createOverflowBondSuite(): TestSuite {
    const suite = new TestSuite('OverflowBond (溢出結義點數 GCH-06)');

    suite.test('溢出獎勵依稀有度查表，與傭兵結義費用表一致', () => {
        assert.equals(100, BOND_POINTS_BY_RARITY.common);
        assert.equals(300, overflowBondPoints('rare'));
        assert.equals(600, overflowBondPoints('epic'));
        assert.equals(1200, overflowBondPoints('legendary'));
        assert.equals(1200, overflowBondPoints('mythic'));
        assert.equals(100, overflowBondPoints('unknown-tier'));
        assert.equals(100, overflowBondPoints(undefined));
    });

    suite.test('稀有度推斷：明確 rarityTier 優先，否則依 characterCategory', () => {
        assert.equals('mythic', overflowRarityOf({ rarityTier: 'mythic', characterCategory: 'civilian' }));
        assert.equals('epic', overflowRarityOf({ characterCategory: 'famed' }));
        assert.equals('legendary', overflowRarityOf({ characterCategory: 'titled' }));
        assert.equals('rare', overflowRarityOf({ characterCategory: 'general' }));
        assert.equals('common', overflowRarityOf({}));
    });

    suite.test('存檔讀回的結義點數：非數字、負數為 0，小數捨去', () => {
        assert.equals(0, normalizeBondPoints(undefined));
        assert.equals(0, normalizeBondPoints(-5));
        assert.equals(0, normalizeBondPoints('abc'));
        assert.equals(12, normalizeBondPoints(12.9));
    });

    suite.test('滿轉溢出：依稀有度加結義點數，未溢出的轉生不加', async () => {
        const session = new GameSession();
        session.setRosterStore(new InMemoryRosterStore([
            general('max', { rebirthCount: 5, characterCategory: 'famed' }), // famed → epic 600
            general('rising', { rebirthCount: 2 }),
        ]));
        const result = await session.addGenerals([general('max'), general('rising')], { rebirthOnDuplicate: true });
        assert.equals(600, result.bondPointsGained);
        assert.equals(600, session.bondPoints);
    });

    suite.test('同批多次溢出時逐筆累加結義點數', async () => {
        const session = new GameSession();
        session.setRosterStore(new InMemoryRosterStore([general('max', { rebirthCount: 5, rarityTier: 'rare' })]));
        const result = await session.addGenerals([general('max'), general('max')], { rebirthOnDuplicate: true });
        assert.equals(600, result.bondPointsGained);
        assert.equals(600, session.bondPoints);
    });

    suite.test('未啟用轉生（俘虜招募）：溢出不發結義點數', async () => {
        const session = new GameSession();
        session.setRosterStore(new InMemoryRosterStore([general('max', { rebirthCount: 5, rarityTier: 'rare' })]));
        const result = await session.addGenerals([general('max')]);
        assert.equals(0, result.bondPointsGained);
        assert.equals(0, session.bondPoints);
    });

    suite.test('結義點數寫入存檔，讀檔後餘額不變；舊檔沒有欄位視為 0', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = new GameSession();
        session.setRosterStore(new InMemoryRosterStore([general('max', { rebirthCount: 5, rarityTier: 'rare' })]));
        session.setSaveService(new PlayerSaveService(adapter));
        await session.addGenerals([general('max')], { rebirthOnDuplicate: true });
        await session.save();

        const restored = new GameSession();
        restored.setRosterStore(new InMemoryRosterStore());
        restored.setSaveService(new PlayerSaveService(adapter));
        assert.isTrue(await restored.load());
        assert.equals(300, restored.bondPoints);
    });

    return suite;
}
