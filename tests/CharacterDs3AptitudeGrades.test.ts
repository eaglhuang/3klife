/**
 * CharacterDs3AptitudeGrades.test.ts — 適分頁評等依武將對應到各卡（PROG-2-1693）
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { buildDs3AptitudeGrades, ds3AptitudeBorderColor } from '../assets/scripts/ui/components/character-ds3/CharacterDs3AptitudeChild';

const FRAGMENT = path.resolve(__dirname, '..', 'assets/resources/ui-spec/fragments/layouts/character-ds3-aptitude-content.json');

function collectNames(node: { name?: string; children?: unknown[] }, out: Set<string>): Set<string> {
    if (node.name) out.add(node.name);
    for (const child of node.children ?? []) collectNames(child as { name?: string; children?: unknown[] }, out);
    return out;
}

export function createCharacterDs3AptitudeGradesSuite(): TestSuite {
    const suite = new TestSuite('CharacterDs3AptitudeGrades (適分頁評等)');

    suite.test('兵種、地形、天氣評等寫到對應卡，缺值為 —', () => {
        const grades = buildDs3AptitudeGrades({
            troopAptitude: { CAVALRY: 'S', INFANTRY: 'B' },
            terrainAptitude: { MOUNTAIN: 'A' },
            weatherAptitude: { FOG: 'A' },
        });
        assert.equals('B', grades.CharacterDs3TabAptitude_div_7);
        assert.equals('S', grades.CharacterDs3TabAptitude_div_10);
        assert.equals('—', grades.CharacterDs3TabAptitude_div_13);
        assert.equals('A', grades.CharacterDs3TabAptitude_div_26);
        assert.equals('A', grades.CharacterDs3TabAptitude_div_48);
        assert.equals(15, Object.keys(buildDs3AptitudeGrades(null)).length);
    });

    suite.test('對應的評等節點都存在於片段', () => {
        const fragment = JSON.parse(fs.readFileSync(FRAGMENT, 'utf8'));
        const names = collectNames(fragment.root ?? fragment, new Set<string>());
        const missing = Object.keys(buildDs3AptitudeGrades(null)).filter((n) => !names.has(n));
        assert.equals('', missing.join(','));
    });

    suite.test('S 級卡金框，其餘暗金框', () => {
        assert.equals('255,215,0,102', ds3AptitudeBorderColor('S').join(','));
        assert.equals('77,70,53,255', ds3AptitudeBorderColor('A').join(','));
        assert.equals('77,70,53,255', ds3AptitudeBorderColor('—').join(','));
    });

    return suite;
}
