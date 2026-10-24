/**
 * BattleHudBindingIds.test.ts — 戰場 HUD 版面必須帶 BattleHUDComposite 要的綁定 id
 *
 * battle-hud-screen 由 HTML 示意稿轉成，節點都叫 div_N；沒有 id 時 binder.getLabel 拿不到，
 * 畫面會一直停在示意稿的假字（例如主將永遠顯示「關羽」）。
 */
import * as fs from 'fs';
import * as path from 'path';
import { TestSuite, assert } from './TestRunner';

const LAYOUT = path.join(__dirname, '../assets/resources/ui-spec/layouts/battle-hud-screen.json');
const REQUIRED = ['TurnLabel', 'PlayerNameLabel', 'PlayerCommandNameLabel', 'EnemyNameLabel'];

function collectIds(node: any, out: string[]): string[] {
    if (node?.id) out.push(node.id);
    for (const child of node?.children ?? []) collectIds(child, out);
    return out;
}

export function createBattleHudBindingIdsSuite(): TestSuite {
    const suite = new TestSuite('BattleHudBindingIds');

    suite.test('回合數與雙方主將名的 Label 都有唯一綁定 id', () => {
        const spec = JSON.parse(fs.readFileSync(LAYOUT, 'utf8'));
        const ids = collectIds(spec.root ?? spec, []);
        for (const id of REQUIRED) {
            assert.equals(1, ids.filter((x) => x === id).length, `${id} 應恰好出現一次`);
        }
    });

    return suite;
}
