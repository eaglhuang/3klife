import { TestSuite, assert } from './TestRunner';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { PlayerSaveService, PLAYER_SAVE_KEY, validatePlayerSaveSnapshot } from '../assets/scripts/core/services/PlayerSaveService';
import type { BreedingBirthRecord } from '../assets/scripts/core/systems/BreedingBirthRecord';
import { normalizeBreedingBirthRecords } from '../assets/scripts/core/systems/BreedingBirthRecordSave';

function birth(uid = 'child-1'): BreedingBirthRecord {
    return {
        session: {
            Father_UID: 'father', Mother_UID: 'mother', Breeding_Mode: 'Peace_Lineage',
            EP_Estimate: 93, Oracle_Hints: [{ Sage: '諸葛亮', Comment: '已保存的原始批語' }],
        },
        child: {
            UID: uid, Father_ID: 'father', Mother_ID: 'mother', Age: 0, Status: 'Mystery',
            EP_Actual: 93, Is_Daqi: true, Omen_Type: 'meteor',
        },
    };
}

function sessionOn(adapter: MemoryStorageAdapter): GameSession {
    const session = new GameSession(1146);
    session.setSaveService(new PlayerSaveService(adapter));
    return session;
}

export function createBreedingBirthRecordSaveSuite(): TestSuite {
    const suite = new TestSuite('BreedingBirthRecordSave (PROG-2-1146)');

    suite.test('紀錄經真實 JSON 存檔，新的 GameSession 完整還原兩筆不同子嗣', async () => {
        const adapter = new MemoryStorageAdapter();
        const source = sessionOn(adapter);
        source.recordBreedingBirth(birth());
        source.recordBreedingBirth(birth('child-2'));
        await source.save();
        const raw = await adapter.get<unknown>(PLAYER_SAVE_KEY);
        await adapter.set(PLAYER_SAVE_KEY, JSON.parse(JSON.stringify(raw)));
        const restored = sessionOn(adapter);
        assert.isTrue(await restored.load());
        assert.equals(JSON.stringify([birth(), birth('child-2')]), JSON.stringify(restored.breedingBirthRecords()));
    });

    suite.test('缺欄位舊檔載入已有紀錄的 session 會清空，不猜測或沿用前局資料', async () => {
        const adapter = new MemoryStorageAdapter();
        const snapshot = sessionOn(adapter).createSnapshot();
        delete snapshot.breedingBirthRecords;
        await adapter.set(PLAYER_SAVE_KEY, snapshot);
        const target = sessionOn(adapter);
        target.recordBreedingBirth(birth());
        assert.isTrue(await target.load());
        assert.equals(0, target.breedingBirthRecords().length);
    });

    suite.test('相同 UID 寫入與衝突寫入都保留首筆有效紀錄', () => {
        const session = new GameSession();
        session.recordBreedingBirth(birth());
        session.recordBreedingBirth(birth());
        const conflict = birth();
        conflict.child.EP_Actual = 12;
        conflict.child.Omen_Type = 'purple-qi';
        session.recordBreedingBirth(conflict);
        assert.equals(JSON.stringify([birth()]), JSON.stringify(session.breedingBirthRecords()));
    });

    suite.test('磁碟有重複 UID：反覆讀同一存檔仍僅一筆，衝突保留首筆', async () => {
        const adapter = new MemoryStorageAdapter();
        const snapshot = sessionOn(adapter).createSnapshot();
        const conflict = birth();
        conflict.child.EP_Actual = 10;
        snapshot.breedingBirthRecords = [birth(), conflict, birth()];
        await adapter.set(PLAYER_SAVE_KEY, snapshot);
        const target = sessionOn(adapter);
        await target.load();
        await target.load();
        assert.equals(JSON.stringify([birth()]), JSON.stringify(target.breedingBirthRecords()));
        await target.save();
        const saved = await adapter.get<typeof snapshot>(PLAYER_SAVE_KEY);
        assert.equals(1, saved!.breedingBirthRecords!.length);
    });

    suite.test('輸入、getter 與快照的批語物件／陣列都無法改動 session', () => {
        const session = new GameSession();
        const input = birth();
        session.recordBreedingBirth(input);
        input.child.Omen_Type = 'changed';
        input.session.Oracle_Hints[0].Comment = 'changed';
        input.session.Oracle_Hints.push({ Sage: '甲', Comment: '乙' });
        const copy = session.breedingBirthRecords();
        copy[0].session.Oracle_Hints[0].Sage = 'changed';
        copy[0].child.EP_Actual = 0;
        copy.push(birth('extra'));
        const snapshot = session.createSnapshot();
        snapshot.breedingBirthRecords![0].session.Oracle_Hints[0].Comment = 'changed';
        snapshot.breedingBirthRecords!.length = 0;
        assert.equals(JSON.stringify([birth()]), JSON.stringify(session.breedingBirthRecords()));
    });

    suite.test('存檔驗證也複製巢狀批語，不與呼叫端原始物件共用', () => {
        const raw = new GameSession().createSnapshot();
        raw.breedingBirthRecords = [birth()];
        const validated = validatePlayerSaveSnapshot(raw);
        validated.breedingBirthRecords![0].session.Oracle_Hints[0].Comment = 'changed';
        assert.equals('已保存的原始批語', raw.breedingBirthRecords[0].session.Oracle_Hints[0].Comment);
    });

    suite.test('壞紀錄與父母不一致被丟棄；無效首筆不阻擋同 UID 後續有效紀錄', () => {
        const invalid = birth();
        invalid.child.UID = '';
        const mismatch = birth();
        mismatch.session.Father_UID = 'other-father';
        const invalidHints = birth();
        invalidHints.session.Oracle_Hints = [null as unknown as { Sage: string; Comment: string }];
        const out = normalizeBreedingBirthRecords([null, 1, [], {}, { session: 1, child: {} }, invalid, mismatch, invalidHints, birth()]);
        assert.equals(JSON.stringify([birth()]), JSON.stringify(out));
        for (const raw of [undefined, null, {}, 'bad']) assert.equals(0, normalizeBreedingBirthRecords(raw).length);
    });

    suite.test('新遊戲清空紀錄；保存後重開也不復活舊紀錄', async () => {
        const adapter = new MemoryStorageAdapter();
        const source = sessionOn(adapter);
        source.recordBreedingBirth(birth());
        await source.save();
        source.startNewGame(2);
        assert.equals(0, source.breedingBirthRecords().length);
        await source.save();
        const restored = sessionOn(adapter);
        await restored.load();
        assert.equals(0, restored.breedingBirthRecords().length);
    });

    suite.test('沿用備份恢復流程，主檔損壞後出生紀錄仍完整', async () => {
        const adapter = new MemoryStorageAdapter();
        const source = sessionOn(adapter);
        source.recordBreedingBirth(birth());
        await source.save();
        await source.save();
        await adapter.set(PLAYER_SAVE_KEY, { broken: true });
        const service = new PlayerSaveService(adapter);
        const restored = new GameSession();
        restored.setSaveService(service);
        assert.isTrue(await restored.load());
        assert.isTrue(service.lastLoadRecoveredFromBackup());
        assert.equals(JSON.stringify([birth()]), JSON.stringify(restored.breedingBirthRecords()));
    });

    suite.test('主檔寫入失敗不宣稱成功，上一份紀錄保留；重試後保存新紀錄', async () => {
        class FailingStorage extends MemoryStorageAdapter {
            fail = false;
            async set<T>(key: string, value: T): Promise<void> {
                if (this.fail && key === PLAYER_SAVE_KEY) throw new Error('write failed');
                return super.set(key, value);
            }
        }
        const adapter = new FailingStorage();
        const source = sessionOn(adapter);
        source.recordBreedingBirth(birth());
        await source.save();
        source.recordBreedingBirth(birth('child-2'));
        adapter.fail = true;
        let rejected = false;
        try { await source.save(); } catch { rejected = true; }
        assert.isTrue(rejected);
        const restored = sessionOn(adapter);
        await restored.load();
        assert.equals(JSON.stringify([birth()]), JSON.stringify(restored.breedingBirthRecords()));
        adapter.fail = false;
        await source.save();
        await restored.load();
        assert.equals(2, restored.breedingBirthRecords().length);
    });

    return suite;
}
