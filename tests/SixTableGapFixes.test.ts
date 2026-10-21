/**
 * SixTableGapFixes — 六表映射剩餘落差修正（QA，PROG-2-0633）
 * 開局武將沒有 status、子嗣開獎後 status=Unveiled、子嗣沒有 role，都要能正常映射、不報錯。
 *
 * Unity 對照：像把 ScriptableObject 轉成 DB 行前，先確認每個「必填欄位」在真實流程產生的資料上都有值。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { LegacyService } from '../assets/scripts/core/services/LegacyService';
import { BreedingService } from '../assets/scripts/core/services/BreedingService';
import { BloodlineGraph } from '../assets/scripts/core/services/BloodlineGraph';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { mapGeneralRows } from '../assets/scripts/core/services/PlayerSaveTableRows';
import { buildFactorDictionary } from '../assets/scripts/core/systems/FactorInheritance';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import type { PlayerSaveSnapshot } from '../assets/scripts/core/services/PlayerSaveService';
import type { UnveilingGeneral } from '../assets/scripts/core/systems/Unveiling';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

const dictionary = buildFactorDictionary(
    JSON.parse(fs.readFileSync(path.join(process.cwd(), 'assets/resources/data/master/gene-dictionary.json'), 'utf8')),
);

function person(id: string, gender: '男' | '女', role: string | undefined): GeneralConfig {
    return {
        id, name: id, faction: 'shu', gender, age: 30, hp: 1000, vitality: 100, maxVitality: 100, maxLifespan: 120,
        str: 80, int: 60, lea: 70, pol: 50, cha: 100, luk: 40, careerClass: 'Warrior',
        genes: [{ id: 'gene_command', level: 3 }],
        ...(role ? { role } : {}),
    } as unknown as GeneralConfig;
}

function rosterSnapshot(roster: Array<Record<string, unknown>>): PlayerSaveSnapshot {
    return { schemaVersion: 1, savedAt: '2026-10-21T00:00:00Z', roster, deck: [], discoveryLevel: 1 } as unknown as PlayerSaveSnapshot;
}

export function createSixTableGapFixesSuite(): TestSuite {
    const suite = new TestSuite('SixTableGapFixes (六表映射剩餘落差 PROG-2-0633)');

    suite.test('status 轉換：空字串、Mystery、Unveiled 都映射成 Active；合法值原樣；未知值仍回報', () => {
        const base = { templateId: 'T', bloodlineId: 'B', vitality: 1, maxVitality: 1, role: 'r' };
        const rows = mapGeneralRows(rosterSnapshot([
            { id: 'a', ...base },
            { id: 'b', ...base, status: 'Mystery' },
            { id: 'c', ...base, status: 'Unveiled' },
            { id: 'd', ...base, status: 'Dead' },
            { id: 'e', ...base, status: 'Whatever' },
        ]));
        assert.equals('Active', rows[0].status);
        assert.equals('Active', rows[1].status);
        assert.equals('Active', rows[2].status);
        assert.equals('Dead', rows[3].status, '合法值不被覆蓋');
        assert.equals('Whatever', rows[4].status, '未知值保留原樣，讓驗證回報');
    });

    suite.test('子嗣繼承父親 role；父親沒有（或不認識）role 時不寫入假值', () => {
        const withRole = new InMemoryRosterStore([person('dad', '男', 'Commander'), person('mom', '女', 'Support')]);
        const a = new BreedingService(withRole, new BloodlineGraph(), { random: () => 0.01, dictionary, currentSeason: () => 1 });
        assert.equals('conceived', a.breed('dad', 'mom').outcome);
        const kid = withRole.getAll().find((g) => g.id !== 'dad' && g.id !== 'mom') as GeneralConfig;
        assert.equals('Combat', kid.role, '舊值 Commander 轉成規格職能 Combat');

        const noRole = new InMemoryRosterStore([person('dad2', '男', undefined), person('mom2', '女', 'Support')]);
        const b = new BreedingService(noRole, new BloodlineGraph(), { random: () => 0.01, dictionary, currentSeason: () => 1 });
        assert.equals('conceived', b.breed('dad2', 'mom2').outcome);
        const kid2 = noRole.getAll().find((g) => g.id !== 'dad2' && g.id !== 'mom2') as GeneralConfig;
        assert.isTrue(kid2.role === undefined, '不憑空補值');
    });

    suite.test('真實流程：開局→結緣→子嗣開獎後存檔，六表映射零錯誤', async () => {
        const adapter = new MemoryStorageAdapter();
        const saveService = new PlayerSaveService(adapter);
        const session = new GameSession();
        const store = new InMemoryRosterStore([person('hero', '男', 'Commander'), person('lady', '女', 'Support')]);
        session.setRosterStore(store);
        session.setSaveService(saveService);
        session.setLifecycle(new LegacyService(adapter));
        session.setEventEmitter({ emit: () => {} });
        session.setRandomSource(() => 0.99);
        session.startNewGame(20261021);
        const breeding = new BreedingService(store, new BloodlineGraph(), { random: () => 0.01, dictionary, currentSeason: () => session.gameTime.totalSeasonsElapsed });
        const childId = breeding.breed('hero', 'lady').child!.id;
        let guard = 0;
        while (!(store.getAll().find((g) => g.id === childId) as UnveilingGeneral).fate && guard++ < 40) await session.advanceSeason();
        assert.equals('Unveiled', (store.getAll().find((g) => g.id === childId) as GeneralConfig & { status?: string }).status, '子嗣已開獎');
        await session.save();
        assert.equals(0, saveService.lastSixTableErrors().length, saveService.lastSixTableErrors().join('；'));
    });

    return suite;
}
