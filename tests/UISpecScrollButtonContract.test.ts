/**
 * UISpecScrollButtonContract — 版面規格不可再出現兩種已知的畫面錯誤（PROG-2-2136）
 *
 * - 按鈕同時有自己的文字與子標籤：會疊出兩層字。
 * - scroll-view 有多個子節點：建構器只把唯一的子節點當捲動內容，其他的不會被遮罩。
 */
import * as fs from 'fs';
import * as path from 'path';
import { TestSuite, assert } from './TestRunner';

interface SpecNode {
    type?: string;
    name?: string;
    text?: string;
    textKey?: string;
    bind?: string;
    children?: SpecNode[];
    itemTemplate?: unknown;
}

const LAYOUT_DIR = path.join(__dirname, '../assets/resources/ui-spec/layouts');

function walk(node: SpecNode, visit: (n: SpecNode) => void): void {
    visit(node);
    for (const child of node.children ?? []) walk(child, visit);
}

function collect(check: (n: SpecNode) => boolean): string[] {
    const hits: string[] = [];
    for (const file of fs.readdirSync(LAYOUT_DIR)) {
        if (!file.endsWith('.json')) continue;
        const raw = JSON.parse(fs.readFileSync(path.join(LAYOUT_DIR, file), 'utf8')) as { root?: SpecNode } & SpecNode;
        walk(raw.root ?? raw, (n) => { if (check(n)) hits.push(`${file}:${n.name}`); });
    }
    return hits;
}

export function createUISpecScrollButtonContractSuite(): TestSuite {
    const suite = new TestSuite('UISpecScrollButtonContract');

    suite.test('按鈕不可同時有自己的文字與子標籤', () => {
        const hits = collect((n) => (n.type === 'button' || n.type === 'toggle')
            && (n.text !== undefined || !!n.textKey || !!n.bind)
            && (n.children ?? []).some((c) => c.type === 'label'));
        assert.equals('', hits.join(', '));
    });

    suite.test('scroll-view 最多一個子節點', () => {
        const hits = collect((n) => (n.type === 'scroll-view' || n.type === 'scroll-list') && (n.children?.length ?? 0) > 1);
        assert.equals('', hits.join(', '));
    });

    suite.test('任務詳情的內容綁定路徑都對得上版面', () => {
        const layout = JSON.parse(fs.readFileSync(path.join(LAYOUT_DIR, 'lobby-mission-detail-dialog-main.json'), 'utf8')) as { root?: SpecNode } & SpecNode;
        const paths = new Set<string>();
        const index = (node: SpecNode, prefix: string): void => {
            for (const child of node.children ?? []) {
                const current = prefix ? `${prefix}/${child.name}` : String(child.name);
                paths.add(current);
                index(child, current);
            }
        };
        index(layout.root ?? layout, '');
        const schema = JSON.parse(fs.readFileSync(path.join(LAYOUT_DIR, '../contracts/lobby-mission-detail-dialog-content.schema.json'), 'utf8')) as { fields: Record<string, { bindPath?: string }> };
        const missing = Object.entries(schema.fields).filter(([, f]) => f.bindPath && !paths.has(f.bindPath)).map(([k]) => k);
        assert.equals('', missing.join(', '));
    });

    return suite;
}
