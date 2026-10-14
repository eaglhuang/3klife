/**
 * GeneralRole — 職能雙軌分流（WBS GEN-06，PROG-2-0552）
 *
 * 第一組用 generals.json 的真實資料，統計歸類與待裁決清單；其餘用手拉的資料測規則。
 */
import { assert, TestSuite } from './TestRunner';
import { lockRole, reportRoles, toCanonicalRole } from '../assets/scripts/core/models/GeneralRole';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');

export function createGeneralRoleSuite(): TestSuite {
    const suite = new TestSuite('GeneralRole (職能雙軌分流 GEN-06)');

    suite.test('真實資料：可歸類的武將數量加上待裁決數量等於全部', () => {
        const generals = JSON.parse(fs.readFileSync('assets/resources/data/generals.json', 'utf8')) as Array<{
            id: string;
            role?: unknown;
        }>;
        const report = reportRoles(generals);
        assert.equals(generals.length, report.mapped + report.unmapped.length);
        assert.isTrue(report.mapped > 0);
    });

    suite.test('真實資料：待裁決的值只限規格未定義的（Advisor、Noble、Planner）', () => {
        const generals = JSON.parse(fs.readFileSync('assets/resources/data/generals.json', 'utf8')) as Array<{
            id: string;
            role?: unknown;
        }>;
        const unmappedRaw = new Set(reportRoles(generals).unmapped.map((u) => u.raw));
        for (const raw of unmappedRaw) {
            assert.isTrue(['Advisor', 'Noble', 'Planner'].includes(raw), `不該待裁決: ${raw}`);
        }
    });

    suite.test('歸類：戰鬥類舊值→Combat，教官類舊值（Support）→Mentor，未知值為 null', () => {
        assert.equals('Combat', toCanonicalRole('Combat') ?? '');
        assert.equals('Combat', toCanonicalRole('Commander') ?? '');
        assert.equals('Mentor', toCanonicalRole('Support') ?? '');
        assert.equals(null, toCanonicalRole('Advisor'));
        assert.equals(null, toCanonicalRole(undefined));
    });

    suite.test('不可變更：角色一旦定下，新值不會覆蓋', () => {
        assert.equals('Combat', lockRole(null, 'Combat'));
        assert.equals('Combat', lockRole('Combat', 'Mentor'));
        assert.equals('Mentor', lockRole('Mentor', 'Mentor'));
    });

    return suite;
}
