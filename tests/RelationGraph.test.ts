/**
 * RelationGraph.test.ts — 關係圖鑑網絡圖資料 headless 測試（家族關係 §E-6，PROG-2-1728）
 *
 * Unity 對照：EditMode Test 直接驗證 Graph Model 的節點、連線與座標。
 */
import { assert, TestSuite } from './TestRunner';
import { HistoricalPairTable } from '../assets/scripts/core/systems/HistoricalPairs';
import { DynamicRelationBook } from '../assets/scripts/core/systems/KinDynamicRelations';
import { buildRelationGraph, radialPositions } from '../assets/scripts/core/systems/RelationGraph';

function table(): HistoricalPairTable {
    const base = { epBonus: 0, extraEffects: {} };
    return HistoricalPairTable.load({
        relations: [
            { ...base, relationId: 'R1', templateA: 'liu-bei', templateB: 'guan-yu', type: 'SWORN', loreKey: 'L1' },
            { ...base, relationId: 'R2', templateA: 'zhang-fei', templateB: 'liu-bei', type: 'SWORN', loreKey: 'L2' },
            { ...base, relationId: 'R3', templateA: 'zhuge-liang', templateB: 'sima-yi', type: 'RIVAL', loreKey: 'L3' },
        ],
    }).table;
}

export function createRelationGraphSuite(): TestSuite {
    const suite = new TestSuite('RelationGraph (家族關係 §E-6 關係圖鑑)');

    suite.test('史實配對表可列出某武將的所有關係（順序無關）', () => {
        assert.equals('R1,R2', table().relationsOf('liu-bei').map((r) => r.relationId).join(','));
        assert.equals(0, table().relationsOf('cao-cao').length);
    });

    suite.test('沒有任何關係時只有中心、沒有節點', () => {
        const graph = buildRelationGraph('cao-cao', table(), []);
        assert.equals('cao-cao', graph.centerId);
        assert.equals(0, graph.nodes.length);
    });

    suite.test('史實與動態關係合併到同一節點；先史實後動態、同類依 id 排序', () => {
        const book = new DynamicRelationBook();
        book.record('battle-comrade', 'liu-bei', 'guan-yu', 3);
        book.record('battle-comrade', 'zhao-yun', 'liu-bei', 4);
        const graph = buildRelationGraph('liu-bei', table(), book.listFor('liu-bei'));
        assert.equals('guan-yu,zhang-fei,zhao-yun', graph.nodes.map((n) => n.id).join(','));
        const guan = graph.nodes[0];
        assert.equals('historical:SWORN,dynamic:COMRADE', guan.edges.map((e) => `${e.kind}:${e.type}`).join(','));
        assert.equals(null, guan.edges[0].intimacy);
        assert.equals(true, guan.edges[1].active);
    });

    suite.test('動態關係親密度歸 0 標為未生效；不屬於中心的關係被忽略', () => {
        const relations = [
            { uidA: 'liu-bei', uidB: 'zhao-yun', type: 'COMRADE' as const, intimacy: 0, createdSeason: 1, decayRate: 2 },
            { uidA: 'cao-cao', uidB: 'zhao-yun', type: 'COMRADE' as const, intimacy: 30, createdSeason: 1, decayRate: 2 },
        ];
        const graph = buildRelationGraph('liu-bei', null, relations);
        assert.equals(1, graph.nodes.length);
        assert.equals(false, graph.nodes[0].edges[0].active);
    });

    suite.test('節點平均排在圓周：第一個在正上方、順時針', () => {
        const positions = radialPositions(4, 100).map((p) => `${p.x},${p.y}`);
        assert.equals('0,-100|100,0|0,100|-100,0', positions.join('|'));
        assert.equals(0, radialPositions(0).length);
    });

    return suite;
}
