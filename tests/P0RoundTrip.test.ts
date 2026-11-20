/**
 * P0RoundTrip.test.ts — WBS v4 待接線 P0 的存讀往返測試（VIT-01 精力/待產、FATE-01 職能/宿命）
 *
 * Unity 對照：EditMode Test 驗證 ScriptableObject 序列化後欄位不遺失。
 */
import { assert, TestSuite } from './TestRunner';
import { PREGNANCY_LOCK_SEASONS } from '../assets/scripts/core/systems/BreedingSystem';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function mother(extra: Record<string, unknown> = {}): GeneralConfig {
    return {
        id: 'mother', name: 'mother', faction: 'shu', hp: 1000, age: 30, gender: '女',
        vitality: 42, maxVitality: 100, pregnancySeasonsLeft: 2,
        primaryClass: 'Scholar', subClass: 'Warrior', careerClass: 'Scholar',
        fate: { recommended: 'Scholar', choice: 'defy', lateBloomer: true },
        ...extra,
    } as unknown as GeneralConfig;
}

export function createP0RoundTripSuite(): TestSuite {
    const suite = new TestSuite('P0RoundTrip (VIT-01 / FATE-01 存讀往返)');

    suite.test('VIT-01：精力與待產季數存檔後讀回不變', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = new GameSession();
        session.setRosterStore(new InMemoryRosterStore([mother()]));
        session.setSaveService(new PlayerSaveService(adapter));
        await session.save();

        const restored = new GameSession();
        restored.setRosterStore(new InMemoryRosterStore());
        restored.setSaveService(new PlayerSaveService(adapter));
        assert.isTrue(await restored.load());
        const general = restored.roster.find((g) => g.id === 'mother') as GeneralConfig & { pregnancySeasonsLeft?: number };
        assert.equals(42, general.vitality!);
        assert.equals(100, general.maxVitality!);
        assert.equals(2, general.pregnancySeasonsLeft!);
    });

    suite.test('PROG-2-9180：舊存檔剩餘待產季數 > 2 時，載入應夾到 2 季', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = new GameSession();
        session.setRosterStore(new InMemoryRosterStore([mother({ pregnancySeasonsLeft: 4 })]));
        session.setSaveService(new PlayerSaveService(adapter));
        await session.save();

        const restored = new GameSession();
        restored.setRosterStore(new InMemoryRosterStore());
        restored.setSaveService(new PlayerSaveService(adapter));
        assert.isTrue(await restored.load());
        const general = restored.roster.find((g) => g.id === 'mother') as GeneralConfig & { pregnancySeasonsLeft?: number };
        assert.equals(2, general.pregnancySeasonsLeft!);
    });

    suite.test('PROG-2-9180：breeding-rules.json 與程式常數 PREGNANCY_LOCK_SEASONS 同為 2', () => {
        const fs = require('fs') as typeof import('fs');
        const path = require('path') as typeof import('path');
        const raw = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../assets/resources/data/breeding-rules.json'), 'utf8'));
        assert.equals(2, raw.pregnancyLockSeasons);
        assert.equals(raw.pregnancyLockSeasons, PREGNANCY_LOCK_SEASONS);
    });

    suite.test('FATE-01：職能欄位與宿命狀態存檔後讀回不變', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = new GameSession();
        session.setRosterStore(new InMemoryRosterStore([mother()]));
        session.setSaveService(new PlayerSaveService(adapter));
        await session.save();

        const restored = new GameSession();
        restored.setRosterStore(new InMemoryRosterStore());
        restored.setSaveService(new PlayerSaveService(adapter));
        assert.isTrue(await restored.load());
        const general = restored.roster.find((g) => g.id === 'mother') as GeneralConfig & {
            primaryClass?: string; subClass?: string; careerClass?: string;
            fate?: { recommended: string; choice?: string; lateBloomer?: boolean };
        };
        assert.equals('Scholar', general.primaryClass!);
        assert.equals('Warrior', general.subClass!);
        assert.equals('Scholar', general.careerClass!);
        assert.equals('Scholar', general.fate!.recommended);
        assert.equals('defy', general.fate!.choice!);
        assert.isTrue(general.fate!.lateBloomer === true);
    });

    return suite;
}
