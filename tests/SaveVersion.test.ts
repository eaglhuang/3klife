/**
 * SaveVersion.test.ts — 存檔 semver 版號、遷移鏈與規格 envelope headless 測試（PROG-2-0334 / WBS DS-01、DS-03）
 *
 * Unity 對照：EditMode Test 直接驗證版本號比較與升級順序，不碰磁碟。
 */
import { assert, TestSuite } from './TestRunner';
import {
    compareSemver,
    EMPTY_SYNC_HASH,
    fromSaveEnvelope,
    parseSemver,
    runSemverMigrations,
    SAVE_VERSION_LATEST,
    SemverMigrationStep,
    saveVersionOf,
    toSaveEnvelope,
} from '../assets/scripts/core/storage/SaveVersion';
import { createPlayerSaveSnapshot, validatePlayerSaveSnapshot } from '../assets/scripts/core/services/PlayerSaveService';
import { createInitialGameTimeState } from '../assets/scripts/core/systems/GameClock';

type Data = Record<string, unknown>;

const stepA: SemverMigrationStep<Data> = {
    from: '1.0.0',
    to: '1.0.1',
    migrate: (data) => ({ ...data, a: 1 }),
};
const stepB: SemverMigrationStep<Data> = {
    from: '1.0.1',
    to: '1.1.0',
    migrate: (data) => ({ ...data, b: (data.a as number) + 1 }),
};

export function createSaveVersionSuite(): TestSuite {
    const suite = new TestSuite('SaveVersion (存檔 semver 與遷移鏈 DS-01 / DS-03)');

    suite.test('parseSemver：合法三段式通過，缺段或前導零不通過', () => {
        assert.equals(1, parseSemver('1.2.3')!.major);
        assert.equals(null, parseSemver('1.2'));
        assert.equals(null, parseSemver('01.0.0'));
        assert.equals(null, parseSemver(3));
    });

    suite.test('compareSemver：依 major → minor → patch 排序', () => {
        assert.isTrue(compareSemver('1.0.9', '1.1.0') < 0);
        assert.isTrue(compareSemver('2.0.0', '1.9.9') > 0);
        assert.equals(0, compareSemver('1.0.0', '1.0.0'));
    });

    suite.test('saveVersionOf：優先用 saveVersion；舊檔依整數 schemaVersion 對應；都沒有視為 1.0.0', () => {
        assert.equals('1.1.0', saveVersionOf({ saveVersion: '1.1.0', schemaVersion: 1 }));
        assert.equals('3.0.0', saveVersionOf({ schemaVersion: 3 }));
        assert.equals('1.0.0', saveVersionOf({}));
        assert.equals('1.0.0', saveVersionOf({ saveVersion: 'bogus' }));
        assert.equals(SAVE_VERSION_LATEST, '1.0.0');
    });

    suite.test('遷移鏈：從 1.0.0 依序跑 1.0.1、1.1.0，最後標記最新版', () => {
        const result = runSemverMigrations({ schemaVersion: 1 } as Data, [stepB, stepA], '1.1.0');
        assert.equals('1.1.0', result.version);
        assert.equals('1.1.0', result.data.saveVersion as string);
        assert.equals(1, result.data.a as number);
        assert.equals(2, result.data.b as number);
        assert.equals('1.0.0>1.0.1|1.0.1>1.1.0', result.applied.map((item) => `${item.from}>${item.to}`).join('|'));
    });

    suite.test('已是最新版時不跑任何步驟', () => {
        const result = runSemverMigrations({ saveVersion: '1.1.0' } as Data, [stepA, stepB], '1.1.0');
        assert.equals(0, result.applied.length);
        assert.equals(undefined, result.data.a);
    });

    suite.test('找不到升級路徑時拋錯，不默默覆蓋', () => {
        assert.throws(() => runSemverMigrations({} as Data, [stepB], '1.1.0'));
    });

    suite.test('envelope：五個頂層欄位齊全，Data 內不重複 saveVersion', () => {
        const snapshot = { saveVersion: '1.0.0', schemaVersion: 1, savedAt: '2026-10-14T00:00:00.000Z', roster: [] } as Data;
        const envelope = toSaveEnvelope(snapshot, { playerId: 'p1', actionRecords: [{ kind: 'train' }] });
        assert.equals(['Action_Records', 'Data', 'Last_Sync_Hash', 'Player_ID', 'Save_Version'].join(','), Object.keys(envelope).sort().join(','));
        assert.equals('p1', envelope.Player_ID);
        assert.equals('1.0.0', envelope.Save_Version);
        assert.equals(EMPTY_SYNC_HASH, envelope.Last_Sync_Hash);
        assert.equals(undefined, (envelope.Data as Data).saveVersion);
        assert.equals(1, envelope.Action_Records.length);
    });

    suite.test('envelope 往返：扁平存檔 → envelope → 扁平存檔，內容不變', () => {
        const snapshot = { schemaVersion: 1, savedAt: 'now', roster: [{ id: 'a' }], deck: ['x'] } as Data;
        const restored = fromSaveEnvelope(toSaveEnvelope(snapshot));
        assert.equals(JSON.stringify({ ...snapshot, saveVersion: '1.0.0' }), JSON.stringify(restored));
    });

    suite.test('PlayerSaveService：新存檔帶 saveVersion；舊檔（沒有此欄位）讀回補成 1.0.0', () => {
        const fresh = createPlayerSaveSnapshot(createInitialGameTimeState(), [], new Date(0));
        assert.equals(SAVE_VERSION_LATEST, fresh.saveVersion!);
        const legacy = JSON.parse(JSON.stringify(fresh));
        delete legacy.saveVersion;
        assert.equals('1.0.0', validatePlayerSaveSnapshot(legacy).saveVersion!);
    });

    return suite;
}
