import { assert, TestSuite } from './TestRunner';
import {
    analyzeTagResonance,
    FAMILY_TRADITION_MIN_COUNT,
    parseDynamicRelation,
    parseHistoricalRelation,
} from '../assets/scripts/core/systems/KinRelation';
import { computeEpMvp, EP_RESONANCE_MIN_COUNT } from '../assets/scripts/core/systems/BreedingSystem';

const validHistorical = {
    relationId: 'REL_ZHOU_XIAO',
    templateA: 'zhou-yu',
    templateB: 'xiao-qiao',
    type: 'COUPLE',
    epBonus: 25,
    extraEffects: { conceptionRateMod: 1.2 },
    loreKey: 'LORE_REL_COUPLE_01',
};

const validDynamic = {
    uidA: 'liu-bei-uid',
    uidB: 'guan-yu-uid',
    type: 'DYNAMIC_SWORN',
    intimacy: 40,
    createdSeason: 3,
    decayRate: 2,
};

export function createKinRelationSuite(): TestSuite {
    const suite = new TestSuite('KinRelation (KIN-01 關係 Schema / KIN-03 相性標籤引擎)');

    suite.test('史實關係：合法資料通過並保留額外效果', () => {
        const result = parseHistoricalRelation(validHistorical);
        assert.isTrue(result.ok);
        if (!result.ok) return;
        assert.equals('COUPLE', result.value.type);
        assert.equals(25, result.value.epBonus);
        assert.equals(1.2, result.value.extraEffects.conceptionRateMod);
        assert.isTrue(result.value.extraEffects.loyaltyBonus === undefined);
    });

    suite.test('史實關係：拒絕未知類型、自我配對、缺欄位與非有限數值', () => {
        const cases: Array<[Record<string, unknown>, string]> = [
            [{ ...validHistorical, type: 'PARENT_CHILD' }, 'unknown-type'],
            [{ ...validHistorical, templateB: 'zhou-yu' }, 'self-relation'],
            [{ ...validHistorical, templateB: '' }, 'missing-template'],
            [{ ...validHistorical, loreKey: undefined }, 'missing-lore-key'],
            [{ ...validHistorical, epBonus: NaN }, 'invalid-ep-bonus'],
            [{ ...validHistorical, extraEffects: { loyaltyBonus: 'high' } }, 'invalid-loyaltyBonus'],
        ];
        for (const [raw, reason] of cases) {
            const result = parseHistoricalRelation(raw);
            assert.isFalse(result.ok);
            if (!result.ok) assert.equals(reason, result.reason);
        }
        assert.equals('not-an-object', (parseHistoricalRelation(null) as { reason: string }).reason);
    });

    suite.test('動態關係：合法資料通過；親密度超界與未知類型被拒絕', () => {
        assert.isTrue(parseDynamicRelation(validDynamic).ok);
        const outOfRange = parseDynamicRelation({ ...validDynamic, intimacy: 101 });
        assert.isFalse(outOfRange.ok);
        if (!outOfRange.ok) assert.equals('intimacy-out-of-range', outOfRange.reason);
        const unknown = parseDynamicRelation({ ...validDynamic, type: 'COUPLE' });
        assert.isFalse(unknown.ok);
        if (!unknown.ok) assert.equals('unknown-type', unknown.reason);
    });

    suite.test('標籤引擎：同一標籤在 3 位祖先身上即達血脈共鳴，與 EP 門檻一致', () => {
        assert.equals(3, EP_RESONANCE_MIN_COUNT);
        const r = analyzeTagResonance([['wei'], ['wei'], ['wei', 'shu'], ['wu']]);
        assert.equals('wei', r.topTag);
        assert.equals(3, r.topTagCount);
        assert.isTrue(r.resonance);
        assert.isFalse(r.familyTradition);
    });

    suite.test('標籤引擎：未達 3 人不共鳴；同一祖先重複標籤只計一次', () => {
        const r = analyzeTagResonance([['wei', 'wei', 'wei'], ['wei'], ['shu']]);
        assert.equals(2, r.topTagCount);
        assert.isFalse(r.resonance);
    });

    suite.test('標籤引擎：5 位以上同標籤觸發家風傳承；並列取字典序較前者', () => {
        const five = Array.from({ length: FAMILY_TRADITION_MIN_COUNT }, () => ['zhao']);
        const r = analyzeTagResonance([...five, ['cao'], ['cao'], ['cao'], ['cao'], ['cao']]);
        assert.equals('cao', r.topTag);
        assert.equals(5, r.topTagCount);
        assert.isTrue(r.familyTradition);
        assert.isTrue(r.resonance);
    });

    suite.test('標籤引擎：空輸入無共鳴，topTag 為 null', () => {
        const r = analyzeTagResonance([]);
        assert.isTrue(r.topTag === null);
        assert.equals(0, r.topTagCount);
        assert.isFalse(r.resonance);
        assert.isFalse(r.familyTradition);
    });

    suite.test('與 computeEpMvp 的 topTag / 共鳴判定一致（同一組 14 人輸入）', () => {
        const tagsByUid: Record<string, string[]> = {
            a: ['wei'], b: ['wei'], c: ['wei', 'shu'], d: ['wu'],
            e: [], f: [], g: [], h: [], i: [], j: [], k: [], l: [], m: [], n: [],
        };
        const slots = ['F', 'M', 'FF', 'FM', 'MF', 'MM', 'FFF', 'FFM', 'FMF', 'FMM', 'MFF', 'MFM', 'MMF', 'MMM'];
        const uids = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n'];
        const pedigree = Object.fromEntries(slots.map((slot, i) => [slot, uids[i]])) as never;
        const profiles = new Map(uids.map((uid) => [uid, { uid, tags: tagsByUid[uid], factorIds: [] }]));
        const ep = computeEpMvp(pedigree, profiles as never, false);
        const engine = analyzeTagResonance(uids.map((uid) => tagsByUid[uid]));
        assert.equals(ep.topTag, engine.topTag);
        assert.equals(ep.topTagCount, engine.topTagCount);
        assert.equals(engine.resonance ? 15 : 0, ep.resonance);
        assert.equals(engine.familyTradition, ep.familyTradition);
        assert.isFalse(ep.familyTradition);
    });

    return suite;
}
