/**
 * 離間歸屬（SCN-09，PROG-2-1995）：賈詡固有戰法 = sow-discord。
 * 西涼飛騎虎符資料庫沒有（只有西涼鐵騎），本卡不新增虎符定義，只在卡上回報。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { isBattleSkillImplemented } from '../assets/scripts/battle/skills/BattleSkillProfiles';

function readJson(rel: string): unknown {
    return JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8'));
}

export function createJiaXuDiscordOwnershipSuite(): TestSuite {
    const suite = new TestSuite('離間歸屬：賈詡固有戰法（PROG-2-1995）');

    suite.test('generals.json 的賈詡 skillId／battlePrimarySkillId 都是 sow-discord', () => {
        const list = readJson('assets/resources/data/generals.json') as Array<{ id: string; skillId?: string | null; battlePrimarySkillId?: string | null }>;
        const jia = list.find((g) => g.id === 'jia-xu');
        assert.isTrue(!!jia, '有賈詡');
        assert.equals('sow-discord', jia?.skillId);
        assert.equals('sow-discord', jia?.battlePrimarySkillId);
    });

    suite.test('master/generals-base.json 同步（避免 pipeline 重生時被洗掉）', () => {
        const base = readJson('assets/resources/data/master/generals-base.json') as { data?: Array<{ id: string; skillId?: string; battlePrimarySkillId?: string }> };
        const list = base.data ?? (base as unknown as Array<{ id: string; skillId?: string; battlePrimarySkillId?: string }>);
        const jia = list.find((g) => g.id === 'jia-xu');
        assert.equals('sow-discord', jia?.skillId);
        assert.equals('sow-discord', jia?.battlePrimarySkillId);
    });

    suite.test('sow-discord 在戰法管線已實作（賈詡放得出來）', () => {
        assert.isTrue(isBattleSkillImplemented('sow-discord'));
    });

    return suite;
}
