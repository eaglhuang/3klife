/**
 * UISpecParser.test.ts — UI 版面規格資料契約（headless，run-cli suite）
 *
 * 掃描 ui-spec/layouts/*.json：
 *   - 只掃版面本身：`<id>.json` 與 `<id>.layout.json`；其餘帶額外 `.` 後綴的中介 / 報表檔（如 .compare-meta、.css-coverage、.bake-manifest）略過
 *   - 舊 `nodes` 格式的工具用檔（LEGACY_NODES_FORMAT）略過，並檢查清單與資料同步
 *   - `$ref` 節點解析到 fragments/ 的碎片檔再驗證；`_comment` 這類只含 `_` 鍵的物件視為註解
 *   - 節點 type 必須是 UIPreviewBuilder 有對應處理分支的類型
 *   - 引擎尚未處理的既有 type 列入 KNOWN_UNHANDLED，並檢查清單與資料同步（資料修正後須移除）
 *
 * Unity 對照：Editor 階段的 ScriptableObject OnValidate 規則。
 */
import * as fs from 'fs';
import * as path from 'path';
import { TestSuite, assert } from './TestRunner';

const UI_SPEC_DIR = path.resolve(__dirname, '../assets/resources/ui-spec');
const LAYOUTS_DIR = path.join(UI_SPEC_DIR, 'layouts');

/** 與 UIPreviewBuilder.buildNode 的 switch 分支一一對應（引擎真的會建立元件的類型） */
const ENGINE_TYPES = [
    'container', 'panel', 'label', 'button', 'scroll-list', 'scroll-view',
    'image', 'resource-counter', 'spacer', 'composite-image',
];

/**
 * 引擎目前沒有對應分支的既有 type：節點會建立，但不掛任何視覺元件（執行期靜默空白）。
 * 列為已知例外、待 PM 裁定：改資料為引擎支援的 type，或補引擎分支。修正後須從此清單移除。
 */
const KNOWN_UNHANDLED: Record<string, string> = {
    sprite: '建議改為 image（待 PM 裁定）',
    Toggle: '建議改為 button 並處理選取狀態（待 PM 裁定）',
    popup: '建議改為 panel 或 container（待 PM 裁定）',
    shadow: '僅出現在 parchment-panel 碎片，建議改為 panel（待 PM 裁定）',
};

/**
 * 舊 `nodes` 格式（Cocos 原生詞彙 Node / Sprite，w / h 尺寸）的工具用檔。
 * 執行期 UISpecLoader 只讀 `root` 格式，這些檔只被 tools_node 的快照與 smoke 腳本引用。
 * 另案決定遷移或淘汰；清單內檔案若已有 root 或已刪除，同步檢查會失敗。
 */
const LEGACY_NODES_FORMAT = [
    'gacha-destiny-shop.json',
    'gacha-main.json',
    'support-card-detail-main.json',
    'support-card-main.json',
    'support-card-team-edit-main.json',
];

/** 版面檔：`<id>.json` 或 `<id>.layout.json`；其餘帶額外 `.` 後綴者為中介 / 報表檔 */
function isLayoutFile(file: string): boolean {
    if (!file.endsWith('.json')) return false;
    const stem = file.slice(0, -'.json'.length);
    return !stem.includes('.') || file.endsWith('.layout.json');
}

interface NodeSpec {
    name?: string;
    type?: string;
    $ref?: string;
    children?: NodeSpec[];
    itemTemplate?: NodeSpec;
    [key: string]: unknown;
}

/** 只含 `_` 開頭鍵的物件是註解（例如 battle-hud-main 的 _comment），不是節點 */
function isCommentOnly(node: NodeSpec): boolean {
    const keys = Object.keys(node);
    return keys.length > 0 && keys.every(k => k.startsWith('_'));
}

/** 收集節點樹中實際出現過的 KNOWN_UNHANDLED type（供清單同步檢查） */
function collectTypes(node: NodeSpec, found: Set<string>): void {
    if (node.$ref) {
        const fragment = loadFragment(node.$ref);
        if (fragment) collectTypes(fragment, found);
        return;
    }
    if (isCommentOnly(node)) return;
    if (node.type) found.add(node.type);
    for (const child of node.children ?? []) collectTypes(child, found);
    if (node.itemTemplate) collectTypes(node.itemTemplate, found);
}

function loadFragment(ref: string): NodeSpec | null {
    const file = path.join(UI_SPEC_DIR, `${ref}.json`);
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf8')) as NodeSpec;
}

/** 遞迴驗證節點；違規時拋出含完整路徑的錯誤 */
function validateNode(node: NodeSpec, filePath: string, parentPath = 'root'): void {
    const currentPath = `${parentPath} -> ${node.name || 'Unnamed'}`;

    if (typeof node.$ref === 'string') {
        const fragment = loadFragment(node.$ref);
        assert.isTrue(fragment !== null, `${filePath} 的 $ref "${node.$ref}" 找不到碎片檔 at [${currentPath}]`);
        validateNode(fragment!, filePath, `${currentPath} -> $ref:${node.$ref}`);
        return;
    }
    if (isCommentOnly(node)) return;

    if (!node.type) {
        throw new Error(`Missing 'type' property in node at [${currentPath}] in ${filePath}`);
    }
    if (!(node.type in KNOWN_UNHANDLED)) {
        assert.isTrue(
            ENGINE_TYPES.includes(node.type),
            `Invalid node type '${node.type}' found in ${filePath} at [${currentPath}]. Valid types are: ${ENGINE_TYPES.join(', ')}`,
        );
    }
    for (const child of node.children ?? []) {
        validateNode(child, filePath, currentPath);
    }
    if (node.itemTemplate) {
        validateNode(node.itemTemplate, filePath, `${currentPath} -> [template]`);
    }
}

export function createUISpecParserSuite(): TestSuite {
    const suite = new TestSuite('UISpecParser (UI 版面規格資料契約)');

    if (!fs.existsSync(LAYOUTS_DIR)) {
        suite.test('版面目錄不存在時略過', () => {});
        return suite;
    }

    const files = fs.readdirSync(LAYOUTS_DIR)
        .filter(f => isLayoutFile(f) && !LEGACY_NODES_FORMAT.includes(f))
        .sort();

    for (const file of files) {
        suite.test(`layout spec types 與結構合法：${file}`, () => {
            let jsonSpec: { root?: NodeSpec };
            try {
                jsonSpec = JSON.parse(fs.readFileSync(path.join(LAYOUTS_DIR, file), 'utf8'));
            } catch {
                throw new Error(`Invalid JSON syntax in file: ${file}`);
            }
            assert.isTrue(jsonSpec.root !== undefined, `${file} 缺少 root 節點`);
            validateNode(jsonSpec.root!, file);
        });
    }

    suite.test('舊 nodes 格式清單與資料同步：列出的檔仍存在且仍無 root', () => {
        for (const file of LEGACY_NODES_FORMAT) {
            const full = path.join(LAYOUTS_DIR, file);
            assert.isTrue(fs.existsSync(full), `LEGACY_NODES_FORMAT 的 ${file} 已不存在，請從清單移除`);
            const spec = JSON.parse(fs.readFileSync(full, 'utf8')) as { root?: NodeSpec };
            assert.isTrue(spec.root === undefined, `${file} 已改為 root 格式，請從 LEGACY_NODES_FORMAT 移除並納入契約`);
        }
    });

    suite.test('已知例外清單與資料同步：列出的 type 仍存在於資料中，已修正者須移除', () => {
        const found = new Set<string>();
        for (const file of files) {
            const spec = JSON.parse(fs.readFileSync(path.join(LAYOUTS_DIR, file), 'utf8')) as { root?: NodeSpec };
            if (spec.root) collectTypes(spec.root, found);
        }
        for (const type of Object.keys(KNOWN_UNHANDLED)) {
            assert.isTrue(found.has(type), `KNOWN_UNHANDLED 的 "${type}" 已不在資料中，請從清單移除`);
        }
    });

    return suite;
}
