/**
 * CharacterDs3StatsRows.test.ts — 屬分頁揭露階段、評等推算，以及綁定節點都在片段內（UI-2-0165）
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { buildDs3StatRow, deriveDs3Rank } from '../assets/scripts/ui/components/character-ds3/CharacterDs3StatsChild';

const FRAGMENT = path.resolve(__dirname, '..', 'assets/resources/ui-spec/fragments/layouts/character-ds3-stats-content.json');

function collectNames(node: { name?: string; children?: unknown[] }, out: Set<string> = new Set()): Set<string> {
    if (node.name) out.add(node.name);
    for (const child of node.children ?? []) collectNames(child as { name?: string; children?: unknown[] }, out);
    return out;
}

export function createCharacterDs3StatsRowsSuite(): TestSuite {
    const suite = new TestSuite('CharacterDs3StatsRows');

    suite.test('揭露階段決定數值與條長', () => {
        assert.equals('?', buildDs3StatRow('HIDDEN', 80, 1000).talent);
        assert.equals(0, buildDs3StatRow('HIDDEN', 80, 1000).barRatio);
        assert.equals('傾', buildDs3StatRow('TENDENCY', 80, 1000).talent);
        assert.equals('待', buildDs3StatRow('TENDENCY', 80, 1000).prowess);
        assert.equals('~', buildDs3StatRow('RANGE', 80, 1000).prowess);
        assert.equals(0.5, buildDs3StatRow('RANGE', 80, 1000).barRatio);
        assert.equals('/2000', buildDs3StatRow(undefined, 80, 1000).max);
        assert.equals(1, buildDs3StatRow('EXACT', 100, 3000).barRatio);
    });

    suite.test('有資料用資料，否則由最高能力值推算評等', () => {
        assert.equals('A', deriveDs3Rank(' a ', [99]));
        assert.equals('SS', deriveDs3Rank(undefined, [98, 10]));
        assert.equals('S', deriveDs3Rank(undefined, [90]));
        assert.equals('C', deriveDs3Rank('', [10]));
    });

    suite.test('子面板用到的固定節點都在片段內', () => {
        const names = collectNames(JSON.parse(fs.readFileSync(FRAGMENT, 'utf8')));
        const required = ['StatsRadar', 'StatsRoleComment', 'StatsGradeBadge', 'StatsRankBadge', 'StatsRankText', 'StatsMentorTitle', 'StatsMentorGrid'];
        for (const key of ['str', 'int', 'lea', 'pol', 'cha', 'luk']) {
            required.push(`Stats_${key}_current`, `Stats_${key}_prowess`, `Stats_${key}_track`, `Stats_${key}_fill`);
        }
        for (const key of ['hp', 'sp', 'vitality']) {
            required.push(`Stats_${key}_value`, `Stats_${key}_max`, `Stats_${key}_track`, `Stats_${key}_fill`);
        }
        assert.equals('', required.filter((n) => !names.has(n)).join(','));
    });

    return suite;
}
