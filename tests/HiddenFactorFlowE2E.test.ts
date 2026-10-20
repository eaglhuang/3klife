/**
 * HiddenFactorFlowE2E — 隱藏因子覺醒 × 存讀檔 × 結緣遺傳端到端（QA，PROG-2-0627）
 *
 * Unity 對照：像 PlayMode 測試，打滿五十場不敗拿到隱藏因子，存檔讀回後因子還在、
 * 沒有重複，再讓這位武將當父親結緣，確認隱藏因子專屬本人、不會傳給子嗣。
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { BloodlineGraph } from '../assets/scripts/core/services/BloodlineGraph';
import { breed, type BreedingGeneral } from '../assets/scripts/core/systems/BreedingSystem';
import { buildFactorDictionary, type FactorDictionary } from '../assets/scripts/core/systems/FactorInheritance';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

const dictionary: FactorDictionary = buildFactorDictionary(
    JSON.parse(fs.readFileSync(path.join(process.cwd(), 'assets/resources/data/master/gene-dictionary.json'), 'utf8')),
);

function hero(): GeneralConfig {
    return { id: 'hero', name: '關羽', faction: 'shu', gender: '男', age: 30, hp: 1000, vitality: 100, maxVitality: 100, str: 80, int: 60, lea: 70, pol: 50, cha: 100, luk: 40 } as unknown as GeneralConfig;
}

function lcg(seed: number): () => number {
    let s = seed >>> 0;
    return () => {
        s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
        return s / 4294967296;
    };
}

function newSession(adapter: MemoryStorageAdapter, roster: GeneralConfig[]): GameSession {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore(roster));
    session.setSaveService(new PlayerSaveService(adapter));
    session.setRandomSource(() => 0.99);
    return session;
}

export function createHiddenFactorFlowE2ESuite(): TestSuite {
    const suite = new TestSuite('HiddenFactorFlowE2E (隱藏因子 × 存讀檔 × 結緣)');

    suite.test('五十場不敗後存檔讀檔：隱藏因子還在且只有一個，字典查得到', async () => {
        const adapter = new MemoryStorageAdapter();
        const a = newSession(adapter, [hero()]);
        a.startNewGame(20261020);
        a.setRandomSource(() => 0.99);
        for (let i = 0; i < 50; i += 1) await a.recordBattle(['hero'], 'player-win');
        await a.save();

        const b = newSession(adapter, []);
        assert.isTrue(await b.load());
        const genes = b.roster.find((g) => g.id === 'hero')?.genes ?? [];
        assert.equals(1, genes.filter((g) => g.id === 'gene_hidden_undefeated').length);
        assert.isTrue(dictionary.has('gene_hidden_undefeated'), '字典沒有 gene_hidden_undefeated');
    });

    suite.test('帶隱藏因子的父親結緣：隱藏因子專屬本人不遺傳（字典 isHidden），其餘因子不重複、星級不超過字典上限，父親自己保有', async () => {
        const adapter = new MemoryStorageAdapter();
        const a = newSession(adapter, [hero()]);
        a.startNewGame(20261020);
        a.setRandomSource(() => 0.99);
        for (let i = 0; i < 50; i += 1) await a.recordBattle(['hero'], 'player-win');
        // 五十場戰鬥後精力見底，先補滿再結緣
        const father = { ...a.roster.find((g) => g.id === 'hero'), vitality: 100 } as unknown as BreedingGeneral;
        const mother = { id: 'mom', name: 'mom', faction: 'shu', gender: '女', age: 30, hp: 1000, vitality: 100, maxVitality: 100, str: 60, int: 60, lea: 60, pol: 60, cha: 100, luk: 40 } as unknown as BreedingGeneral;

        let conceived = 0;
        let inherited = 0;
        for (let seed = 1; seed <= 300; seed++) {
            const result = breed({ father, mother, pedigree: new BloodlineGraph(), random: lcg(seed), childId: 'baby', dictionary });
            if (result.outcome !== 'conceived') continue;
            conceived++;
            const genes = result.child!.genes ?? [];
            const ids = genes.map((g) => g.id);
            assert.equals(ids.length, new Set(ids).size, `seed ${seed} 因子重複`);
            for (const gene of genes) {
                assert.isTrue((gene.level ?? 1) <= (dictionary.get(gene.id!)?.maxLevel ?? 5), `seed ${seed} ${gene.id} 星級超過上限`);
            }
            if (ids.includes('gene_hidden_undefeated')) inherited++;
        }
        assert.isTrue(conceived >= 30, `受孕成功只有 ${conceived} 次`);
        assert.equals(0, inherited, '隱藏因子不應遺傳給子嗣（resolveFactorColor 對 isHidden 回 null）');
        assert.isTrue((father.genes ?? []).some((g) => g.id === 'gene_hidden_undefeated'), '結緣不應拿掉父親本人的隱藏因子');
    });

    return suite;
}
