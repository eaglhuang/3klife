/**
 * BreedingBirthRecord.test.ts — 結緣成功時的本機子嗣紀錄（BRD-12，PROG-2-0872）
 *
 * 檢查：只有結緣成功（conceived 且有子嗣）才產生紀錄；產出的會話與子嗣通過 BreedingRecordSchema；
 * 欄位缺漏時回報錯誤且不產生紀錄；GameSession 只存複本。
 *
 * Unity 對照：像 Event 觸發後才寫一筆存檔紀錄，寫入前先跑一次 Validate，失敗就不寫。
 */
import { assert, TestSuite } from './TestRunner';
import { buildBreedingBirthRecord } from '../assets/scripts/core/systems/BreedingBirthRecord';
import type { BreedingResult } from '../assets/scripts/core/systems/BreedingSystem';
import { GameSession } from '../assets/scripts/core/managers/GameSession';

function result(overrides: Partial<BreedingResult> = {}): BreedingResult {
    return {
        outcome: 'conceived',
        breedingMode: 'Peace_Lineage',
        reasons: [],
        conceptionRate: 0.5,
        father: { id: 'G001', name: '父' } as unknown as BreedingResult['father'],
        mother: { id: 'G045', name: '母' } as unknown as BreedingResult['mother'],
        child: { id: 'C100', name: '子', gender: '男', age: 0, status: 'Mystery' } as unknown as BreedingResult['child'],
        ep: { ep: 93 } as unknown as BreedingResult['ep'],
        ...overrides,
    };
}

export function createBreedingBirthRecordSuite(): TestSuite {
    const suite = new TestSuite('BreedingBirthRecord (結緣子嗣紀錄)');

    suite.test('結緣成功：產生通過 schema 的會話與子嗣紀錄，天象寫入 Omen_Type', () => {
        const built = buildBreedingBirthRecord(result(), 'meteor');
        assert.isTrue(built !== null);
        assert.equals(0, built!.errors.length);
        const record = built!.record!;
        assert.equals('G001', record.session.Father_UID);
        assert.equals('G045', record.session.Mother_UID);
        assert.equals('Peace_Lineage', record.session.Breeding_Mode);
        assert.equals(93, record.session.EP_Estimate);
        assert.equals(0, record.session.Oracle_Hints.length);
        assert.equals('C100', record.child.UID);
        assert.equals('G001', record.child.Father_ID);
        assert.equals('G045', record.child.Mother_ID);
        assert.equals('meteor', record.child.Omen_Type);
        assert.equals(false, record.child.Is_Daqi);
    });

    suite.test('沒有指定結緣模式時預設 Standard', () => {
        const built = buildBreedingBirthRecord(result({ breedingMode: undefined }), 'deer-grass');
        assert.equals('Standard', built!.record!.session.Breeding_Mode);
    });

    suite.test('結緣失敗或被擋下：不產生紀錄，也不算錯誤', () => {
        assert.equals(null, buildBreedingBirthRecord(result({ outcome: 'failed', child: undefined }), 'meteor'));
        assert.equals(null, buildBreedingBirthRecord(result({ outcome: 'blocked', child: undefined }), 'meteor'));
    });

    suite.test('子嗣資料不合法：回報錯誤，record 為 null（不寫入半套資料）', () => {
        const badChild = { id: '', name: '子', gender: '男', age: 0, status: 'Mystery' } as unknown as BreedingResult['child'];
        const built = buildBreedingBirthRecord(result({ child: badChild }), 'meteor');
        assert.isTrue(built !== null);
        assert.isTrue(built!.errors.length > 0);
        assert.equals(null, built!.record);
    });

    suite.test('GameSession 記下紀錄後回傳複本，外部改動不影響內部', () => {
        const session = new GameSession();
        const record = buildBreedingBirthRecord(result(), 'purple-qi')!.record!;
        session.recordBreedingBirth(record);
        const copy = session.breedingBirthRecords();
        assert.equals(1, copy.length);
        copy[0].child.Omen_Type = 'deer-grass';
        copy[0].session.Oracle_Hints.push({ Sage: '甲', Comment: '乙' });
        const again = session.breedingBirthRecords();
        assert.equals('purple-qi', again[0].child.Omen_Type);
        assert.equals(0, again[0].session.Oracle_Hints.length);
    });

    return suite;
}
