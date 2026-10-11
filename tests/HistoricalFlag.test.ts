import { assert, TestSuite } from './TestRunner';
import { isTallyEligible } from '../assets/scripts/core/systems/TigerTally';
import { toTigerTallyGeneral } from '../assets/scripts/core/services/LegacyService';
import type { BreedingGeneral } from '../assets/scripts/core/systems/BreedingSystem';
import { Faction } from '../assets/scripts/shared/CommonEnums';

const fs = require('fs') as typeof import('fs');
const path = require('path') as typeof import('path');
interface Person { uid: string; is_virtual?: boolean }
interface Flagged { id: string; isHistorical?: boolean }
interface FlagReport { total: number; trueCount: number; falseCount: number; registryOnlyHistorical: string[]; errors: string[] }
const validator = require('../tools_node/validate-historical-flag.js') as {
    createHistoricalMap(persons: Person[]): Map<string, boolean>;
    compareHistoricalFlags(generals: Flagged[], persons: Person[]): FlagReport;
};
function throws(action: () => unknown): void {
    let failed = false;
    try { action(); } catch { failed = true; }
    assert.isTrue(failed);
}
function general(extra: Partial<BreedingGeneral & { isHistorical: boolean }> = {}): BreedingGeneral & { isHistorical?: boolean } {
    return { id: 'hero', name: 'hero', hp: 1000, faction: Faction.Player, gender: '男',
        characterCategory: 'famed', templateId: 'GEN_SHU_HERO', ...extra };
}

export function createHistoricalFlagSuite(): TestSuite {
    const suite = new TestSuite('HistoricalFlag (正式身份來源)');
    suite.test('比對來源、布林 false 與獨有史實清單', () => {
        const result = validator.compareHistoricalFlags([{ id: 'real', isHistorical: true }, { id: 'virtual', isHistorical: false }],
            [{ uid: 'real', is_virtual: false }, { uid: 'virtual', is_virtual: true }, { uid: 'extra', is_virtual: false }]);
        assert.equals(0, result.errors.length);
        assert.equals(2, result.total);
        assert.equals(1, result.trueCount);
        assert.equals(1, result.falseCount);
        assert.equals('extra', result.registryOnlyHistorical[0]);
    });
    suite.test('缺布林旗標、錯值與找不到 uid 報錯', () => {
        for (const generals of [[{ id: 'real' }], [{ id: 'real', isHistorical: false }], [{ id: 'missing', isHistorical: true }]]) {
            assert.isTrue(validator.compareHistoricalFlags(generals, [{ uid: 'real', is_virtual: false }]).errors.length > 0);
        }
    });
    suite.test('registry 缺 is_virtual 或重複 uid 不猜測', () => {
        throws(() => validator.createHistoricalMap([{ uid: 'missing' }]));
        throws(() => validator.createHistoricalMap([{ uid: 'duplicate', is_virtual: false }, { uid: 'duplicate', is_virtual: true }]));
    });
    suite.test('真實 generals 與索引旗標均與 registry 一致', () => {
        const data = path.resolve(__dirname, '../assets/resources/data');
        const generals = JSON.parse(fs.readFileSync(path.join(data, 'generals.json'), 'utf8')) as Flagged[];
        const persons = (JSON.parse(fs.readFileSync(path.join(data, 'person-registry.json'), 'utf8')) as { persons: Person[] }).persons;
        const result = validator.compareHistoricalFlags(generals, persons);
        assert.equals(0, result.errors.length);
        assert.equals(235, result.total);
        assert.equals(235, result.trueCount);
        assert.equals(0, result.falseCount);
        assert.equals(12, result.registryOnlyHistorical.length);
        const index = JSON.parse(fs.readFileSync(path.join(data, 'generals-index.json'), 'utf8')) as { data: Array<{ uid: string; isHistorical: boolean }> };
        const flags = new Map(generals.map(g => [g.id, g.isHistorical]));
        for (const record of index.data) assert.equals(flags.get(record.uid), record.isHistorical);
    });
    suite.test('正式 true 優先；false 仍允許女性正式模板；一般子嗣拒絕', () => {
        assert.isTrue(isTallyEligible({ id: 'real', isHistorical: true }));
        assert.isTrue(isTallyEligible({ id: 'real-civilian', isHistorical: true, characterCategory: 'civilian' }));
        assert.isTrue(isTallyEligible({ id: 'female', isHistorical: false, gender: '女', templateId: 'GEN_FEMALE', characterCategory: 'mythical' }));
        assert.isFalse(isTallyEligible({ id: 'child', isHistorical: false }));
    });
    suite.test('Legacy 明確旗標優先，即使有父母或出生季也保留正式 true', () => {
        assert.equals(true, toTigerTallyGeneral(general({ isHistorical: true, fatherId: 'father', birthSeason: 1 })).isHistorical);
        assert.equals(false, toTigerTallyGeneral(general({ isHistorical: false })).isHistorical);
        assert.isTrue(isTallyEligible(toTigerTallyGeneral(general({ isHistorical: false, gender: '女' }))));
    });
    suite.test('舊資料缺欄位維持原模板推定與子嗣排除', () => {
        assert.isTrue(isTallyEligible(toTigerTallyGeneral(general())));
        assert.isFalse(isTallyEligible(toTigerTallyGeneral(general({ fatherId: 'father' }))));
        assert.isFalse(isTallyEligible(toTigerTallyGeneral(general({ templateId: undefined }))));
        assert.isTrue(isTallyEligible({ id: 'female-old', gender: '女', templateId: 'GEN_FEMALE', characterCategory: 'famed' }));
    });
    return suite;
}
