import * as fs from 'fs';
import * as path from 'path';
import { getTallyGrainCost, TALLY_GRAIN_COST, TALLY_GRAIN_COST_FALLBACK } from '../assets/scripts/core/systems/SortieDeploy';
import { TIGER_TALLY_SET_DEFS } from '../assets/scripts/core/systems/TigerTallySetBonus';
import { TestSuite, assert } from './TestRunner';

/** Q61~Q65 裁決約束（TERM-07）：無冷卻、無 TallyCategory，糧耗與 Set 羈絆各只有一個常數來源。 */
const FORBIDDEN_TOKENS = ['Cooldown_Turns', 'TallyCategory', 'tallyCategory', 'cooldownTurns'];
const SCAN_ROOTS = ['assets/scripts', 'assets/resources/data'];
const SCAN_EXTENSIONS = ['.ts', '.json'];

function collectFiles(dir: string, out: string[]): string[] {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            collectFiles(full, out);
        } else if (SCAN_EXTENSIONS.some((ext) => entry.name.endsWith(ext))) {
            out.push(full);
        }
    }
    return out;
}

function findForbiddenHits(): string[] {
    const repoRoot = path.resolve(__dirname, '..');
    const hits: string[] = [];
    for (const root of SCAN_ROOTS) {
        for (const file of collectFiles(path.join(repoRoot, root), [])) {
            const text = fs.readFileSync(file, 'utf8');
            for (const token of FORBIDDEN_TOKENS) {
                if (text.includes(token)) {
                    hits.push(`${path.relative(repoRoot, file)} :: ${token}`);
                }
            }
        }
    }
    return hits;
}

export function createTigerTallyRuleConstraintsSuite(): TestSuite {
    const suite = new TestSuite('TigerTallyRuleConstraints (虎符裁決約束 TERM-07)');

    suite.test('糧耗：四個品質都有從 1 星起的查表值，且星級越高糧耗不降', () => {
        for (const quality of ['R', 'SR', 'SSR', 'UR']) {
            const table = TALLY_GRAIN_COST[quality];
            assert.isDefined(table, `${quality} 缺少糧耗表`);
            const stars = Object.keys(table).map(Number).sort((a, b) => a - b);
            assert.equals(1, stars[0], `${quality} 應從 1 星起`);
            for (let i = 1; i < stars.length; i++) {
                assert.isTrue(table[stars[i]] >= table[stars[i - 1]], `${quality} 糧耗應隨星級不降`);
            }
        }
    });

    suite.test('糧耗：getTallyGrainCost 是唯一查表入口，未知品質回 fallback', () => {
        assert.equals(TALLY_GRAIN_COST.SSR[3], getTallyGrainCost('SSR', 3));
        assert.equals(TALLY_GRAIN_COST_FALLBACK, getTallyGrainCost('XX', 1));
    });

    suite.test('Set 羈絆：TIGER_TALLY_SET_DEFS 每筆只含規格欄位，不含冷卻或分類', () => {
        const allowed = ['setId', 'name', 'memberTroopIds', 'requiredCount', 'bonus'];
        assert.isTrue(TIGER_TALLY_SET_DEFS.length > 0, '應至少有一組 Set');
        for (const def of TIGER_TALLY_SET_DEFS) {
            for (const key of Object.keys(def)) {
                assert.isTrue(allowed.includes(key), `Set ${def.setId} 含不允許的欄位 ${key}`);
            }
        }
    });

    suite.test('schema 約束：assets/scripts 與 assets/resources/data 不出現冷卻或 TallyCategory 欄位', () => {
        const hits = findForbiddenHits();
        assert.equals(0, hits.length, `違規位置：${hits.join('; ')}`);
    });

    return suite;
}
