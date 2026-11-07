/**
 * IdContractValidator — 全域識別碼命名契約（doc_spec_0335；PROG-2-2021）
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { findIdViolations, validateId } from '../assets/scripts/core/models/IdContractValidator';

const CASES: Record<string, [string[], string[]]> = {
    UID: [['u_3fa85f64', 'u_0123456789abcdef'], ['u_3FA85F64', 'u_3fa8-5f64']],
    Template_ID: [['cai_wenji', 'cao-cao'], ['Guan_Yu', 'gy']],
    Bloodline_ID: [['BLOOD_LIU', 'BL_SUN_01'], ['blood_liu', 'BLD_LIU']],
    Gene_ID: [['brave_vanguard', 'GENE_STR_01'], ['Gene_x', 'gene-x']],
    V_PID: [['V_ANCESTOR_001', 'V_ABC'], ['V_AB', 'v_ancestor']],
    SIGIL: [['SIGIL_TIGER_01', 'SIGIL_X'], ['SIGIL-TIGER', 'sigil_tiger']],
    SPIRIT_TALLY: [['TALLY_DRAGON_SCALE', 'TALLY_1'], ['TALLY-1', 'TIGER_TALLY']],
    ATM_ID: [['PROG-2-1902', 'UI-2-0117'], ['PROG-2-190', 'prog-2-1902']],
};

function readData(rel: string): any {
    return JSON.parse(fs.readFileSync(path.join(__dirname, '..', rel), 'utf8'));
}

export function createIdContractCoreSuite(): TestSuite {
    const suite = new TestSuite('IdContractCore (識別碼契約 doc_spec_0335 PROG-2-2021)');

    suite.test('§4 八大類別正負例各 2 組', () => {
        for (const category of Object.keys(CASES)) {
            const [good, bad] = CASES[category];
            for (const id of good) assert.isTrue(validateId(category, id).valid, `${category} 應通過 ${id}`);
            for (const id of bad) {
                const r = validateId(category, id);
                assert.isFalse(r.valid, `${category} 應拒絕 ${id}`);
                assert.isTrue((r.errorReason ?? '').includes(category));
            }
        }
    });

    suite.test('未知類別與非字串判失敗', () => {
        assert.equals('Unknown ID Category', validateId('FOO', 'x').errorReason!);
        assert.isFalse(validateId('UID', 123).valid);
    });

    suite.test('§4 現況 generals.json 與因子字典違規數為 0', () => {
        const raw = readData('assets/resources/data/generals.json');
        const generals: any[] = Array.isArray(raw) ? raw : (raw.data ?? raw.generals ?? Object.values(raw));
        assert.equals(0, findIdViolations('Template_ID', generals.map((g) => g.id)).length);
        assert.equals(0, findIdViolations('Bloodline_ID', generals.map((g) => g.bloodlineId).filter((b) => b)).length);
        const genes: any[] = readData('assets/resources/data/master/gene-dictionary.json').data;
        assert.equals(0, findIdViolations('Gene_ID', genes.map((g) => g.id)).length);
    });

    return suite;
}
