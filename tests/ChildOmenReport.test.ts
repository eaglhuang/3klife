/**
 * ChildOmenReport.test.ts — 子嗣立春天象播報（doc_spec_0312 §2，GEN-14；PROG-2-2106）
 */
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { dueChildOmens, OMEN_TEXT } from '../assets/scripts/core/systems/ChildUnveiling';
import { CHILD_STATUS_MYSTERY } from '../assets/scripts/core/systems/BreedingSystem';
import type { FactorDictionary } from '../assets/scripts/core/systems/FactorInheritance';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

function child(id: string, extra: Record<string, unknown> = {}): GeneralConfig {
    return {
        id, name: `${id}兒`, faction: 'player', gender: '男', age: 0.5, status: CHILD_STATUS_MYSTERY, hp: 100, ep: 50,
        str: 50, int: 50, lea: 50, pol: 50, cha: 50, luk: 50, ...extra,
    } as unknown as GeneralConfig;
}

const adult = { id: 'adult', name: '大人', faction: 'player', gender: '男', age: 30, hp: 1000, ep: 99, str: 90, int: 50, lea: 50, pol: 50, cha: 50, luk: 50 } as unknown as GeneralConfig;

async function advanceToSpring(session: GameSession) {
    let payload = await session.advanceSeason(0);
    while (!payload.advance.yearEnded) payload = await session.advanceSeason(0);
    return payload;
}

export function createChildOmenReportSuite(): TestSuite {
    const suite = new TestSuite('ChildOmenReport (子嗣立春天象播報 GEN-14 PROG-2-2106)');

    suite.test('依門檻挑天象，台詞含子嗣姓名與規格原文', () => {
        const [notice] = dueChildOmens([child('a', { ep: 85 })]);
        assert.equals('a', notice.childId);
        assert.equals('OMEN_PURPLE_QI', notice.omenId);
        assert.equals(`a兒：${OMEN_TEXT.OMEN_PURPLE_QI}`, notice.line);
        assert.equals('OMEN_METEOR_DREAM', dueChildOmens([child('b', { ep: 75 })])[0].omenId);
        assert.equals('OMEN_TIGER_ROAR', dueChildOmens([child('c', { lea: 80 })])[0].omenId);
        assert.equals('OMEN_DEER_HERB', dueChildOmens([child('d', { str: 30, int: 30, lea: 30, pol: 30, cha: 30 })])[0].omenId);
    });

    suite.test('屬性放在 stats 裡也讀得到；都不符的子嗣沒有天象', () => {
        const nested = child('a', { str: undefined, stats: { str: 88 } });
        assert.equals('OMEN_TIGER_ROAR', dueChildOmens([nested])[0].omenId);
        assert.equals(0, dueChildOmens([child('b')]).length);
    });

    suite.test('帶金因子：EP 不夠也是紫氣；其他顏色不算', () => {
        const dictionary: FactorDictionary = new Map([['g', { id: 'g', color: 'gold' }], ['b', { id: 'b', color: 'blue' }]]);
        assert.equals('OMEN_PURPLE_QI', dueChildOmens([child('a', { genes: [{ id: 'g' }] })], dictionary)[0].omenId);
        assert.equals(0, dueChildOmens([child('a', { genes: [{ id: 'b' }] })], dictionary).length);
        assert.equals(0, dueChildOmens([child('a', { genes: [{ id: 'g' }] })]).length, '沒有字典時無法判定');
    });

    suite.test('只報神祕期且未滿 1 歲的子嗣，成年、已開獎、已故都不報', () => {
        assert.equals(1, dueChildOmens([child('a', { ep: 90, age: 1 })]).length);
        assert.equals(0, dueChildOmens([child('a', { ep: 90, age: 1.25 })]).length);
        assert.equals(0, dueChildOmens([child('a', { ep: 90, status: 'Unveiled' })]).length);
        assert.equals(0, dueChildOmens([child('a', { ep: 90, status: 'dead' })]).length);
        assert.equals(0, dueChildOmens([adult]).length);
    });

    suite.test('GameSession：立春才播報，寫進日誌與換季通知；隔年同一位不再報', async () => {
        const session = new GameSession(1);
        session.setRosterStore(new InMemoryRosterStore([adult, child('a', { ep: 90, age: 0 }), child('b', { age: 0 })]));
        const omenEntries = () => session.queryJournal().filter((entry) => entry.entryId.startsWith('CHILD_OMEN-'));

        const first = await session.advanceSeason(0);
        if (!first.advance.yearEnded) {
            assert.equals(undefined, first.omenLines);
            assert.equals(0, omenEntries().length, '非立春不報');
        }
        const spring = first.advance.yearEnded ? first : await advanceToSpring(session);
        assert.equals(`a兒：${OMEN_TEXT.OMEN_PURPLE_QI}`, (spring.omenLines ?? []).join('|'));
        assert.equals(1, omenEntries().length);
        assert.equals('a', omenEntries()[0].relatedGeneralUids.join(','));
        assert.equals('GROWTH', omenEntries()[0].category);

        const nextSpring = await advanceToSpring(session);
        assert.equals(undefined, nextSpring.omenLines);
        assert.equals(1, omenEntries().length);
    });

    suite.test('GameSession：剛出生就碰到立春的子嗣也只報一次，不漏不重複', async () => {
        const session = new GameSession(1);
        session.setRosterStore(new InMemoryRosterStore([adult]));
        await advanceToSpring(session);
        await session.advanceSeason(0);
        await session.advanceSeason(0);
        await session.advanceSeason(0);
        session.enrollGenerals([child('late', { ep: 90, age: 0 })]);
        const spring = await session.advanceSeason(0);
        assert.isTrue(spring.advance.yearEnded);
        assert.equals(1, (spring.omenLines ?? []).length);
        const next = await advanceToSpring(session);
        assert.equals(undefined, next.omenLines);
    });

    return suite;
}
