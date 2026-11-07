/**
 * PlayerSaveMigrationFixtures — 存檔遷移登錄慣例與逐版升級 fixture 守則（HOT-03；PROG-2-2060）
 *
 * 慣例：
 * - PLAYER_SAVE_MIGRATIONS 的步驟依版號連續（上一步的 to = 下一步的 from），最後一步升到 SAVE_VERSION_LATEST。
 * - 每一步在 tests/fixtures/save-migrations/<from>__<to>/ 放 before.json 與 after.json；
 *   用 migratePlayerSaveRaw 跑 before 必須得到 after。
 * - 最新版存檔再跑一次遷移不得改動內容（latest/save.json）。
 *
 * Unity 對照：像一組 EditMode 測試，替每個 Schema 升級步驟準備舊檔與預期新檔逐一比對。
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { compareSemver, SAVE_VERSION_LATEST, type SemverMigrationStep } from '../assets/scripts/core/storage/SaveVersion';
import { migratePlayerSaveRaw, PLAYER_SAVE_MIGRATIONS } from '../assets/scripts/core/storage/PlayerSaveMigrations';

type RawSave = Record<string, unknown>;

const FIXTURE_DIR = path.resolve(__dirname, 'fixtures/save-migrations');
const FIRST_SAVE_VERSION = '1.0.0';

function readJson(file: string): RawSave {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as RawSave;
}

/** 檢查登錄表與 fixture；回傳問題清單（空陣列代表符合慣例） */
function checkMigrationFixtures(steps: readonly SemverMigrationStep<RawSave>[], latest: string, dir: string): string[] {
    const issues: string[] = [];
    let expectedFrom = FIRST_SAVE_VERSION;
    for (const step of steps) {
        const id = `${step.from}__${step.to}`;
        if (step.from !== expectedFrom) issues.push(`${id}：from 應為 ${expectedFrom}，版號不連續`);
        if (compareSemver(step.to, step.from) <= 0) issues.push(`${id}：to 必須大於 from`);
        expectedFrom = step.to;
        const before = path.join(dir, id, 'before.json');
        const after = path.join(dir, id, 'after.json');
        if (!fs.existsSync(before) || !fs.existsSync(after)) {
            issues.push(`${id}：缺 before.json 或 after.json`);
            continue;
        }
        const actual = migratePlayerSaveRaw(readJson(before), steps.filter((s) => s === step), step.to);
        if (JSON.stringify(actual) !== JSON.stringify(readJson(after))) issues.push(`${id}：遷移結果與 after.json 不符`);
    }
    if (expectedFrom !== latest) issues.push(`登錄表最後版號 ${expectedFrom} 不等於 SAVE_VERSION_LATEST ${latest}`);
    return issues;
}

function writeFixture(dir: string, id: string, before: RawSave, after: RawSave): void {
    fs.mkdirSync(path.join(dir, id), { recursive: true });
    fs.writeFileSync(path.join(dir, id, 'before.json'), JSON.stringify(before));
    fs.writeFileSync(path.join(dir, id, 'after.json'), JSON.stringify(after));
}

export function createPlayerSaveMigrationFixturesSuite(): TestSuite {
    const suite = new TestSuite('PlayerSaveMigrationFixtures (遷移登錄慣例與逐版 fixture HOT-03 PROG-2-2060)');

    suite.test('PLAYER_SAVE_MIGRATIONS：版號連續、接到最新版，每一步 fixture 前後一致', () => {
        const issues = checkMigrationFixtures(PLAYER_SAVE_MIGRATIONS, SAVE_VERSION_LATEST, FIXTURE_DIR);
        assert.equals(0, issues.length, issues.join('\n'));
    });

    suite.test('最新版存檔再跑遷移不改內容', () => {
        const save = readJson(path.join(FIXTURE_DIR, 'latest/save.json'));
        assert.equals(SAVE_VERSION_LATEST, save.saveVersion);
        assert.equals(JSON.stringify(save), JSON.stringify(migratePlayerSaveRaw(save)));
    });

    suite.test('檢查器本身：缺 fixture、結果不符、版號不連續、沒接到最新版都會被抓到', () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'save-mig-'));
        try {
            const step1: SemverMigrationStep<RawSave> = { from: '1.0.0', to: '1.1.0', migrate: (d) => ({ ...d, gold: 0 }) };
            const step2: SemverMigrationStep<RawSave> = { from: '1.1.0', to: '1.2.0', migrate: (d) => ({ ...d, gems: 0 }) };
            const gap: SemverMigrationStep<RawSave> = { from: '1.3.0', to: '1.4.0', migrate: (d) => d };
            writeFixture(dir, '1.0.0__1.1.0', { saveVersion: '1.0.0' }, { saveVersion: '1.1.0', gold: 0 });
            assert.equals(0, checkMigrationFixtures([step1], '1.1.0', dir).length);
            writeFixture(dir, '1.1.0__1.2.0', { saveVersion: '1.1.0' }, { saveVersion: '1.2.0', gems: 99 });
            const issues = checkMigrationFixtures([step1, step2, gap], '1.5.0', dir);
            assert.equals(4, issues.length, issues.join('\n'));
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });

    return suite;
}
