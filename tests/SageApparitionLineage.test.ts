/**
 * SageApparitionLineage — 名士占卜接上祖輩顯靈（ORAC-08，PROG-2-1981，headless）
 */
import { TestSuite, assert } from './TestRunner';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { apparitionAncestorsOf, apparitionForDivination } from '../assets/scripts/core/systems/SageApparitionLineage';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function seq(...values: number[]): () => number {
    let n = 0;
    return () => values[Math.min(n++, values.length - 1)];
}

function person(id: string, extra: Record<string, unknown> = {}): GeneralConfig {
    return {
        id, name: id, faction: 'wei', gender: '男', age: 30, hp: 1000, vitality: 100, maxVitality: 100,
        str: 50, int: 90, lea: 60, pol: 80, cha: 60, luk: 40, genes: [], ...extra,
    } as unknown as GeneralConfig;
}

function family(): GeneralConfig[] {
    return [
        person('child', {
            fatherId: 'dad', motherId: 'mom',
            genes: [{ id: 'gene_command', type: 'blue', level: 2, isLocked: true, discoveryLevel: 1 }],
        }),
        person('dad', { fatherId: 'gpa' }),
        person('mom'),
        person('gpa', { name: '曹操', templateId: 'GEN_WEI_CAO_CAO' }),
    ];
}

export function createSageApparitionLineageSuite(): TestSuite {
    const suite = new TestSuite('SageApparitionLineage（ORAC-08 祖輩顯靈接占卜 PROG-2-1981）');

    suite.test('祖先順序：父、母，再祖父母；名冊查不到的跳過', () => {
        const roster = family();
        assert.equals('dad,mom,曹操', apparitionAncestorsOf(roster[0], roster).map((a) => a.name).join());
        assert.equals(0, apparitionAncestorsOf(roster[3], roster).length);
    });

    suite.test('命中祖父名將模板 → 曹家顯靈；沒有祖先回 null', () => {
        const roster = family();
        const hit = apparitionForDivination(roster[0], roster);
        assert.equals('曹操', hit!.ancestorName);
        assert.equals(null, apparitionForDivination(roster[3], roster));
    });

    suite.test('GameSession.divineFactor：有擲骰才附 apparition，結果與擲骰次數不變', async () => {
        const session = new GameSession(7);
        session.setRosterStore(new InMemoryRosterStore(family()));
        session.setSaveService(new PlayerSaveService(new MemoryStorageAdapter()));
        let calls = 0;
        const rnd = seq(0, 0);
        session.setRandomSource(() => { calls++; return rnd(); });
        const r = await session.divineFactor('child', 'sima-hui');
        assert.isTrue(r.consumed);
        assert.equals('awakened', r.outcome);
        assert.equals('曹操', r.apparition!.ancestorName);
        assert.isTrue(calls > 0);
        const none = await session.divineFactor('child', 'nobody');
        assert.equals(undefined, none.apparition);
    });
    return suite;
}
