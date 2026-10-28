/**
 * BattleBindData.test.ts — 戰鬥 layout 的 bind 路徑必須都登錄在資料契約內（DATA-1-0001，PROG-2-1516）
 */
import * as fs from 'fs';
import * as path from 'path';
import { BATTLE_BIND_PATHS } from '../assets/scripts/core/data/BattleBindData';
import { TestSuite, assert } from './TestRunner';

const LAYOUT_DIR = path.join(__dirname, '..', 'assets', 'resources', 'ui-spec', 'layouts');
const BATTLE_PREFIX = /^(battleState|battle|battleLog|unit|tally)[.[]/;

function bindPathsIn(file: string): string[] {
    const json = fs.readFileSync(path.join(LAYOUT_DIR, file), 'utf8');
    return [...json.matchAll(/"bind"\s*:\s*"([^"]+)"/g)].map((m) => m[1]);
}

function normalize(bind: string): string {
    return bind.replace(/tally\[\d+\]/, 'tally[n]');
}

export function createBattleBindDataSuite(): TestSuite {
    const suite = new TestSuite('BattleBindData (戰鬥 bind 路徑契約 DATA-1-0001 PROG-2-1516)');

    suite.test('戰鬥 layout 的每個 bind 路徑都登錄在契約內', () => {
        const files = fs.readdirSync(LAYOUT_DIR).filter((f) => f.endsWith('.json'));
        const known = new Set<string>(BATTLE_BIND_PATHS);
        const missing: string[] = [];
        for (const file of files) {
            for (const bind of bindPathsIn(file)) {
                if (!BATTLE_PREFIX.test(bind)) continue;
                if (!known.has(normalize(bind))) missing.push(`${file}:${bind}`);
            }
        }
        assert.equals(0, missing.length, `未登錄的 bind 路徑：${missing.join(', ')}`);
    });

    suite.test('契約清單沒有重複路徑', () => {
        assert.equals(BATTLE_BIND_PATHS.length, new Set(BATTLE_BIND_PATHS).size);
    });

    return suite;
}
