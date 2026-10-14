import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, TestSuite } from './TestRunner';
import { battleVoiceKeyOf, portraitKeyOf, validateInitialHeroes } from '../assets/scripts/core/systems/InitialHeroTable';

function readJson(relative: string): any {
    return JSON.parse(readFileSync(join(__dirname, '..', relative), 'utf8'));
}

/** generals.json 可能是陣列或帶 generals 欄位的物件，兩種都要認。 */
function knownGeneralIds(): Set<string> {
    const raw = readJson('assets/resources/data/generals.json');
    const list: Array<{ id?: string }> = Array.isArray(raw) ? raw : (raw.generals ?? Object.values(raw));
    return new Set(list.map(g => g.id).filter((id): id is string => typeof id === 'string'));
}

function clone(): any {
    return readJson('assets/resources/data/initial-heroes.json');
}

export function createInitialHeroTableSuite(): TestSuite {
    const suite = new TestSuite('InitialHeroTable (OPEN-02 初始六名將資料表)');

    suite.test('正式資料檔通過驗證，六人依固定順序回傳，台詞留空', () => {
        const result = validateInitialHeroes(clone(), knownGeneralIds());
        assert.equals(true, result.ok);
        if (!result.ok) return;
        assert.equals(6, result.heroes.length);
        assert.equals('zhang-fei', result.heroes[0].generalId);
        assert.equals('幽州涿郡', result.heroes[0].originRegion);
        assert.equals('燕人', result.heroes[0].coreFactorTag);
        assert.equals('', result.heroes[0].introLine);
    });

    suite.test('立繪與語音鍵依 generalId 推導，格式與既有資料一致', () => {
        assert.equals('portraits/generals/liu-bei', portraitKeyOf('liu-bei'));
        assert.equals('audio/voice/generals/liu-bei/battle', battleVoiceKeyOf('liu-bei'));
    });

    suite.test('缺少一位初始名將時拒絕', () => {
        const raw = clone();
        raw.heroes = raw.heroes.filter((h: { generalId: string }) => h.generalId !== 'gan-ning');
        const result = validateInitialHeroes(raw, knownGeneralIds());
        assert.equals(false, result.ok);
        assert.equals(true, !result.ok && result.issues.some(i => i.message.includes('gan-ning')));
    });

    suite.test('generalId 不在 generals.json 時拒絕', () => {
        const raw = clone();
        raw.heroes[0].generalId = 'no-such-general';
        const result = validateInitialHeroes(raw, knownGeneralIds());
        assert.equals(false, result.ok);
    });

    suite.test('主因子不在核心因子標籤內時拒絕', () => {
        const raw = clone();
        raw.heroes[1].coreFactorTag = '不存在的標籤';
        const result = validateInitialHeroes(raw, knownGeneralIds());
        assert.equals(false, result.ok);
        assert.equals(true, !result.ok && result.issues.some(i => i.path.endsWith('coreFactorTag')));
    });

    suite.test('出生地空白或 introLine 非字串時拒絕，並列出全部問題', () => {
        const raw = clone();
        raw.heroes[2].originRegion = '  ';
        raw.heroes[3].introLine = 42;
        const result = validateInitialHeroes(raw, knownGeneralIds());
        assert.equals(false, result.ok);
        assert.equals(true, !result.ok && result.issues.length >= 2);
    });

    suite.test('重複 generalId 時拒絕', () => {
        const raw = clone();
        raw.heroes[5].generalId = 'zhang-fei';
        const result = validateInitialHeroes(raw, knownGeneralIds());
        assert.equals(false, result.ok);
        assert.equals(true, !result.ok && result.issues.some(i => i.message.includes('重複')));
    });

    return suite;
}
