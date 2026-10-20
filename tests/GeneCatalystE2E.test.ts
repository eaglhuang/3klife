/**
 * GeneCatalystE2E.test.ts — 因子媒介（BLT-10）注入子嗣 × 存讀檔（QA，PROG-2-0620）
 *
 * Unity 對照：像 PlayMode 測試——對真實名冊裡的退役武將注入子嗣，存檔重開後「已用過」標記還在、不能再用第二次。
 */
import { assert, TestSuite } from './TestRunner';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { injectCatalystFactor, markCatalystUsed } from '../assets/scripts/core/systems/GeneCatalyst';

function gen(id: string, geneIds: string[]): GeneralConfig {
    return { id, name: id, genes: geneIds.map((gid) => ({ id: gid, type: 'Red' })) } as GeneralConfig;
}

function sessionWith(storage: MemoryStorageAdapter, roster: GeneralConfig[]): GameSession {
    const session = new GameSession(3);
    session.setRosterStore(new InMemoryRosterStore(roster));
    session.setSaveService(new PlayerSaveService(storage));
    return session;
}

export function createGeneCatalystE2ESuite(): TestSuite {
    const suite = new TestSuite('GeneCatalystE2E (因子媒介注入 × 存讀檔)');

    suite.test('注入命中後標記退役武將已用，存讀檔後標記還在，再注入回 ALREADY_USED 且不擲骰', async () => {
        const storage = new MemoryStorageAdapter();
        const store = new InMemoryRosterStore([gen('retired', ['F1', 'F2']), gen('child', ['F1'])]);
        const first = sessionWith(storage, []);
        first.setRosterStore(store);
        const retired = first.roster.find((g) => g.id === 'retired')!;
        const child = first.roster.find((g) => g.id === 'child')!;

        const result = injectCatalystFactor(retired, child, () => 0);
        assert.equals('F2', result.injectedFactorId as string);
        assert.isTrue(result.consumed);
        const marked = markCatalystUsed(retired);
        store.replaceAll([marked, result.child]);
        await first.save();

        const second = sessionWith(storage, []);
        assert.isTrue(await second.load());
        const retiredAfter = second.roster.find((g) => g.id === 'retired')!;
        const childAfter = second.roster.find((g) => g.id === 'child')!;
        assert.equals('F1,F2', (childAfter.genes ?? []).map((g) => g.id).join(','));
        assert.isTrue(retiredAfter.catalystUsed === true);

        let rolled = false;
        const again = injectCatalystFactor(retiredAfter, gen('child2', []), () => { rolled = true; return 0; });
        assert.equals('ALREADY_USED', again.reason as string);
        assert.isFalse(again.consumed);
        assert.isFalse(rolled, '已用過不擲骰');
    });

    suite.test('沒命中也算消耗：標記用掉後同一退役武將不能再試第二次', async () => {
        const retired = gen('retired', ['F9']);
        const miss = injectCatalystFactor(retired, gen('child', []), () => 0.99);
        assert.equals(null, miss.injectedFactorId);
        assert.isTrue(miss.consumed);
        const marked = markCatalystUsed(retired);
        const retry = injectCatalystFactor(marked, gen('child', []), () => 0);
        assert.equals('ALREADY_USED', retry.reason as string);
    });

    suite.test('機率邊界：基礎 0.5 加 0.25 = 0.75，擲骰 0.74 命中、0.75 不中', () => {
        const retired = gen('retired', ['F5']);
        assert.equals('F5', injectCatalystFactor(retired, gen('c', []), () => 0.74).injectedFactorId as string);
        assert.equals(null, injectCatalystFactor(retired, gen('c', []), () => 0.75).injectedFactorId);
    });

    return suite;
}
