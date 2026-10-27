/**
 * ServerSchemaApt15 — 適性記錄 Server 表的列驗證（PROG-2-0929 / APT-15）
 *
 * 驗證重點：
 *   1. 三個維度（兵種／地形／天氣）的合法列通過
 *   2. sub_type 必須屬於所屬維度（例如 WEATHER 不可填 CAVALRY）
 *   3. 等級只接受 S/A/B/C/D；必填 ID 缺漏會回報
 */
import { assert, TestSuite } from './TestRunner';
import { AptitudeRecordRow, APTITUDE_SUB_TYPES, validateAptitudeRecordRow } from '../server/schema/apt15-row-validators';

function row(overrides: Partial<AptitudeRecordRow> = {}): AptitudeRecordRow {
    return {
        aptitude_id: 'AP_0001',
        player_id: 'P01',
        general_uid: 'G101',
        dimension: 'TROOP',
        sub_type: 'CAVALRY',
        grade: 'A',
        source_gene_id: 'GENE_PINK_2',
        ...overrides,
    };
}

export function createServerSchemaApt15Suite(): TestSuite {
    const suite = new TestSuite('ServerSchemaApt15 (適性記錄 Server 表 APT-15)');

    suite.test('三個維度的合法列都通過驗證', () => {
        assert.equals(0, validateAptitudeRecordRow(row()).length);
        assert.equals(0, validateAptitudeRecordRow(row({ dimension: 'TERRAIN', sub_type: 'PLAIN', grade: 'S' })).length);
        assert.equals(0, validateAptitudeRecordRow(row({ dimension: 'WEATHER', sub_type: 'FOG', grade: 'D', source_gene_id: null })).length);
    });

    suite.test('sub_type 必須屬於所屬維度：WEATHER 不可填兵種代碼', () => {
        const errors = validateAptitudeRecordRow(row({ dimension: 'WEATHER', sub_type: 'CAVALRY' }));
        assert.isTrue(errors.length > 0, '應回報 sub_type 不屬於 WEATHER');
    });

    suite.test('規格代碼完整：兵種 4、地形 5、天氣 6', () => {
        assert.equals(4, APTITUDE_SUB_TYPES.TROOP.length);
        assert.equals(5, APTITUDE_SUB_TYPES.TERRAIN.length);
        assert.equals(6, APTITUDE_SUB_TYPES.WEATHER.length);
    });

    suite.test('等級與維度非法時回報錯誤', () => {
        assert.isTrue(validateAptitudeRecordRow(row({ grade: 'E' })).length > 0, '等級 E 應不合法');
        assert.isTrue(validateAptitudeRecordRow(row({ dimension: 'MAGIC' })).length > 0, '未知維度應不合法');
    });

    suite.test('必填 ID 缺漏或超過 32 字元時回報錯誤', () => {
        assert.isTrue(validateAptitudeRecordRow(row({ aptitude_id: '' })).length > 0);
        assert.isTrue(validateAptitudeRecordRow(row({ player_id: undefined })).length > 0);
        assert.isTrue(validateAptitudeRecordRow(row({ general_uid: 'G'.repeat(33) })).length > 0);
    });

    return suite;
}
