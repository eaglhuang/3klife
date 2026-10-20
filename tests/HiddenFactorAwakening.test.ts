/**
 * HiddenFactorAwakening.test.ts — 里程碑隱藏因子覺醒（REC-06 / PROG-2-0711）headless 測試
 *
 * 鎖住：里程碑對應到正確的隱藏因子 id；重複達成不重複加入；已擁有的因子不重複；
 * 出征達成「不敗神話」後武將基因帶上 gene_hidden_undefeated，之後再勝不會重複。
 */
import { assert, TestSuite } from './TestRunner';
import { awakenHiddenFactors, hiddenFactorIdsForMilestones } from '../assets/scripts/core/systems/HiddenFactorAwakening';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function general(extra: Record<string, unknown> = {}): GeneralConfig {
    return { id: 'hero', name: '關羽', faction: 'shu', gender: '男', age: 30, hp: 1000, vitality: 100, maxVitality: 100, str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk: 40, ...extra } as unknown as GeneralConfig;
}

export function createHiddenFactorAwakeningSuite(): TestSuite {
    const suite = new TestSuite('HiddenFactorAwakening (里程碑隱藏因子 REC-06)');

    suite.test('里程碑對應正確的隱藏因子 id；無關的里程碑沒有因子', () => {
        assert.equals('gene_hidden_undefeated', hiddenFactorIdsForMilestones(['UNDEFEATED_50']).join(','));
        assert.equals('gene_hidden_iron_wall', hiddenFactorIdsForMilestones(['GUARDIAN_WALL']).join(','));
        assert.equals('gene_hidden_killing_intent', hiddenFactorIdsForMilestones(['ASURA']).join(','));
        assert.equals('', hiddenFactorIdsForMilestones(['KILL_100']).join(','));
    });

    suite.test('加入隱藏因子；已擁有的不重複；原武將不被改寫', () => {
        const base = general({ genes: [{ id: 'gene_hidden_undefeated', level: 1 }] });
        const next = awakenHiddenFactors(base, ['UNDEFEATED_50', 'GUARDIAN_WALL']);
        assert.equals('gene_hidden_undefeated,gene_hidden_iron_wall', (next.genes ?? []).map((g) => g.id).join(','));
        assert.equals(1, (base.genes ?? []).length, '傳入的武將不應被改寫');
        assert.equals(base, awakenHiddenFactors(base, []), '沒有隱藏因子里程碑時原樣回傳');
    });

    suite.test('出征達成不敗神話後基因帶上不敗因子，之後再勝不重複加入', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = new GameSession();
        session.setRosterStore(new InMemoryRosterStore([general()]));
        session.setSaveService(new PlayerSaveService(adapter));
        session.startNewGame(20261020);
        session.setRandomSource(() => 0.99);
        for (let i = 0; i < 50; i += 1) {
            await session.recordBattle(['hero'], 'player-win');
        }
        const hero = session.roster.find((g) => g.id === 'hero');
        const countUndefeated = () => (hero?.genes ?? []).filter((g) => g.id === 'gene_hidden_undefeated').length;
        assert.equals(1, countUndefeated(), '五十戰不敗後應有一個不敗因子');
        await session.recordBattle(['hero'], 'player-win');
        assert.equals(1, (session.roster.find((g) => g.id === 'hero')?.genes ?? []).filter((g) => g.id === 'gene_hidden_undefeated').length, '之後不重複加入');
    });

    return suite;
}
