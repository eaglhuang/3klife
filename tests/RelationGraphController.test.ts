/**
 * RelationGraphController.test.ts — 關係圖鑑流程、線段切分與版面節點（KIN-07，PROG-2-2123）
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import type { HistoricalPairTable } from '../assets/scripts/core/systems/HistoricalPairs';
import type { DynamicRelation } from '../assets/scripts/core/systems/KinRelation';
import { offsetRelationEdge, relationEdgeOffset, relationEdgeSegments } from '../assets/scripts/core/systems/RelationGraphView';
import { RELATION_GRAPH_SLOTS, RelationGraphController } from '../assets/scripts/ui/core/RelationGraphController';

const UI_SPEC = path.join(__dirname, '..', 'assets', 'resources', 'ui-spec');

interface SpecNode { id?: string; skinSlot?: string; styleSlot?: string; children?: SpecNode[] }

function collect(node: SpecNode, out: SpecNode[] = []): SpecNode[] {
    out.push(node);
    for (const child of node.children ?? []) collect(child, out);
    return out;
}

function table(pairs: Array<[string, string, string]>): HistoricalPairTable {
    const relations = pairs.map(([templateA, templateB, type]) => ({ templateA, templateB, type }));
    return {
        relationsOf: (id: string) => relations.filter((r) => r.templateA === id || r.templateB === id),
    } as unknown as HistoricalPairTable;
}

function dynamic(uidA: string, uidB: string, type: string, intimacy: number): DynamicRelation {
    return { uidA, uidB, type, intimacy, createdSeason: 0, decayRate: 0 } as unknown as DynamicRelation;
}

function controller(
    pairs: Array<[string, string, string]> = [],
    relations: DynamicRelation[] = [],
    names: Record<string, string> = {},
): RelationGraphController {
    return new RelationGraphController({
        table: () => table(pairs),
        relations: () => relations,
        nameOf: (id) => names[id] ?? id,
    });
}

export function createRelationGraphControllerSuite(): TestSuite {
    const suite = new TestSuite('RelationGraphController');

    suite.test('史實排在動態前，第一位在正上方', () => {
        const c = controller([['liu-bei', 'guan-yu', 'SWORN']], [dynamic('liu-bei', 'zhao-yun', 'COMRADE', 80)], { 'guan-yu': '關羽', 'zhao-yun': '趙雲', 'liu-bei': '劉備' });
        c.open('liu-bei');
        assert.equals('guan-yu', c.nodes[0].id);
        assert.equals(0, c.nodes[0].x);
        assert.equals(-240, c.nodes[0].y);
        const view = c.getFlowView();
        assert.equals('劉備', view.texts.relationCenterName);
        assert.equals('關羽', view.texts.relationNodeName0);
        assert.equals('趙雲', view.texts.relationNodeName1);
        assert.equals(true, view.actives.relationNode1);
        assert.equals(false, view.actives.relationNode2);
    });

    suite.test('沒有關係時顯示空提示', () => {
        const c = controller();
        c.open('liu-bei');
        const view = c.getFlowView();
        assert.equals(true, view.actives.relationEmpty);
        assert.equals(false, view.actives.relationNode0);
    });

    suite.test('超過 16 位只顯示前 16 位並提示人數', () => {
        const relations = Array.from({ length: RELATION_GRAPH_SLOTS + 3 }, (_, i) => dynamic('lead', `g${i}`, 'COMRADE', 100 - i));
        const c = controller([], relations);
        c.open('lead');
        assert.equals(RELATION_GRAPH_SLOTS, c.nodes.length);
        assert.equals('g0', c.nodes[0].id);
        const view = c.getFlowView();
        assert.equals(true, view.actives.relationOverflow);
        assert.equals('另有 3 位未顯示', view.texts.relationOverflow);
    });

    suite.test('第一次按開簡卡，內容含關係與親密度', () => {
        const c = controller([['liu-bei', 'guan-yu', 'SWORN']], [dynamic('liu-bei', 'guan-yu', 'COMRADE', 85)], { 'guan-yu': '關羽' });
        c.open('liu-bei');
        assert.equals('peek', c.tapNode(0));
        const view = c.getFlowView();
        assert.equals(true, view.actives.relationPeek);
        assert.equals('關羽', view.texts.peekName);
        assert.equals('義兄弟、戰友', view.texts.peekRelation);
        assert.equals('親密度 85/100', view.texts.peekIntimacy);
        assert.equals('關係生效中', view.texts.peekStatus);
    });

    suite.test('只有史實關係時親密度顯示無，親密度歸零顯示失效', () => {
        const c = controller([['a', 'b', 'RIVAL']], [dynamic('a', 'c', 'COMRADE', 0)]);
        c.open('a');
        c.tapNode(0);
        assert.equals('親密度 —', c.getFlowView().texts.peekIntimacy);
        c.tapNode(1);
        assert.equals('關係已失效', c.getFlowView().texts.peekStatus);
    });

    suite.test('再按同一節點改以該武將為中心並收起簡卡', () => {
        const c = controller([['liu-bei', 'guan-yu', 'SWORN']]);
        c.open('liu-bei');
        c.tapNode(0);
        assert.equals('recenter', c.tapNode(0));
        assert.equals('guan-yu', c.centerId);
        assert.equals('liu-bei', c.nodes[0].id);
        assert.equals(false, c.getFlowView().actives.relationPeek);
        assert.equals(null, c.peekPosition());
    });

    suite.test('按別的節點只換簡卡；空格不動作', () => {
        const c = controller([['a', 'b', 'SWORN'], ['a', 'c', 'RIVAL']]);
        c.open('a');
        c.tapNode(0);
        assert.equals('peek', c.tapNode(1));
        assert.equals('a', c.centerId);
        assert.equals('none', c.tapNode(5));
    });

    suite.test('簡卡放在節點朝外那一側', () => {
        const c = controller([['a', 'b', 'COUPLE'], ['a', 'c', 'SWORN'], ['a', 'd', 'RIVAL']]);
        c.open('a');
        c.tapNode(1);
        assert.equals(true, (c.peekPosition()?.x ?? 0) > c.nodes[1].x);
        c.tapNode(2);
        assert.equals(true, (c.peekPosition()?.x ?? 0) < c.nodes[2].x);
    });

    suite.test('線段：實線一段、虛線與點線分段且不超過終點', () => {
        const from = { x: 0, y: 0 };
        const to = { x: 100, y: 0 };
        assert.equals(1, relationEdgeSegments(from, to, 'solid').length);
        const dashed = relationEdgeSegments(from, to, 'dashed');
        assert.equals(5, dashed.length);
        assert.equals(12, dashed[0].to.x);
        const dotted = relationEdgeSegments(from, to, 'dotted');
        assert.equals(13, dotted.length);
        assert.equals(98, dotted[dotted.length - 1].to.x);
        assert.equals(0, relationEdgeSegments(from, from, 'dashed').length);
    });

    suite.test('線段：鋸齒首尾接到端點且中間偏離連線', () => {
        const zigzag = relationEdgeSegments({ x: 0, y: 0 }, { x: 140, y: 0 }, 'zigzag');
        assert.equals(10, zigzag.length);
        assert.equals(0, zigzag[0].from.x);
        assert.equals(140, zigzag[zigzag.length - 1].to.x);
        assert.equals(5, zigzag[0].to.y);
        assert.equals(-5, zigzag[1].to.y);
    });

    suite.test('多條連線以中心對稱錯開', () => {
        assert.equals(0, relationEdgeOffset(0, 1));
        assert.equals(-3, relationEdgeOffset(0, 2));
        assert.equals(3, relationEdgeOffset(1, 2));
        const moved = offsetRelationEdge({ x: 0, y: 0 }, { x: 100, y: 0 }, 3);
        assert.equals(3, moved.from.y);
        assert.equals(3, moved.to.y);
    });

    suite.test('版面含控制器用到的所有節點，皮膚有用到的槽', () => {
        const layout = JSON.parse(fs.readFileSync(path.join(UI_SPEC, 'layouts', 'relation-graph-main.json'), 'utf8'));
        const skin = JSON.parse(fs.readFileSync(path.join(UI_SPEC, 'skins', 'relation-graph-screen.skin.json'), 'utf8'));
        const screen = JSON.parse(fs.readFileSync(path.join(UI_SPEC, 'screens', 'relation-graph-screen.json'), 'utf8'));
        assert.equals('relation-graph-main', screen.layout);
        assert.equals('relation-graph-screen.skin', screen.skin);
        const nodes = collect(layout.root);
        const ids = new Set(nodes.map((n) => n.id));
        const c = controller([['a', 'b', 'SWORN']]);
        c.open('a');
        const view = c.getFlowView();
        for (const id of [...Object.keys(view.texts), ...Object.keys(view.actives)]) {
            assert.equals(true, ids.has(id), `缺節點 ${id}`);
        }
        for (const id of ['btnClose', 'relationStage', 'relationCenterAvatar']) {
            assert.equals(true, ids.has(id), `缺節點 ${id}`);
        }
        for (let i = 0; i < RELATION_GRAPH_SLOTS; i += 1) {
            assert.equals(true, ids.has(`relationNodeAvatar${i}`), `缺節點 relationNodeAvatar${i}`);
        }
        for (const node of nodes) {
            for (const slot of [node.skinSlot, node.styleSlot]) {
                if (slot) assert.equals(true, slot in skin.slots, `缺皮膚 ${slot}`);
            }
        }
    });

    return suite;
}
