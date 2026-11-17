/**
 * GeneralCaptivity.test.ts — 我方主將被擒的戰場外處置（doc_spec_0021 §L，PROG-2-9140）
 * 涵蓋：四種處置、修正項與上下限、無君主忽略、關滿 4 季自動釋放、邦交索要、被囚者不可出戰、
 * 投降後虎符易主、舊存檔相容、單挑被斬有無被擒紀錄兩條路徑。
 */
import { assert, TestSuite } from './TestRunner';
import { Faction } from '../assets/scripts/core/config/Constants';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import {
    CAPTIVITY_SEASONS, canRansomCaptive, captureOdds, isCaptivityServed, normalizeCaptivity, normalizeRosterCaptivity,
    planGeneralCaptures, rollCaptureVerdict, surrenderRate, takeTalliesWithDefector, type GeneralCaptureRecord,
} from '../assets/scripts/core/systems/GeneralCaptivity';
import { persuadeRate } from '../assets/scripts/core/systems/PrisonerOfWar';
import { createRivalWorld } from '../assets/scripts/core/systems/RivalNations';
import { checkDeployable } from '../assets/scripts/core/systems/BattleRoster';
import { formatTallyLine } from '../assets/scripts/core/systems/TallyLineSpec';
import type { DuelOutcomeRecord } from '../assets/scripts/core/systems/DuelAftermath';

function makeGeneral(id: string, over: Record<string, unknown> = {}): GeneralConfig {
    return {
        id, name: id, faction: 'shu', gender: '男', age: 30, hp: 1000, vitality: 100, maxVitality: 100,
        str: 80, int: 60, lea: 70, pol: 50, cha: 60, luk: 40, generalFame: 0, generalRank: 0, ...over,
    } as unknown as GeneralConfig;
}

function capture(over: Partial<GeneralCaptureRecord> = {}): GeneralCaptureRecord {
    return {
        capturedFaction: Faction.Player, capturedGeneralId: 'g-1', capturedTemplateId: null,
        captorGeneralId: null, captorTemplateId: 'lu-bu', cause: 'troop', tutorial: false, turn: 3, ...over,
    };
}

/** 依序吐出給定數值的亂數；用完回 0.99 */
function seq(...values: number[]): () => number {
    let i = 0;
    return () => (i < values.length ? values[i++] : 0.99);
}

const LU_BU = makeGeneral('lu-bu', { name: '呂布', cha: 90, luk: 80 });

async function sessionWith(roster: GeneralConfig[], relation?: number): Promise<GameSession> {
    const session = new GameSession(5);
    session.setRosterStore(new InMemoryRosterStore(roster));
    session.setGeneralTemplates([LU_BU]);
    if (relation !== undefined) {
        const world = createRivalWorld();
        await session.setRivals({ nations: world.nations.map((n) => (n.id === 'lvbu' ? { ...n, relation } : n)) });
    }
    return session;
}

function duelSlain(): DuelOutcomeRecord {
    return { winner: Faction.Enemy, loser: Faction.Player, winnerGeneralId: 'lu-bu', loserGeneralId: 'g-1', killed: true, fled: false, tutorial: false };
}

export function createGeneralCaptivitySuite(): TestSuite {
    const suite = new TestSuite('GeneralCaptivity (PROG-2-9140 主將被擒君主處置)');

    // ── 機率 ──
    suite.test('性格表原值：呂布軍斬首 17.5%、釋放 5%', () => {
        const odds = captureOdds('WARLORD', 0, false);
        assert.equals(17.5, odds.beheadRate);
        assert.equals(5, odds.releaseRate);
        assert.equals(0, odds.surrenderBonus);
    });

    suite.test('邦交 >= 60：斬首 ×0.5、釋放 +20；<= -60：斬首 ×1.5、釋放 ×0.5', () => {
        const friendly = captureOdds('DIPLOMAT', 60, false);
        assert.equals(0.75, friendly.beheadRate);
        assert.equals(70, friendly.releaseRate);
        const hostile = captureOdds('MILITARIST', -60, false);
        assert.equals(15, hostile.beheadRate);
        assert.equals(5, hostile.releaseRate);
        const mid = captureOdds('MILITARIST', 59, false);
        assert.equals(10, mid.beheadRate);
    });

    suite.test('先邦交再名將：最高稀有度再 ×0.5、投降 +10 個百分點；斬首率夾在 25% 以內', () => {
        const top = captureOdds('WARLORD', 60, true);
        assert.equals(4.375, top.beheadRate);
        assert.equals(10, top.surrenderBonus);
        const capped = captureOdds('WARLORD', -100, false);
        assert.equals(25, capped.beheadRate);
        assert.equals(2.5, capped.releaseRate);
    });

    suite.test('投降率鏡射勸降公式：敵君主對我方被擒武將，名將加成後不超過 95%', () => {
        const lord = { cha: 90, luk: 80 };
        const target = { cha: 60, loyalty: 60 };
        const expected = persuadeRate(lord, { id: '', name: '', cha: 60, loyalty: 60 });
        assert.equals(expected, surrenderRate(lord, target));
        assert.equals(expected + 10, surrenderRate(lord, target, 10));
        assert.equals(95, surrenderRate({ cha: 200, luk: 200 }, { cha: 0, loyalty: 0 }, 10));
    });

    suite.test('三步擲骰得到四種處置', () => {
        const odds = captureOdds('WARLORD', 0, false);
        assert.equals('beheaded', rollCaptureVerdict(odds, 30, seq(0.1)));
        assert.equals('surrendered', rollCaptureVerdict(odds, 30, seq(0.5, 0.1)));
        assert.equals('released', rollCaptureVerdict(odds, 30, seq(0.5, 0.9, 0.01)));
        assert.equals('imprisoned', rollCaptureVerdict(odds, 30, seq(0.5, 0.9, 0.9)));
    });

    suite.test('沒走到的步驟不消耗亂數（斬首中了只擲一次）', () => {
        let calls = 0;
        rollCaptureVerdict(captureOdds('WARLORD', 0, false), 30, () => { calls++; return 0.01; });
        assert.equals(1, calls);
    });

    // ── 過濾 ──
    suite.test('無君主關卡、教學戰、敵方被擒、試用傭兵、已滅亡國家：整筆忽略', () => {
        const roster = [makeGeneral('g-1'), makeGeneral('merc-1')];
        const nations = createRivalWorld().nations;
        const base = { roster, nations, random: seq(0.01) };
        assert.equals(1, planGeneralCaptures({ ...base, records: [capture()] }).length);
        assert.equals(0, planGeneralCaptures({ ...base, records: [capture({ captorTemplateId: 'challenge-boss' })] }).length);
        assert.equals(0, planGeneralCaptures({ ...base, records: [capture({ tutorial: true })] }).length);
        assert.equals(0, planGeneralCaptures({ ...base, records: [capture({ capturedFaction: Faction.Enemy })] }).length);
        assert.equals(0, planGeneralCaptures({ ...base, records: [capture({ capturedGeneralId: 'merc-1' })], exemptIds: new Set(['merc-1']) }).length);
        const fallen = nations.map((n) => (n.id === 'lvbu' ? { ...n, fallen: true } : n));
        assert.equals(0, planGeneralCaptures({ ...base, nations: fallen, records: [capture()] }).length);
        // captorTemplateId 對不到時，改用遭遇戰敵將
        assert.equals(1, planGeneralCaptures({ ...base, records: [capture({ captorTemplateId: null })], encounterEnemyGeneralId: 'lu-bu' }).length);
    });

    // ── 存檔 ──
    suite.test('舊存檔沒有 captivity 欄位：視為沒人被囚；壞資料被丟掉', () => {
        const roster = [makeGeneral('a'), makeGeneral('b', { captivity: { nationId: 'wei', sinceSeason: 2 } }), makeGeneral('c', { captivity: { nationId: '', sinceSeason: -1 } })] as unknown as Array<{ id: string; captivity?: unknown }>;
        const fixed = normalizeRosterCaptivity(roster);
        assert.isTrue(fixed[0].captivity === undefined);
        assert.equals('wei', (fixed[1].captivity as { nationId: string }).nationId);
        assert.isTrue(fixed[2].captivity === undefined);
        assert.isTrue(normalizeCaptivity(undefined) === undefined);
        const clean = [makeGeneral('a')] as unknown as Array<{ id: string; captivity?: unknown }>;
        assert.isTrue(normalizeRosterCaptivity(clean) === clean);
    });

    suite.test('關滿 4 季才算服滿；邦交 60 才能索要', () => {
        assert.equals(4, CAPTIVITY_SEASONS);
        assert.isFalse(isCaptivityServed({ nationId: 'wei', sinceSeason: 2 }, 5));
        assert.isTrue(isCaptivityServed({ nationId: 'wei', sinceSeason: 2 }, 6));
        assert.isFalse(canRansomCaptive(59));
        assert.isTrue(canRansomCaptive(60));
    });

    suite.test('投降者持有的虎符跟著走（從我方持有關係移除）', () => {
        const result = takeTalliesWithDefector({ holders: { t1: 'g-1', t2: null, t3: 'g-2' } }, 'g-1');
        assert.equals(1, result.taken.length);
        assert.equals('t1', result.taken[0]);
        assert.isTrue(!('t1' in result.state.holders));
        assert.equals('g-2', result.state.holders.t3);
    });

    // ── GameSession 接線 ──
    suite.test('斬首：陣亡、遺書進信箱、提示用繁中不含內部代號', async () => {
        const session = await sessionWith([makeGeneral('g-1', { name: '甘寧' })], -30);
        session.setRandomSource(seq(0.01));
        const result = await session.recordBattle(['g-1'], 'enemy-win', { stageId: 's1', generalCaptures: [capture()] });
        const dead = session.roster.find((g) => g.id === 'g-1') as unknown as { status?: string };
        assert.equals('dead', dead.status);
        assert.equals(1, result.captureNotices.length);
        assert.equals('甘寧被呂布擒獲，遭斬首。', formatTallyLine(result.captureNotices[0]));
        const letters = session.farewellLetters;
        assert.equals(1, letters.length);
        assert.equals('epitaph', letters[0].kind);
        assert.equals('甘寧', letters[0].generalName);
        // 保存再讀回信件仍保留 kind
        assert.equals('epitaph', JSON.parse(JSON.stringify(session.farewellLetters))[0].kind);
    });

    suite.test('投降：從名冊移除、虎符跟著走', async () => {
        const session = await sessionWith([makeGeneral('g-1', { name: '甘寧' }), makeGeneral('g-2')], -30);
        await session.registerTallyCards([{ uid: 't1', templateId: 'tpl-1', sourceGeneralUid: 'src', quality: 'R', score: 0, source: 'death', producedSeason: 0 } as never]);
        await session.equipTally('t1', 'g-1');
        session.setRandomSource(seq(0.5, 0.01));
        const result = await session.recordBattle(['g-1'], 'enemy-win', { stageId: 's1', generalCaptures: [capture()] });
        assert.isFalse(session.roster.some((g) => g.id === 'g-1'));
        assert.isTrue(session.roster.some((g) => g.id === 'g-2'));
        assert.isTrue(!('t1' in session.tallyHoldings));
        assert.equals('甘寧被呂布擒獲，歸降敵軍。', formatTallyLine(result.captureNotices[0]));
    });

    suite.test('關押：仍在名冊但被囚，不能出戰，記下國家與季；之後不能派內政', async () => {
        const session = await sessionWith([makeGeneral('g-1', { name: '甘寧' })], -30);
        session.setRandomSource(seq(0.5, 0.9, 0.9));
        const result = await session.recordBattle(['g-1'], 'enemy-win', { stageId: 's1', generalCaptures: [capture()] });
        const general = session.roster.find((g) => g.id === 'g-1')!;
        assert.equals('lvbu', general.captivity?.nationId);
        assert.equals('甘寧被呂布擒獲，遭關押。', formatTallyLine(result.captureNotices[0]));
        const check = checkDeployable(general);
        assert.isFalse(check.eligible);
        assert.isTrue(check.reasons.includes('captive'));
        assert.isFalse(session.getDeployableGenerals().some((g) => g.id === 'g-1'));
        assert.isFalse(session.assignGovernor('FARMING', 'g-1').ok);
        assert.isFalse(await session.assignHallTask('task-1', 'g-1'));
    });

    suite.test('釋放：當場回到我方，沒有任何處罰', async () => {
        const session = await sessionWith([makeGeneral('g-1', { name: '甘寧' })], -30);
        session.setRandomSource(seq(0.5, 0.9, 0.01));
        const result = await session.recordBattle(['g-1'], 'enemy-win', { stageId: 's1', generalCaptures: [capture()] });
        const general = session.roster.find((g) => g.id === 'g-1')!;
        assert.isTrue(general.captivity === undefined);
        assert.equals('甘寧被呂布擒獲，隨後獲釋。', formatTallyLine(result.captureNotices[0]));
        assert.isTrue(session.getDeployableGenerals().some((g) => g.id === 'g-1'));
    });

    suite.test('無君主關卡：忽略被擒，沒有提示也沒有處罰', async () => {
        const session = await sessionWith([makeGeneral('g-1')], -30);
        session.setRandomSource(seq(0.01));
        const result = await session.recordBattle(['g-1'], 'enemy-win', { stageId: 's1', generalCaptures: [capture({ captorTemplateId: 'challenge-boss' })] });
        assert.equals(0, result.captureNotices.length);
        const general = session.roster.find((g) => g.id === 'g-1') as unknown as { status?: string; captivity?: unknown };
        assert.isTrue(general.captivity === undefined);
        assert.isFalse(general.status === 'dead');
    });

    suite.test('邦交 >= 60 可索要立刻釋放；邦交不足被拒', async () => {
        const low = await sessionWith([makeGeneral('g-1', { name: '甘寧' })], -30);
        low.setRandomSource(seq(0.5, 0.9, 0.9));
        await low.recordBattle(['g-1'], 'enemy-win', { stageId: 's1', generalCaptures: [capture()] });
        const denied = await low.ransomCaptive('g-1');
        assert.isFalse(denied.ok);
        assert.isTrue(low.roster.find((g) => g.id === 'g-1')!.captivity !== undefined);

        // 邦交 60 時斬首率 8.75%、釋放率 5+20；先在低邦交被囚，再把邦交調高後索要
        await low.setRivals({ nations: createRivalWorld().nations.map((n) => (n.id === 'lvbu' ? { ...n, relation: 60 } : n)) });
        const info = low.captivityInfoOf('g-1');
        assert.isTrue(info?.canRansom === true);
        const ok = await low.ransomCaptive('g-1');
        assert.isTrue(ok.ok);
        assert.isTrue(low.roster.find((g) => g.id === 'g-1')!.captivity === undefined);
        const none = await low.ransomCaptive('g-1');
        assert.isFalse(none.ok);
    });

    suite.test('關滿 4 季換季時自動釋放', async () => {
        const session = await sessionWith([makeGeneral('g-1', { name: '甘寧' })], -30);
        session.setRandomSource(seq(0.5, 0.9, 0.9));
        await session.recordBattle(['g-1'], 'enemy-win', { stageId: 's1', generalCaptures: [capture()] });
        session.setRandomSource(() => 0.99);
        for (let i = 0; i < CAPTIVITY_SEASONS - 1; i++) await session.advanceSeason(0);
        assert.isTrue(session.roster.find((g) => g.id === 'g-1')!.captivity !== undefined);
        await session.advanceSeason(0);
        assert.isTrue(session.roster.find((g) => g.id === 'g-1')!.captivity === undefined);
        assert.isTrue(session.consumeTallyNotices().some((line) => line.includes('關滿四季，獲釋歸隊')));
    });

    suite.test('單挑被斬：沒有被擒紀錄維持舊行為（直接陣亡）', async () => {
        const session = await sessionWith([makeGeneral('g-1')], -30);
        await session.recordBattle(['g-1'], 'enemy-win', { stageId: 's1', duelOutcomes: [duelSlain()] });
        assert.equals('dead', (session.roster.find((g) => g.id === 'g-1') as unknown as { status?: string }).status);
    });

    suite.test('單挑被斬：有被擒紀錄改走君主處置，沒被斬首就不陣亡', async () => {
        const session = await sessionWith([makeGeneral('g-1')], -30);
        session.setRandomSource(seq(0.5, 0.9, 0.9));
        await session.recordBattle(['g-1'], 'enemy-win', {
            stageId: 's1', duelOutcomes: [duelSlain()], generalCaptures: [capture({ cause: 'duel-slain' })],
        });
        const general = session.roster.find((g) => g.id === 'g-1') as unknown as { status?: string; captivity?: unknown };
        assert.isFalse(general.status === 'dead');
        assert.isTrue(general.captivity !== undefined);
    });

    suite.test('單挑被斬有被擒紀錄但無君主：只當一般戰敗，不陣亡也不處罰', async () => {
        const session = await sessionWith([makeGeneral('g-1')], -30);
        await session.recordBattle(['g-1'], 'enemy-win', {
            stageId: 's1', duelOutcomes: [duelSlain()], generalCaptures: [capture({ cause: 'duel-slain', captorTemplateId: 'challenge-boss' })],
        });
        const general = session.roster.find((g) => g.id === 'g-1') as unknown as { status?: string; captivity?: unknown };
        assert.isFalse(general.status === 'dead');
        assert.isTrue(general.captivity === undefined);
    });

    suite.test('被囚狀態存讀檔後保留', async () => {
        const session = await sessionWith([makeGeneral('g-1')], -30);
        session.setRandomSource(seq(0.5, 0.9, 0.9));
        await session.recordBattle(['g-1'], 'enemy-win', { stageId: 's1', generalCaptures: [capture()] });
        const copy = JSON.parse(JSON.stringify(session.roster)) as GeneralConfig[];
        const fixed = normalizeRosterCaptivity(copy as unknown as Array<{ id: string; captivity?: unknown }>);
        assert.equals(session.roster.find((g) => g.id === 'g-1')!.captivity?.sinceSeason, (fixed[0].captivity as { sinceSeason: number }).sinceSeason);
    });

    return suite;
}
