/**
 * MentorSources.test.ts — 教官卡五來源標記與持有清單 headless 測試（PROG-2-0277 / MENT-02）
 *
 * Unity 對照：等同 EditMode Test，驗證 AddItem 的來源標記與重複 uid 規則，不開 Scene。
 */
import { assert, TestSuite } from './TestRunner';
import { MENTOR_SOURCES } from '../assets/scripts/core/models/MentorCard';
import type { MentorCard, MentorSource } from '../assets/scripts/core/models/MentorCard';
import { addMentorToHoldings, isMentorSource, tagMentorSource } from '../assets/scripts/core/systems/MentorSources';

function card(uid: string): MentorCard {
    return {
        uid,
        sourceGeneralId: uid,
        name: uid,
        faction: 'shu',
        retiredAge: 65,
        retiredSeason: 1,
        retiredYear: 200,
        ep_snapshot: 50,
        gene_refs: [],
        parentUids: ['', ''],
        generalSnapshot: {} as MentorCard['generalSnapshot'],
    };
}

export function createMentorSourcesSuite(): TestSuite {
    const suite = new TestSuite('MentorSources (MENT-02 教官五來源標記)');

    suite.test('五種來源與規格 Schema 的 ENUM 一致', () => {
        assert.equals(JSON.stringify(['Gacha', 'Retire', 'Capture', 'Mercenary', 'Offspring']), JSON.stringify(MENTOR_SOURCES));
        for (const source of MENTOR_SOURCES) assert.isTrue(isMentorSource(source));
        assert.isFalse(isMentorSource('Shop'));
    });

    suite.test('每種來源都能貼上標記，且不改傳入的卡', () => {
        const original = card('a');
        for (const source of MENTOR_SOURCES as readonly MentorSource[]) {
            const tagged = tagMentorSource(original, source);
            assert.equals(source, tagged.source!);
        }
        assert.isTrue(original.source === undefined, '原卡不被修改');
    });

    suite.test('已有來源的卡保留原來源', () => {
        const first = tagMentorSource(card('a'), 'Capture');
        assert.equals('Capture', tagMentorSource(first, 'Gacha').source!);
    });

    suite.test('未知來源拋 RangeError', () => {
        assert.throws(() => tagMentorSource(card('a'), 'Shop' as MentorSource));
    });

    suite.test('持有清單：新卡加入並標記來源；同 uid 不重複新增，保留舊來源', () => {
        const once = addMentorToHoldings([], card('a'), 'Mercenary');
        assert.equals(1, once.length);
        assert.equals('Mercenary', once[0].source!);
        const twice = addMentorToHoldings(once, card('a'), 'Retire');
        assert.equals(1, twice.length);
        assert.equals('Mercenary', twice[0].source!);
        assert.equals(1, once.length, '舊清單不被修改');
    });

    return suite;
}
