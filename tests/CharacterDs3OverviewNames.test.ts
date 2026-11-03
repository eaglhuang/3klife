/**
 * CharacterDs3OverviewNames.test.ts — 將分頁子面板的固定節點名都要在片段裡（PROG-2-1685）
 *
 * Unity 對照：Inspector 參照的子物件名稱若改掉，序列化欄位會變 null；這裡在進引擎前先擋。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';

const ROOT = path.resolve(__dirname, '..');
const FRAGMENT = 'assets/resources/ui-spec/fragments/layouts/character-ds3-overview-content.json';
const CHILD = 'assets/scripts/ui/components/character-ds3/CharacterDs3OverviewChild.ts';

function collectNames(node: { name?: string; children?: unknown[] }, out: Set<string>): Set<string> {
    if (node.name) out.add(node.name);
    for (const child of node.children ?? []) collectNames(child as { name?: string; children?: unknown[] }, out);
    return out;
}

export function createCharacterDs3OverviewNamesSuite(): TestSuite {
    const suite = new TestSuite('CharacterDs3OverviewNames (將分頁固定節點名)');

    suite.test('子面板引用的 Overview* 名稱都存在於片段', () => {
        const fragment = JSON.parse(fs.readFileSync(path.join(ROOT, FRAGMENT), 'utf8'));
        const names = collectNames(fragment.root ?? fragment, new Set<string>());
        const source = fs.readFileSync(path.join(ROOT, CHILD), 'utf8');
        const referenced = [...new Set(source.match(/'Overview\w+'/g) ?? [])].map((q) => q.slice(1, -1));
        assert.isTrue(referenced.length >= 25, `referenced=${referenced.length}`);
        const missing = referenced.filter((name) => !names.has(name));
        assert.equals('', missing.join(','));
    });

    return suite;
}
