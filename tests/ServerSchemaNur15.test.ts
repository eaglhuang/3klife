/**
 * ServerSchemaNur15 — 培育紀錄 Server 表的列驗證與寫入查詢（PROG-2-0855 / NUR-15）
 *
 * 驗證重點：
 *   1. 合法畢業紀錄通過
 *   2. 揭露層級 0~3、評級 S/A/B/C、季度先後順序、JSON 欄位可解析
 *   3. 畢業後寫入記憶體表，可依 session 讀回（對應「畢業後寫入 Server 並可查詢」）
 */
import { assert, TestSuite } from './TestRunner';
import { NurtureRecordRow, validateNurtureRecordRow } from '../server/schema/nur15-row-validators';

function graduation(overrides: Partial<NurtureRecordRow> = {}): NurtureRecordRow {
    return {
        session_id: 'NS_0007',
        child_uid: 'C201',
        start_season: 1,
        end_season: 21,
        mentor_id: 'M01',
        revelation_level: 3,
        phase_block_history_json: '[{"phase":1}]',
        mentoring_mode_log_json: '[]',
        reveal_log_json: '[]',
        final_stats_json: '{"STR":92}',
        graduation_tags_json: '["槍將預備","夜襲適性"]',
        rating: 'A',
        tp_total: 40,
        ...overrides,
    };
}

export function createServerSchemaNur15Suite(): TestSuite {
    const suite = new TestSuite('ServerSchemaNur15 (培育紀錄 Server 表 NUR-15)');

    suite.test('合法畢業紀錄通過驗證', () => {
        assert.equals(0, validateNurtureRecordRow(graduation()).length);
    });

    suite.test('揭露層級只允許 0~3；評級只允許 S/A/B/C', () => {
        assert.isTrue(validateNurtureRecordRow(graduation({ revelation_level: 4 })).some((e) => e.startsWith('revelation_level')));
        assert.isTrue(validateNurtureRecordRow(graduation({ rating: 'D' })).some((e) => e.startsWith('rating')));
    });

    suite.test('季度：結束季早於開始季會回報；JSON 欄位不可解析會回報', () => {
        assert.isTrue(validateNurtureRecordRow(graduation({ end_season: 0 })).some((e) => e.includes('不得早於 start_season')));
        assert.isTrue(validateNurtureRecordRow(graduation({ final_stats_json: '{STR:' })).some((e) => e.startsWith('final_stats_json')));
    });

    suite.test('畢業後寫入並可依 session 查詢；非法紀錄不寫入', () => {
        // 與 in-memory-table 相同的寫入規則：先驗證，通過才存入
        const table = new Map<string, NurtureRecordRow>();
        const insert = (row: NurtureRecordRow): void => {
            const errors = validateNurtureRecordRow(row);
            if (errors.length > 0) throw new Error(errors.join('；'));
            table.set(row.session_id, { ...row });
        };
        insert(graduation());
        assert.equals('A', table.get('NS_0007')?.rating);
        assert.equals('C201', table.get('NS_0007')?.child_uid);

        let rejected = false;
        try {
            insert(graduation({ session_id: 'NS_0008', rating: 'X' }));
        } catch {
            rejected = true;
        }
        assert.isTrue(rejected);
        assert.equals(1, table.size);
    });

    return suite;
}
