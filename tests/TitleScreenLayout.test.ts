import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, TestSuite } from './TestRunner';

type LayoutNode = {
    name?: string;
    id?: string;
    text?: string;
    active?: boolean;
    width?: number;
    widget?: Record<string, number>;
    children?: LayoutNode[];
};

const LAYOUT_DIR = join(__dirname, '..', 'assets/resources/ui-spec/layouts');
const load = (file: string): { canvas: { designWidth: number }; root: LayoutNode } =>
    JSON.parse(readFileSync(join(LAYOUT_DIR, file), 'utf8'));

const all = (n: LayoutNode, out: LayoutNode[] = []): LayoutNode[] => {
    out.push(n);
    for (const c of n.children ?? []) all(c, out);
    return out;
};

/** 設計稿 body[data-title="legacy"] 時要隱藏的 .t-survival 文字（三國志・生存 版本）。 */
const SURVIVAL_TEXTS = ['三國志・生存', '生', 'THREE KINGDOMS · SURVIVAL'];

export function createTitleScreenLayoutSuite(): TestSuite {
    const suite = new TestSuite('標題畫面開始按鈕置中、隱藏另一版名稱 PROG-2-2229');

    for (const file of ['title-screen.json', 'title-screen.layout.json']) {
        suite.test(`${file}：開始遊戲按鈕水平置中，不再把左邊緣放在畫面中央`, () => {
            const layout = load(file);
            const start = all(layout.root).find(n => n.id === 'title-screen.start');
            assert.isTrue(!!start, '找不到 title-screen.start');
            assert.equals(0, start!.widget?.horizontalCenter);
            assert.equals(undefined, start!.widget?.left);
        });

        suite.test(`${file}：沒有任何寬度小於畫面的節點把左邊緣放在畫面正中央`, () => {
            const layout = load(file);
            const half = layout.canvas.designWidth / 2;
            const bad = all(layout.root)
                .filter(n => n.widget?.left === half && (n.width ?? 0) > 0 && (n.width ?? 0) < layout.canvas.designWidth)
                .map(n => n.name);
            assert.equals('', bad.join(','));
        });

        suite.test(`${file}：三國志・生存 版本的文字預設隱藏，三國傳承 版本保留顯示`, () => {
            const nodes = all(load(file).root);
            for (const text of SURVIVAL_TEXTS) {
                const hit = nodes.find(n => n.text === text);
                assert.isTrue(!!hit, `找不到「${text}」`);
                assert.equals(false, hit!.active, `「${text}」應隱藏`);
            }
            for (const text of ['三國傳承', '傳', 'THREE KINGDOMS · LEGACY', '開始遊戲']) {
                const hit = nodes.find(n => n.text === text);
                assert.isTrue(!!hit && hit.active !== false, `「${text}」應顯示`);
            }
        });
    }

    suite.test('title-screen.json 與 title-screen.layout.json 內容一致', () => {
        assert.equals(JSON.stringify(load('title-screen.json')), JSON.stringify(load('title-screen.layout.json')));
    });

    return suite;
}
