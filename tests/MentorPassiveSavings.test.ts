/**
 * MentorPassiveSavings.test.ts — 教官卡被動 VITALITY_SAVE / TP_Bonus 接進培育公式（PROG-2-1999）
 *
 * Unity 對照：EditMode Test，鎖住減免的乘算、相加、封頂與「沒帶卡行為不變」。
 */
import { mentorToCardData } from '../assets/scripts/core/systems/MentorCardTabs';
import { assert, TestSuite } from './TestRunner';
import {
    applyPassiveSave,
    MENTOR_PASSIVE_SAVE_CAP,
    passiveSavingsOfSupport,
    totalTacticTpDiscount,
    totalVitalitySave,
} from '../assets/scripts/core/systems/MentorPassiveSavings';
import {
    computeStatGain,
    createNurtureSession,
    executeRound,
    mentorFromCard,
    type TrainingMentor,
} from '../assets/scripts/core/systems/NurtureSystem';
import { chooseFate, unveilGeneral, type UnveilingGeneral } from '../assets/scripts/core/systems/Unveiling';
import type { MentorCard } from '../assets/scripts/core/models/MentorCard';
import type { SupportCardDef } from '../assets/scripts/core/models/MentorSupportSchema';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import { GameSession, InMemoryRosterStore, type NurtureStatePort } from '../assets/scripts/core/managers/GameSession';
import type { NurtureState } from '../assets/scripts/core/services/NurtureService';

function seq(...values: number[]): () => number {
    let i = 0;
    return () => values[Math.min(i++, values.length - 1)];
}

function readyChild(id: string): UnveilingGeneral {
    const child = {
        id, name: id, faction: 'shu', gender: '男', age: 5, status: 'Mystery', hp: 800,
        str: 60, int: 50, lea: 55, pol: 40, cha: 45, luk: 30, hiddenFlags: ['mystery-phase'], genes: [],
    } as unknown as UnveilingGeneral;
    return chooseFate(unveilGeneral(child).general, 'accept');
}

function mentor(id: string, extra: Partial<TrainingMentor> = {}): TrainingMentor {
    return { id, name: id, tpBonus: 20, specialty: 'str', burstRate: 0.5, stars: 0, ...extra };
}

function support(passiveEffects: { effect: string; value: number; minStar: number }[]): SupportCardDef {
    return {
        slotBurstRate: 0.4, trainingSlotAffinity: ['str'], friendshipBonus: [1, 1, 1, 1, 1, 1],
        tacticInspireEvents: [], passiveEffects,
    } as unknown as SupportCardDef;
}

function card(stars: number, passiveEffects: { effect: string; value: number; minStar: number }[]): MentorCard {
    return {
        uid: 'mentor-x', sourceGeneralId: 'x', name: '荀彧', faction: 'wei',
        retiredAge: 66, retiredSeason: 4, retiredYear: 2, ep_snapshot: 80, gene_refs: [], parentUids: ['f', 'm'],
        generalSnapshot: { id: 'x', name: '荀彧', str: 30, int: 90, lea: 70, pol: 85, cha: 60 } as unknown as GeneralConfig,
        stars,
        support: support(passiveEffects),
    } as unknown as MentorCard;
}

/** 第一個亂數 = 精力消耗（0 → 15、0.99 → 25）；之後亂數固定不受傷、不好感 */
function vigorAfterStr(mentors: TrainingMentor[], vigorRoll: number): number {
    const session = createNurtureSession({ sessionId: 's', child: readyChild('c'), mentors, startSeason: 0, random: seq(0.5) });
    return executeRound(session, 'str', seq(vigorRoll, 0, 0.99)).session.vigor;
}

/** 結業中、已靈感出 TAC_A 的假培育埠；教官身上可帶 tacticTpDiscount */
function nurturePort(childId: string, tp: number, mentorExtra: object): NurtureStatePort & { state: NurtureState } {
    return {
        state: {
            sessions: [{
                childId, tp, status: 'completed',
                mentors: [{ id: 'm1', ...mentorExtra, inspire: { events: [{ eventId: 'e-TAC_A', tacticId: 'TAC_A' }], friendshipBonusByStar: [0] } }],
                inspiredKeys: ['m1:e-TAC_A'],
            }],
            admission: { season: 0, used: 0 },
        } as unknown as NurtureState,
        getState() { return JSON.parse(JSON.stringify(this.state)) as NurtureState; },
        restoreState(next: NurtureState | null | undefined) { if (next) this.state = JSON.parse(JSON.stringify(next)); },
    };
}

function learnSession(tp: number, mentorExtra: object) {
    const general = { id: 'lead', name: 'lead', faction: 'shu', gender: '男', age: 30, hp: 1000, vitality: 100, maxVitality: 100, str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk: 40, learnedTactics: [], genes: [] } as unknown as GeneralConfig;
    const session = new GameSession(3);
    session.setRosterStore(new InMemoryRosterStore([general]));
    const port = nurturePort('lead', tp, mentorExtra);
    session.setNurtureStatePort(port);
    return { session, port };
}

export function createMentorPassiveSavingsSuite(): TestSuite {
    const suite = new TestSuite('MentorPassiveSavings (教官卡被動接進培育公式 PROG-2-1999)');

    suite.test('沒帶卡／卡沒有這兩項被動：消耗與舊版完全相同（15 → 扣 15、25 → 扣 25）', () => {
        assert.equals(85, vigorAfterStr([], 0));
        assert.equals(75, vigorAfterStr([], 0.99));
        assert.equals(85, vigorAfterStr([mentor('m1')], 0));
        assert.equals(15, applyPassiveSave(15, 0));
        assert.equals(0, totalVitalitySave([]));
        assert.equals(0, totalTacticTpDiscount([mentor('m1')]));
    });

    suite.test('VITALITY_SAVE 0.2：訓練消耗 ×0.8（15 → 12、25 → 20），再四捨五入', () => {
        assert.equals(88, vigorAfterStr([mentor('m1', { vitalitySave: 0.2 })], 0));
        assert.equals(80, vigorAfterStr([mentor('m1', { vitalitySave: 0.2 })], 0.99));
        // 15 × 0.7 = 10.5 → 四捨五入 11
        assert.equals(89, vigorAfterStr([mentor('m1', { vitalitySave: 0.3 })], 0));
    });

    suite.test('休息不受體力減免影響（只減訓練消耗）', () => {
        const session = createNurtureSession({ sessionId: 's', child: readyChild('c'), mentors: [mentor('m1', { vitalitySave: 0.5 })], startSeason: 0, random: seq(0.5) });
        const plain = createNurtureSession({ sessionId: 's', child: readyChild('c'), mentors: [], startSeason: 0, random: seq(0.5) });
        const a = executeRound({ ...session, vigor: 50 }, 'rest', seq(0));
        const b = executeRound({ ...plain, vigor: 50 }, 'rest', seq(0));
        assert.equals(b.session.vigor, a.session.vigor);
    });

    suite.test('多張卡減免相加，封頂 60%；TP 折扣同規則', () => {
        assert.equals(MENTOR_PASSIVE_SAVE_CAP, 0.6);
        assert.equals(0.5, totalVitalitySave([{ vitalitySave: 0.2 }, { vitalitySave: 0.3 }]));
        assert.equals(0.6, totalVitalitySave([{ vitalitySave: 0.4 }, { vitalitySave: 0.4 }]));
        assert.equals(0.6, totalTacticTpDiscount([{ tacticTpDiscount: 0.3 }, { tacticTpDiscount: 0.3 }, { tacticTpDiscount: 0.3 }]));
        assert.equals(0.3, totalTacticTpDiscount([{ tacticTpDiscount: 0.3 }, { vitalitySave: 0.5 }]), '體力與 TP 兩條各算各的');
        // 兩張 0.4 → 封頂 0.6 → 25 × 0.4 = 10
        const m = [mentor('a', { vitalitySave: 0.4 }), mentor('b', { vitalitySave: 0.4 })];
        assert.equals(90, vigorAfterStr(m, 0.99));
    });

    suite.test('TP 折扣：乘算，進位在 GameSession 端（這裡驗乘算本身）', () => {
        assert.equals(7, applyPassiveSave(10, 0.3));
        assert.equals(10, applyPassiveSave(10, 0));
        assert.equals(4, Math.ceil(applyPassiveSave(5, 0.3)), '3.5 無條件進位為 4');
    });

    suite.test('passiveSavingsOfSupport：依 Min_Star 解鎖，同種相加，無被動不寫欄位', () => {
        const def = support([
            { effect: 'VITALITY_SAVE', value: 0.1, minStar: 0 },
            { effect: 'VITALITY_SAVE', value: 0.1, minStar: 3 },
            { effect: 'TP_Bonus', value: 0.3, minStar: 2 },
        ]);
        const lo = passiveSavingsOfSupport(def, 0);
        assert.equals(0.1, lo.vitalitySave);
        assert.isTrue(lo.tacticTpDiscount === undefined);
        const mid = passiveSavingsOfSupport(def, 2);
        assert.equals(0.3, mid.tacticTpDiscount);
        assert.equals(0.1, mid.vitalitySave);
        const hi = passiveSavingsOfSupport(def, 5);
        assert.equals(0.2, hi.vitalitySave);
        assert.equals(0, Object.keys(passiveSavingsOfSupport(undefined, 5)).length);
        assert.equals(0, Object.keys(passiveSavingsOfSupport(support([]), 5)).length);
        assert.equals(0.2, passiveSavingsOfSupport(def, 99).vitalitySave, '星等夾到 ★5');
    });

    suite.test('mentorFromCard 依星等把被動帶進教官；荀彧 0.2／郭嘉 0.3 的實際效果', () => {
        const xun = mentorFromCard(card(0, [{ effect: 'VITALITY_SAVE', value: 0.2, minStar: 0 }]));
        assert.equals(0.2, xun.vitalitySave);
        assert.equals(88, vigorAfterStr([xun], 0));
        const guo = mentorFromCard(card(0, [{ effect: 'TP_Bonus', value: 0.3, minStar: 0 }]));
        assert.equals(0.3, guo.tacticTpDiscount);
        assert.equals(0.3, totalTacticTpDiscount([guo]));
        assert.equals(85, vigorAfterStr([guo], 0), '只有 TP 折扣的卡不影響體力');
        const locked = mentorFromCard(card(1, [{ effect: 'VITALITY_SAVE', value: 0.2, minStar: 3 }]));
        assert.isTrue(locked.vitalitySave === undefined, '星等不足不解鎖');
        const plain = mentorFromCard(card(3, []));
        assert.isTrue(plain.vitalitySave === undefined && plain.tacticTpDiscount === undefined);
    });

    suite.test('GameSession.learnTactic：沒帶 TP_Bonus 卡時成本不變（TP 60 學 TAC_A 扣 30）', async () => {
        const { session, port } = learnSession(60, {});
        assert.isTrue((await session.learnTactic('lead', 'TAC_A')).ok);
        assert.equals(30, port.state.sessions[0].tp);
    });

    suite.test('GameSession.learnTactic：帶 TP_Bonus 0.3 的教官，成本 30 → 21、門檻 42、扣 21', async () => {
        const ok = learnSession(42, { tacticTpDiscount: 0.3 });
        assert.isTrue((await ok.session.learnTactic('lead', 'TAC_A')).ok);
        assert.equals(21, ok.port.state.sessions[0].tp);
        const short = learnSession(41, { tacticTpDiscount: 0.3 });
        assert.equals('TP_SHORT', (await short.session.learnTactic('lead', 'TAC_A')).blocked!);
        assert.equals(41, short.port.state.sessions[0].tp);
    });

    suite.test('GameSession.learnTactic：折扣封頂 0.6（0.9 也只算 0.6）→ 成本 12、門檻 24', async () => {
        const { session, port } = learnSession(24, { tacticTpDiscount: 0.9 });
        assert.isTrue((await session.learnTactic('lead', 'TAC_A')).ok);
        assert.equals(12, port.state.sessions[0].tp);
    });

    suite.test('Training_Rate：站在同格才進 M_Training，別格與沒有此被動時增益不變', () => {
        const rated = mentor('m1', { specialty: 'int', trainingRate: 0.5 });
        const plain = mentor('m1', { specialty: 'int' });
        const gain = (m: TrainingMentor, slot: 'str' | 'int') =>
            computeStatGain({ mentors: [m], mentorSlots: { m1: slot }, growthModifier: 1 }, 'str', 100).gain;
        assert.equals(gain(plain, 'int'), gain(rated, 'int'));
        assert.equals(Math.round(gain(plain, 'str') * 1.5), gain(rated, 'str'));
    });

    suite.test('Training_Rate：依 Min_Star 解鎖並由 mentorToCardData 列出', () => {
        const def = { passiveEffects: [{ effect: 'Training_Rate', value: 0.05, minStar: 2 }] } as unknown as SupportCardDef;
        assert.equals(undefined, passiveSavingsOfSupport(def, 1).trainingRate);
        assert.equals(0.05, passiveSavingsOfSupport(def, 2).trainingRate);
        const data = mentorToCardData(mentor('m1', { trainingRate: 0.05 }));
        assert.isTrue(data.effects.some((e) => e.id === 'TRAINING_RATE' && e.label.indexOf('+5%') >= 0));
    });

    return suite;
}
