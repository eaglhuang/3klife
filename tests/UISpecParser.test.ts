/**
 * UISpecParser.test.ts — UI 版面規格資料契約（headless，run-cli suite）
 *
 * 每份 ui-spec/layouts/*.json 的節點 type 都必須在白名單內，且根節點存在。
 * 原為 mocha/chai 寫法（describe/it），專案未安裝對應型別與執行器，故從未執行；改寫為 createUISpecParserSuite()。
 *
 * Unity 對照：Editor 階段的 ScriptableObject 結構驗證（OnValidate 規則）。
 */
import * as fs from 'fs';
import * as path from 'path';
import { TestSuite, assert } from './TestRunner';

/** 與 UISpecTypes.ts 對齊的合法節點類型（防呆白名單） */
const VALID_TYPES = [
    'container',
    'panel',
    'label',
    'button',
    'scroll-list',
    'image',
    'resource-counter',
    'spacer',
];

interface NodeSpec {
    name?: string;
    type?: string;
    children?: NodeSpec[];
}

/** 遞迴驗證節點與子節點；違規時拋出含完整路徑的錯誤 */
function validateNode(node: NodeSpec, filePath: string, parentPath = 'root'): void {
    const currentPath = `${parentPath} -> ${node.name || 'Unnamed'}`;
    if (!node.type) {
        throw new Error(`Missing 'type' property in node at [${currentPath}] in ${filePath}`);
    }
    assert.isTrue(
        VALID_TYPES.includes(node.type),
        `Invalid node type '${node.type}' found in ${filePath} at [${currentPath}]. Valid types are: ${VALID_TYPES.join(', ')}`,
    );
    for (const child of node.children ?? []) {
        validateNode(child, filePath, currentPath);
    }
}

export function createUISpecParserSuite(): TestSuite {
    const suite = new TestSuite('UISpecParser (UI 版面規格資料契約)');

    const layoutsDir = path.resolve(__dirname, '../assets/resources/ui-spec/layouts');
    if (!fs.existsSync(layoutsDir)) {
        // 目錄不存在時不視為失敗（與原本 Skip 行為一致）
        suite.test('版面目錄不存在時略過', () => {});
        return suite;
    }

    const files = fs.readdirSync(layoutsDir).filter(f => f.endsWith('.json'));
    for (const file of files) {
        suite.test(`layout spec types 與結構合法：${file}`, () => {
            const content = fs.readFileSync(path.join(layoutsDir, file), 'utf8');
            let jsonSpec: { root?: NodeSpec };
            try {
                jsonSpec = JSON.parse(content);
            } catch {
                throw new Error(`Invalid JSON syntax in file: ${file}`);
            }
            assert.isTrue(jsonSpec.root !== undefined, `${file} 缺少 root 節點`);
            validateNode(jsonSpec.root!, file);
        });
    }

    return suite;
}
