/**
 * GdpPipeline — 武將數據管線三階段（doc_spec_0343；PROG-2-2029）
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { gdpIngest, gdpMerge, gdpValidate, runGdpVerification, type GdpRecord } from '../assets/scripts/core/systems/GdpPipeline';

const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'gdp-e2e-fixture.json'), 'utf8'));
const options = { troopCampIds: new Set<string>(fixture.troopCampIds), tacticIds: new Set<string>(fixture.tacticIds) };

export function createGdpPipelineSuite(): TestSuite {
    const suite = new TestSuite('GdpPipeline (數據管線 doc_spec_0343 PROG-2-2029)');

    suite.test('test_ingest_malformed_handling：異常資料記警告、不拋例外', () => {
        const { records, warnings } = gdpIngest(fixture.incoming);
        assert.equals(2, records.length);
        assert.equals(2, warnings.length);
        assert.equals(76, records[0].int);
        assert.equals(1, gdpIngest('x').warnings.length);
    });

    suite.test('test_merge_idempotency：連續合併兩次結果相同，且保留舊欄位', () => {
        const { records } = gdpIngest(fixture.incoming);
        const once = gdpMerge(fixture.base, records);
        const twice = gdpMerge(once, records);
        assert.equals(JSON.stringify(once), JSON.stringify(twice));
        const zhao = once.find((r) => r.templateId === 'Zhao_Yun')!;
        assert.equals(96, zhao.str);
        assert.equals(76, zhao.int);
        assert.equals('Gao_Shun,Guan_Yu,Zhao_Yun', once.map((r) => r.templateId).join(','));
    });

    suite.test('test_foreign_key_integrity：未登錄兵種營與戰法要計數', () => {
        const bad: GdpRecord[] = [
            { templateId: 'A', name: 'A', specialTroopCampId: 'camp_unknown', tacticIds: ['tactic_fire', 'tactic_x'] },
            { templateId: 'B', name: '', str: 200 },
        ];
        const result = gdpValidate(bad, options);
        assert.isFalse(result.passed);
        assert.equals(2, result.invalidForeignKeys);
        assert.equals(1, result.outOfBoundStats);
        assert.equals(1, result.missingRequiredFields);
    });

    suite.test('§3 runGdpVerification：fixture 全程通過且在 3000ms 內', () => {
        let t = 1000;
        const summary = runGdpVerification(fixture.base, fixture.incoming, options, () => (t += 5));
        assert.isTrue(summary.passed, summary.issues.join('；'));
        assert.isTrue(summary.mergeIdempotent);
        assert.equals(3, summary.totalRecordsChecked);
        assert.equals(5, summary.durationMs);
        const real = runGdpVerification(fixture.base, fixture.incoming, options);
        assert.isTrue(real.durationMs < 3000);
    });

    return suite;
}
