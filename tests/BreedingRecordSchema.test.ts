/**
 * BreedingRecordSchema — 結緣會話與子嗣的紀錄格式（BRD-12，PROG-2-0853）
 *
 * 驗證重點：
 *   1. 會話與子嗣的合法紀錄通過；缺欄位或非法列舉被回報
 *   2. 子嗣轉 Server 表列：Breeding_Mode 取會話值，Unveil_Season = Birth + 20
 *   3. 序列化後可讀回且內容一致（可序列化存取）
 *   4. 壞資料寫入時丟錯、讀回時丟錯，不產生半套資料
 */
import { assert, TestSuite } from './TestRunner';
import {
    BreedingSessionRecord,
    ChildRecord,
    parseBreedingRecords,
    serializeBreedingRecords,
    toServerChildRow,
    validateBreedingSession,
    validateChildRecord,
    validateServerChildRow,
} from '../assets/scripts/core/models/BreedingRecordSchema';

function session(overrides: Partial<BreedingSessionRecord> = {}): BreedingSessionRecord {
    return {
        Father_UID: 'G001',
        Mother_UID: 'G045',
        Breeding_Mode: 'Peace_Lineage',
        EP_Estimate: 93,
        Oracle_Hints: [{ Sage: '諸葛亮', Comment: '此子眉宇有靈氣' }],
        ...overrides,
    };
}

function child(overrides: Partial<ChildRecord> = {}): ChildRecord {
    return {
        UID: 'C201',
        Father_ID: 'G001',
        Mother_ID: 'G045',
        Age: 0,
        Status: 'Mystery',
        EP_Actual: 93,
        Is_Daqi: false,
        Omen_Type: 'Meteor',
        ...overrides,
    };
}

export function createBreedingRecordSchemaSuite(): TestSuite {
    const suite = new TestSuite('BreedingRecordSchema (結緣紀錄格式 BRD-12)');

    suite.test('合法的會話與子嗣通過驗證', () => {
        assert.equals(0, validateBreedingSession(session()).length);
        assert.equals(0, validateChildRecord(child()).length);
    });

    suite.test('會話：Breeding_Mode 只允許 Standard / Peace_Lineage，缺父母 UID 會回報', () => {
        assert.isTrue(validateBreedingSession(session({ Breeding_Mode: 'Fast' as never })).some((e) => e.startsWith('Breeding_Mode')));
        assert.isTrue(validateBreedingSession(session({ Father_UID: '' })).some((e) => e.startsWith('Father_UID')));
    });

    suite.test('子嗣：Is_Daqi 必須是布林、EP_Actual 必須是非負數', () => {
        assert.isTrue(validateChildRecord(child({ Is_Daqi: 'yes' as never })).some((e) => e.startsWith('Is_Daqi')));
        assert.isTrue(validateChildRecord(child({ EP_Actual: -1 })).some((e) => e.startsWith('EP_Actual')));
    });

    suite.test('轉 Server 表列：Breeding_Mode 取會話值，Unveil_Season = Birth_Season + 20', () => {
        const row = toServerChildRow(child(), session(), 12);
        assert.equals('C201', row.Child_UID);
        assert.equals('G001', row.Father_UID);
        assert.equals('G045', row.Mother_UID);
        assert.equals('Peace_Lineage', row.Breeding_Mode);
        assert.equals(93, row.EP_Actual);
        assert.equals(12, row.Birth_Season);
        assert.equals(32, row.Unveil_Season);
        assert.equals(0, validateServerChildRow(row).length);
    });

    suite.test('轉表列：Birth_Season 不是非負整數時丟錯', () => {
        let threw = false;
        try {
            toServerChildRow(child(), session(), -1);
        } catch {
            threw = true;
        }
        assert.isTrue(threw);
    });

    suite.test('Server 表列：Unveil_Season 偏離 Birth + 20 會回報', () => {
        const row = toServerChildRow(child(), session(), 12);
        const errors = validateServerChildRow({ ...row, Unveil_Season: 30 });
        assert.isTrue(errors.some((e) => e.includes('Birth_Season + 20')));
    });

    suite.test('序列化：寫出後讀回，會話與子嗣內容一致', () => {
        const json = serializeBreedingRecords(session(), [child(), child({ UID: 'C202', Is_Daqi: true })]);
        const parsed = parseBreedingRecords(json);
        assert.equals('G045', parsed.session.Mother_UID);
        assert.equals(2, parsed.children.length);
        assert.equals('C202', parsed.children[1].UID);
        assert.isTrue(parsed.children[1].Is_Daqi);
    });

    suite.test('序列化：寫入壞資料直接丟錯，不產生 JSON', () => {
        let threw = false;
        try {
            serializeBreedingRecords(session(), [child({ UID: '' })]);
        } catch {
            threw = true;
        }
        assert.isTrue(threw);
    });

    suite.test('讀回：Children 不是陣列或子嗣缺欄位時丟錯', () => {
        let threwShape = false;
        try {
            parseBreedingRecords(JSON.stringify({ Breeding_Session: session(), Children: 'x' }));
        } catch {
            threwShape = true;
        }
        assert.isTrue(threwShape);

        let threwChild = false;
        try {
            parseBreedingRecords(JSON.stringify({ Breeding_Session: session(), Children: [{ UID: 'C9' }] }));
        } catch {
            threwChild = true;
        }
        assert.isTrue(threwChild);
    });

    return suite;
}
