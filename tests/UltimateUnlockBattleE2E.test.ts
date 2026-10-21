/**
 * UltimateUnlockBattleE2E.test.ts — 轉生解鎖奧義欄位（ULT-03）到戰場出招清單的真實流程（QA，PROG-2-0662）
 *
 * Unity 對照：像在 PlayMode 裡連抽同一位武將讓他轉生，再開戰看技能列有沒有隨轉數一格一格亮起來，
 * 而不是一開始五招全開。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { services } from '../assets/scripts/core/managers/ServiceLoader';
import { GeneralUnit, type GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { buildUltimateSkills } from '../assets/scripts/battle/views/BattleSceneLoader';

function hero(): GeneralConfig {
    return {
        id: 'ult-hero', name: 'ult-hero', faction: 'player', gender: '男', age: 25, hp: 1000, vitality: 100, maxVitality: 100, maxLifespan: 120,
        str: 70, int: 60, lea: 60, pol: 50, cha: 50, luk: 40, careerClass: 'Warrior', role: 'Combat', rarityTier: 'epic',
        skillId: 'cao-cao-tactics',
        ultimateSlots: [1, 2, 3, 4, 5].map((n) => ({ slot: n, ultimateId: `ult-${n}`, unlockReincarnation: n })),
    } as unknown as GeneralConfig;
}

export function createUltimateUnlockBattleE2ESuite(): TestSuite {
    const suite = new TestSuite('UltimateUnlockBattleE2E (轉生解鎖奧義→戰場出招清單 PROG-2-0662)');

    suite.test('新武將（1 轉）戰場只有奧義 1，不是五招全開', () => {
        services().initialize();
        const skills = buildUltimateSkills(new GeneralUnit(hero()));
        assert.equals(1, skills.length);
        assert.equals('ult-1', skills[0].ultimateId);
    });

    suite.test('連抽到同一位武將轉生：奧義逐格解鎖，戰場清單隨轉數增加，存讀檔後不變', async () => {
        services().initialize();
        const adapter = new MemoryStorageAdapter();
        const make = (): GameSession => {
            const s = new GameSession();
            s.setRosterStore(new InMemoryRosterStore([]));
            s.setSaveService(new PlayerSaveService(adapter));
            s.setAutoSave(false);
            s.startNewGame(7);
            return s;
        };
        const session = make();
        await session.addGenerals([hero()], { rebirthOnDuplicate: true });
        const countFor = (s: GameSession): number => {
            const cfg = s.roster.find((g) => g.id === 'ult-hero');
            assert.isDefined(cfg);
            return buildUltimateSkills(new GeneralUnit(cfg as GeneralConfig)).length;
        };
        assert.equals(1, countFor(session));
        await session.addGenerals([hero()], { rebirthOnDuplicate: true });
        assert.equals(2, countFor(session), '2 轉 → 2 招');
        await session.addGenerals([hero(), hero()], { rebirthOnDuplicate: true });
        assert.equals(4, countFor(session), '同批兩張重複 → 4 轉 → 4 招');
        await session.save();
        const restored = make();
        assert.isTrue(await restored.load());
        assert.equals(4, countFor(restored));
    });

    return suite;
}
