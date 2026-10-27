/**
 * BloodlineConnections.test.ts — 血統樹先祖連線幾何（BUI-04，PROG-2-1071）
 *
 * 不開 Cocos：確認 14 條連線的父子關係、貝茲端點與取樣點數、缺位置時略過，
 * 以及正規化座標等比例縮放時連線點跟著等比例變化（螢幕比例改變不破圖）。
 *
 * Unity 對照：EditMode Test 檢查 LineRenderer 的端點與點數，不實例化場景。
 */
import { assert, TestSuite } from './TestRunner';
import {
    bezierBetween,
    bloodlineEdges,
    buildConnectionPaths,
    factorConnectionEdges,
    sampleBezier,
    type ConnectionNode,
    type Point,
} from '../assets/scripts/core/systems/BloodlineConnections';
import type { PedigreeSlot } from '../assets/scripts/core/services/BloodlineGraph';

const EPS = 1e-9;

function near(a: number, b: number): boolean {
    return Math.abs(a - b) < EPS;
}

/** 依排數給每個位置一個固定座標（正規化 0..1）；子代在底部中央。 */
function allPositions(): Partial<Record<ConnectionNode, Point>> {
    return {
        '': { x: 0.5, y: 0.9 },
        F: { x: 0.4, y: 0.6 },
        M: { x: 0.6, y: 0.6 },
        FF: { x: 0.3, y: 0.4 },
        FM: { x: 0.45, y: 0.4 },
        MF: { x: 0.55, y: 0.4 },
        MM: { x: 0.7, y: 0.4 },
        FFF: { x: 0.2, y: 0.1 },
        FFM: { x: 0.3, y: 0.1 },
        FMF: { x: 0.4, y: 0.1 },
        FMM: { x: 0.5, y: 0.1 },
        MFF: { x: 0.5, y: 0.1 },
        MFM: { x: 0.6, y: 0.1 },
        MMF: { x: 0.7, y: 0.1 },
        MMM: { x: 0.8, y: 0.1 },
    };
}

export function createBloodlineConnectionsSuite(): TestSuite {
    const suite = new TestSuite('BloodlineConnections (血統樹先祖連線幾何 BUI-04)');

    suite.test('14 條連線：父母連到子代，祖先依位置代碼連到上一代', () => {
        const edges = bloodlineEdges();
        assert.equals(14, edges.length);
        const byChild = new Map(edges.map((e) => [e.child, e.parent]));
        assert.equals('', byChild.get('F'));
        assert.equals('', byChild.get('M'));
        assert.equals('F', byChild.get('FF'));
        assert.equals('FF', byChild.get('FFF'));
        assert.equals('MM', byChild.get('MMM'));
    });

    suite.test('貝茲曲線端點與起訖點相同，控制點在兩端之間', () => {
        const from = { x: 0.2, y: 0.8 };
        const to = { x: 0.6, y: 0.2 };
        const curve = bezierBetween(from, to);
        assert.isTrue(near(curve.start.x, from.x) && near(curve.start.y, from.y));
        assert.isTrue(near(curve.end.x, to.x) && near(curve.end.y, to.y));
        assert.isTrue(curve.control1.y > Math.min(from.y, to.y) && curve.control1.y < Math.max(from.y, to.y));
        assert.isTrue(curve.control2.y > Math.min(from.y, to.y) && curve.control2.y < Math.max(from.y, to.y));
    });

    suite.test('取樣點數等於 steps，且至少 2 點（含起終點）', () => {
        const curve = bezierBetween({ x: 0, y: 0 }, { x: 1, y: 1 });
        assert.equals(16, sampleBezier(curve, 16).length);
        assert.equals(2, sampleBezier(curve, 1).length);
        assert.equals(2, sampleBezier(curve, 0).length);
    });

    suite.test('完整 15 個位置時產生 14 條連線，每條都有 steps 個點', () => {
        const paths = buildConnectionPaths(allPositions(), 10);
        assert.equals(14, paths.length);
        for (const path of paths) assert.equals(10, path.points.length);
    });

    suite.test('缺少任一端位置的連線略過，不拋例外', () => {
        const paths = buildConnectionPaths({ '': { x: 0.5, y: 0.9 }, F: { x: 0.4, y: 0.6 } });
        assert.equals(1, paths.length);
        assert.equals('F', paths[0].child);
    });

    suite.test('座標等比例縮放時連線點等比例變化，螢幕比例改變不破圖', () => {
        const base = buildConnectionPaths(allPositions(), 8);
        const scaled: Partial<Record<ConnectionNode, Point>> = {};
        for (const [key, p] of Object.entries(allPositions()) as Array<[ConnectionNode, Point]>) {
            scaled[key] = { x: p.x * 3, y: p.y * 3 };
        }
        const big = buildConnectionPaths(scaled, 8);
        assert.equals(base.length, big.length);
        for (let i = 0; i < base.length; i++) {
            for (let j = 0; j < base[i].points.length; j++) {
                assert.isTrue(near(big[i].points[j].x, base[i].points[j].x * 3));
                assert.isTrue(near(big[i].points[j].y, base[i].points[j].y * 3));
            }
        }
    });

    suite.test('factorConnectionEdges：完整位置產生 14 條，顏色依子代決定', () => {
        const positions = allPositions();
        const edges = factorConnectionEdges(positions, (child) => (child === 'F' ? 'red' : null));
        assert.equals(14, edges.length);
        const fEdge = edges.find((e) => e.from === positions.F);
        assert.isTrue(fEdge !== undefined);
        assert.equals('red', fEdge?.childColor ?? null);
        assert.isTrue(edges.filter((e) => e.childColor === null).length === 13);
    });

    suite.test('factorConnectionEdges：缺位置的連線略過，且不呼叫 childColorOf', () => {
        const seen: PedigreeSlot[] = [];
        const edges = factorConnectionEdges({ '': { x: 0.5, y: 0.9 }, F: { x: 0.4, y: 0.6 } }, (child) => {
            seen.push(child);
            return 'blue';
        });
        assert.equals(1, edges.length);
        assert.equals(1, seen.length);
        assert.equals('F', seen[0]);
    });

    return suite;
}
