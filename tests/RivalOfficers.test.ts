/**
 * RivalOfficers.test.ts — 他國武將與虎符名冊（PROG-2-1712）
 */
import { assert, TestSuite } from './TestRunner';
import { NATION_DEFS } from '../assets/scripts/core/systems/RivalNations';
import { buildRivalOfficers, RivalGeneralSource, RivalRostersConfig } from '../assets/scripts/core/systems/RivalOfficers';

function loadJson<T>(rel: string): T {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as typeof import('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path') as typeof import('path');
    return JSON.parse(fs.readFileSync(path.join(__dirname, '..', rel), 'utf8')) as T;
}

const CONFIG = loadJson<RivalRostersConfig>('assets/resources/data/rival-rosters.json');
const GENERALS = loadJson<RivalGeneralSource[]>('assets/resources/data/generals.json');

export function createRivalOfficersSuite(): TestSuite {
    const suite = new TestSuite('RivalOfficers');

    suite.test('設定涵蓋八國，君主列第一，所有武將 id 都存在且不重複', () => {
        const ids = new Set(GENERALS.map((g) => g.id));
        const seen = new Set<string>();
        for (const def of NATION_DEFS) {
            const entry = CONFIG.nations[def.id];
            assert.isTrue(!!entry, `${def.id} 有名冊`);
            assert.equals(entry.generals[0], def.leaderId, `${def.id} 君主`);
            for (const id of entry.generals) {
                assert.isTrue(ids.has(id), `${id} 存在於 generals.json`);
                assert.isFalse(seen.has(id), `${id} 只屬一國`);
                seen.add(id);
            }
        }
    });

    suite.test('名冊帶入年齡、精力與五維；虎符初始未裝備', () => {
        const rosters = buildRivalOfficers(CONFIG, GENERALS);
        const cao = rosters.wei.officers[0];
        assert.equals(cao.generalId, 'cao-cao', '曹操');
        assert.equals(cao.age, 36, '年齡');
        assert.equals(cao.vitality, 100, '精力');
        assert.equals(cao.baseStats.int, 94, '智力');
        assert.equals(rosters.wei.tallies[0].equippedGeneralId, null, '未裝備');
        assert.equals(rosters.wei.tallies[0].starExp, 0, '星級經驗');
    });

    suite.test('玩家已擁有與資料不存在的武將略過', () => {
        const config: RivalRostersConfig = { nations: { shu: { generals: ['liu-bei', 'zhao-yun', 'no-such-general'], tallies: [] } } };
        const rosters = buildRivalOfficers(config, GENERALS, new Set(['zhao-yun']));
        assert.equals(rosters.shu.officers.map((o) => o.generalId).join(','), 'liu-bei', '只剩劉備');
    });

    suite.test('同一武將被列在兩國時只歸先列的國家', () => {
        const config: RivalRostersConfig = { nations: { a: { generals: ['lu-bu'], tallies: [] }, b: { generals: ['lu-bu', 'diao-chan'], tallies: [] } } };
        const rosters = buildRivalOfficers(config, GENERALS);
        assert.equals(rosters.a.officers.length, 1, 'a 有呂布');
        assert.equals(rosters.b.officers.map((o) => o.generalId).join(','), 'diao-chan', 'b 只有貂蟬');
    });

    suite.test('缺欄位用預設值，星級至少 1', () => {
        const config: RivalRostersConfig = { nations: { x: { generals: ['bare'], tallies: [{ id: 't', quality: 'R', troopType: 'archer', star: 0 }] } } };
        const rosters = buildRivalOfficers(config, [{ id: 'bare' }]);
        assert.equals(rosters.x.officers[0].age, 30, '預設年齡');
        assert.equals(rosters.x.officers[0].vitality, 100, '預設精力');
        assert.equals(rosters.x.tallies[0].star, 1, '星級下限');
    });

    return suite;
}
