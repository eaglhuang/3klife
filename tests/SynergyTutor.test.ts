/**
 * SynergyTutor.test.ts — 世交太傅伴讀（PROG-2-1814）
 *
 * 鎖住：K 換算上限 15%、多家取最高、教官卡帶出身、入學定值、全維度加成。
 */
import { assert, TestSuite } from './TestRunner';
import { InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { GameTimeMode } from '../assets/scripts/core/systems/GameClock';
import { chooseFate, unveilGeneral, type UnveilingGeneral } from '../assets/scripts/core/systems/Unveiling';
import { NurtureService } from '../assets/scripts/core/services/NurtureService';
import { computeStatGain, mentorFromCard } from '../assets/scripts/core/systems/NurtureSystem';
import {
    emptyFamilySynergyLedger, familyPairKey, PLAYER_FAMILY_UID, recordFinalizedChild, synergyTutorBonusOf, synergyTutorLine,
    type FamilyPairRecord, type FamilySynergyLedger,
} from '../assets/scripts/core/systems/FamilySynergy';
import type { MentorCard } from '../assets/scripts/core/models/MentorCard';

const near = (expected: number, actual: number): void => { assert.isTrue(Math.abs(expected - actual) < 1e-9, `${expected} vs ${actual}`); };
const WANG = '太原王';
const CUI = '清河崔';
const record = (results: boolean[]): FamilyPairRecord => results.reduce<FamilyPairRecord | undefined>((r, ok) => recordFinalizedChild(r, ok), undefined) as FamilyPairRecord;
const ledgerOf = (pairs: Record<string, boolean[]>): FamilySynergyLedger => {
    const ledger = emptyFamilySynergyLedger();
    for (const family of Object.keys(pairs)) ledger.pairs[familyPairKey(PLAYER_FAMILY_UID, family)] = record(pairs[family]);
    return ledger;
};
const FULL = [true, true, true, true];
const HALF = [true, true];
const card = (uid: string, familyUid?: string): MentorCard => ({
    uid, sourceGeneralId: uid, name: uid, faction: 'player', retiredAge: 50, retiredSeason: 0, retiredYear: 1, ep_snapshot: 60, parentUids: [],
    generalSnapshot: { id: uid, name: uid, str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk: 40, genes: [], hiddenFlags: [], ...(familyUid ? { familyUid } : {}) },
} as unknown as MentorCard);

export function createSynergyTutorSuite(): TestSuite {
    const suite = new TestSuite('SynergyTutor (世交太傅伴讀 PROG-2-1814)');

    suite.test('滿額 K 為 +15%，半額 +7.5%', () => {
        near(0.15, synergyTutorBonusOf([{ familyUid: WANG }], ledgerOf({ [WANG]: FULL })));
        near(0.075, synergyTutorBonusOf([{ familyUid: WANG }], ledgerOf({ [WANG]: HALF })));
    });

    suite.test('多家取最高，不疊加', () => {
        near(0.15, synergyTutorBonusOf([{ familyUid: WANG }, { familyUid: CUI }], ledgerOf({ [WANG]: FULL, [CUI]: FULL })));
        near(0.15, synergyTutorBonusOf([{ familyUid: CUI }, { familyUid: WANG }], ledgerOf({ [WANG]: FULL, [CUI]: HALF })));
    });

    suite.test('沒有名門教官或沒有樣本時為 0', () => {
        near(0, synergyTutorBonusOf([{}, {}], ledgerOf({ [WANG]: FULL })));
        near(0, synergyTutorBonusOf([{ familyUid: WANG }], emptyFamilySynergyLedger()));
        near(0, synergyTutorBonusOf([], ledgerOf({ [WANG]: FULL })));
    });

    suite.test('教官卡帶出身世家；一般教官沒有這欄', () => {
        assert.equals(WANG, mentorFromCard(card('a', WANG)).familyUid ?? '');
        assert.isFalse('familyUid' in mentorFromCard(card('b')));
    });

    suite.test('全維度修業效率都提高', () => {
        const session = { mentors: [], mentorSlots: {}, growthModifier: 1, synergyTutorBonus: 0.15 };
        assert.equals(23, computeStatGain(session, 'str', 20).gain);
        assert.equals(23, computeStatGain(session, 'pol', 20).gain);
        assert.equals(20, computeStatGain({ ...session, synergyTutorBonus: undefined }, 'str', 20).gain);
    });

    suite.test('入學定值存進會話；K 之後變動不影響；K 為 0 不寫欄位', () => {
        const child = (id: string): UnveilingGeneral => chooseFate(unveilGeneral({
            id, name: id, faction: 'shu', gender: '男', age: 5, status: 'Mystery', hp: 800,
            str: 60, int: 50, lea: 55, pol: 40, cha: 45, luk: 30, hiddenFlags: ['mystery-phase'], genes: [],
        } as unknown as UnveilingGeneral).general, 'accept');
        let ledger = ledgerOf({ [WANG]: FULL });
        const serviceOf = (id: string): NurtureService => new NurtureService(new InMemoryRosterStore([child(id)]), {
            random: () => 0.5, currentSeason: () => 3, currentMode: () => GameTimeMode.Nurture, requireNurtureMode: true,
            synergyTutorBonus: (mentors) => synergyTutorBonusOf(mentors, ledger),
        });
        const nurture = serviceOf('alpha');
        const session = nurture.startWithCards('alpha', [card('a', WANG)]);
        near(0.15, session.synergyTutorBonus ?? 0);
        ledger = emptyFamilySynergyLedger();
        near(0.15, nurture.getSession('alpha')?.synergyTutorBonus ?? 0);
        const plain = serviceOf('beta').startWithCards('beta', [card('b', WANG)]);
        assert.isTrue(plain.synergyTutorBonus === undefined);
    });

    suite.test('提示句', () => {
        assert.equals('世交太傅伴讀：修業效率 +15%', synergyTutorLine(0.15));
    });

    return suite;
}
