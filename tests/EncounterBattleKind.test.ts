/**
 * EncounterBattleKind — 關卡戰場類型資料的 headless 測試（PROG-2-0238）
 *
 * PM 裁定：攻打城池、關隘、要塞的關卡算攻城，其他都算野戰。
 * 虎牢關（encounter-001）標為攻城，長板坡（encounter-002）為野戰。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';

const ENCOUNTERS_PATH = path.join(__dirname, '..', 'assets', 'resources', 'data', 'encounters.json');

interface EncounterRow { id: string; battleKind?: string }

function loadEncounters(): EncounterRow[] {
    const raw = JSON.parse(fs.readFileSync(ENCOUNTERS_PATH, 'utf8')) as { encounters: EncounterRow[] };
    return raw.encounters;
}

export function createEncounterBattleKindSuite(): TestSuite {
    const suite = new TestSuite('EncounterBattleKind (關卡戰場類型 PROG-2-0238)');

    suite.test('每一關都有明確的 battleKind（field 或 siege），不留空', () => {
        for (const e of loadEncounters()) {
            assert.isTrue(e.battleKind === 'field' || e.battleKind === 'siege', `${e.id} 缺 battleKind`);
        }
    });

    suite.test('虎牢關標為攻城，長板坡標為野戰', () => {
        const byId = new Map(loadEncounters().map((e) => [e.id, e.battleKind]));
        assert.equals('siege', byId.get('encounter-001') ?? '');
        assert.equals('field', byId.get('encounter-002') ?? '');
    });

    return suite;
}
