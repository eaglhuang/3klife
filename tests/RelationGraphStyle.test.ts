/**
 * RelationGraphStyle — 關係圖鑑排序與連線樣式（doc_spec_0330；PROG-2-2006）
 */
import { assert, TestSuite } from './TestRunner';
import type { RelationGraph } from '../assets/scripts/core/systems/RelationGraph';
import {
    clampRelationZoom, relationEdgeStyle, relationPeekIntimacyText, rubberBandOffset, sortRelationGraph,
} from '../assets/scripts/core/systems/RelationGraphStyle';

export function createRelationGraphStyleSuite(): TestSuite {
    const suite = new TestSuite('RelationGraphStyle (關係圖鑑樣式 doc_spec_0330 PROG-2-2006)');

    suite.test('連線樣式：史實三色、動態虛線、歸零灰點線', () => {
        assert.equals('#FF69B4', relationEdgeStyle({ kind: 'historical', type: 'COUPLE', intimacy: null, active: true }).color);
        assert.equals('zigzag', relationEdgeStyle({ kind: 'historical', type: 'RIVAL', intimacy: null, active: true }).line);
        assert.equals('#00BFFF', relationEdgeStyle({ kind: 'dynamic', type: 'COMRADE', intimacy: 50, active: true }).color);
        assert.equals('#2ECC71', relationEdgeStyle({ kind: 'dynamic', type: 'DYNAMIC_SWORN', intimacy: 50, active: true }).color);
        const off = relationEdgeStyle({ kind: 'dynamic', type: 'COMRADE', intimacy: 0, active: false });
        assert.equals('dotted', off.line);
        assert.equals(0.4, off.alpha);
    });

    suite.test('排序：夫妻→義兄弟→宿敵→親密度高到低；第一個在正上方', () => {
        const g: RelationGraph = {
            centerId: 'c',
            nodes: [
                { id: 'low', x: 0, y: 0, edges: [{ kind: 'dynamic', type: 'COMRADE', intimacy: 20, active: true }] },
                { id: 'rival', x: 0, y: 0, edges: [{ kind: 'historical', type: 'RIVAL', intimacy: null, active: true }] },
                { id: 'high', x: 0, y: 0, edges: [{ kind: 'dynamic', type: 'COMRADE', intimacy: 90, active: true }] },
                { id: 'wife', x: 0, y: 0, edges: [{ kind: 'historical', type: 'COUPLE', intimacy: null, active: true }] },
            ],
        };
        const s = sortRelationGraph(g);
        assert.equals('wife,rival,high,low', s.nodes.map((n) => n.id).join(','));
        assert.equals(-240, s.nodes[0].y);
        assert.equals(240, s.nodes[1].x);
    });

    suite.test('縮放限制、橡皮筋與簡卡文字', () => {
        assert.equals(0.6, clampRelationZoom(0.2));
        assert.equals(1.5, clampRelationZoom(3));
        assert.equals(1, clampRelationZoom(NaN));
        assert.equals(50, rubberBandOffset(50, 100));
        assert.equals(-120, rubberBandOffset(-140, 100));
        assert.equals('85/100', relationPeekIntimacyText(85));
        assert.equals('—', relationPeekIntimacyText(null));
    });

    return suite;
}
