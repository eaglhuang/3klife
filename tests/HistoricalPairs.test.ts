import { TestSuite, assert } from './TestRunner';
import {
    affinityResolverOf,
    conceptionModBetween,
    HistoricalPairTable,
} from '../assets/scripts/core/systems/HistoricalPairs';
import { BloodlineGraph } from '../assets/scripts/core/services/BloodlineGraph';
import { BreedingService } from '../assets/scripts/core/services/BreedingService';
import { InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import type { BreedingGeneral } from '../assets/scripts/core/systems/BreedingSystem';

function readProvisionalTable(): unknown {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as typeof import('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path') as typeof import('path');
    const root = path.resolve(__dirname, '..');
    return JSON.parse(fs.readFileSync(path.join(root, 'assets/resources/data/historical-relations.json'), 'utf8'));
}

function parent(id: string, sex: '男' | '女'): BreedingGeneral {
    return {
        id, name: id, faction: 'shu', gender: sex, age: 30, hp: 1000, vitality: 200, maxVitality: 200,
        str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk: 0,
    } as unknown as BreedingGeneral;
}

function graphFor(ids: string[]): BloodlineGraph {
    const graph = new BloodlineGraph();
    const person = (uid: string) => ({ uid, template_id: null, name: uid, gene_refs: [] as string[], ep_base: 50, faction: 'shu', is_virtual: false });
    graph.loadFromData({ version: 't', updatedAt: 't', persons: ids.map(person), links: [] });
    return graph;
}

export function createHistoricalPairsSuite(): TestSuite {
    const suite = new TestSuite('HistoricalPairs (KIN-02 配對表 / KIN-04 契合與宿敵受孕率)');

    suite.test('暫定名單全數通過驗證，無略過', () => {
        const { table, loaded, skipped } = HistoricalPairTable.load(readProvisionalTable());
        assert.equals(6, loaded);
        assert.equals(0, skipped);
        assert.equals(6, table.size());
    });

    suite.test('查表順序無關；沒有配對回傳 null', () => {
        const { table } = HistoricalPairTable.load(readProvisionalTable());
        assert.isTrue(table.relationBetween('xiao-qiao', 'zhou-yu')?.type === 'COUPLE');
        assert.isTrue(table.relationBetween('guan-yu', 'liu-bei')?.type === 'SWORN');
        assert.isTrue(table.relationBetween('lu-bu', 'diao-chan') === null);
    });

    suite.test('契合：夫妻與義兄弟算契合；宿敵不算；無配對為 false', () => {
        const { table } = HistoricalPairTable.load(readProvisionalTable());
        const resolve = affinityResolverOf(table);
        assert.isTrue(resolve(parent('zhou-yu', '男'), parent('xiao-qiao', '女')));
        assert.isTrue(resolve(parent('guan-yu', '男'), parent('zhang-fei', '男')));
        assert.isFalse(resolve(parent('cao-cao', '男'), parent('liu-bei', '男')));
        assert.isFalse(resolve(parent('lu-bu', '男'), parent('diao-chan', '女')));
    });

    suite.test('受孕率倍率：宿敵 0.7、夫妻 1.2，無配對為 1', () => {
        const { table } = HistoricalPairTable.load(readProvisionalTable());
        assert.equals(0.7, conceptionModBetween(table, 'cao-cao', 'liu-bei'));
        assert.equals(1.2, conceptionModBetween(table, 'liu-bei', 'sun-shang-xiang'));
        assert.equals(1, conceptionModBetween(table, 'lu-bu', 'diao-chan'));
    });

    suite.test('載入時略過無效與同一對重複的項目', () => {
        const valid = { relationId: 'R1', templateA: 'a', templateB: 'b', type: 'COUPLE', epBonus: 25, extraEffects: {}, loreKey: 'L' };
        const dup = { ...valid, relationId: 'R2', templateA: 'b', templateB: 'a' };
        const bad = { ...valid, relationId: 'R3', templateA: 'c', templateB: 'c' };
        const result = HistoricalPairTable.load([valid, dup, bad, null]);
        assert.equals(1, result.loaded);
        assert.equals(3, result.skipped);
        assert.equals(1, result.table.size());
    });

    suite.test('BreedingService 讀取表：契合 +25，宿敵降低受孕率、夫妻不降', () => {
        const { table } = HistoricalPairTable.load(readProvisionalTable());
        const ids = ['cao-cao', 'liu-bei', 'zhou-yu', 'xiao-qiao', 'lu-bu', 'diao-chan'];
        const makeService = (fatherId: string, motherId: string) => {
            const store = new InMemoryRosterStore([parent(fatherId, '男'), parent(motherId, '女')] as never);
            // 第一次擲骰給受孕判定；之後固定為 0.75
            let calls = 0;
            return new BreedingService(store, graphFor(ids), {
                random: () => (calls++ === 0 ? 0 : 0.75),
                historicalPairs: table,
            });
        };

        const couple = makeService('zhou-yu', 'xiao-qiao');
        assert.equals(25, couple.previewEp('zhou-yu', 'xiao-qiao').affinity);
        const coupleBreed = couple.breed('zhou-yu', 'xiao-qiao');
        assert.isTrue(coupleBreed.conceptionRate > 0);

        const rival = makeService('cao-cao', 'liu-bei');
        assert.equals(0, rival.previewEp('cao-cao', 'liu-bei').affinity);
        const rivalBreed = rival.breed('cao-cao', 'liu-bei');
        const plain = makeService('lu-bu', 'diao-chan');
        const plainBreed = plain.breed('lu-bu', 'diao-chan');
        assert.isTrue(rivalBreed.conceptionRate < plainBreed.conceptionRate, '宿敵的受孕率低於無配對');
        assert.isTrue(Math.abs(rivalBreed.conceptionRate - plainBreed.conceptionRate * 0.7) < 1e-9, '宿敵為無配對的 0.7 倍');
    });

    suite.test('惰性表：建立服務時表尚未載入，之後載入即生效；未載入前契合為 0', () => {
        let table: HistoricalPairTable | undefined;
        const store = new InMemoryRosterStore([parent('zhou-yu', '男'), parent('xiao-qiao', '女')] as never);
        const service = new BreedingService(store, graphFor(['zhou-yu', 'xiao-qiao']), {
            random: () => 0.5,
            getHistoricalPairs: () => table,
        });
        assert.equals(0, service.previewEp('zhou-yu', 'xiao-qiao').affinity);
        table = HistoricalPairTable.load(readProvisionalTable()).table;
        assert.equals(25, service.previewEp('zhou-yu', 'xiao-qiao').affinity);
    });

    return suite;
}
