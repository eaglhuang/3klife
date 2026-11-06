/**
 * YingchuanAcademy — 潁川書院策論手牌與清談辯難（doc_spec_0303 TC-YC-01～03，PROG-2-1903）、教官羈絆與事件庫（PROG-2-1904）
 *
 * Unity 對照：EditMode Test 直接驅動 Gimmick Strategy，不開場景。
 */
import { assert, TestSuite } from './TestRunner';
import { createAcademySnapshot, resolveAcademyAction } from '../assets/scripts/core/systems/nurture/AcademyTrainingEngine';
import { AcademyActionPayload, AcademyControlMode, AcademyId, AcademyStateSnapshot } from '../assets/scripts/core/systems/nurture/AcademyTypes';
import {
    EssayCard,
    EssayCardCategory,
    TAC_LIAODI_JIXIAN,
    TAC_SHISHENG_SHIBAI,
    TRT_YINGSHUI_QINGLIU,
    YINGCHUAN_GIMMICK,
    YINGCHUAN_HAND_LIMIT,
    YINGCHUAN_MASTERS,
    YINGCHUAN_EVENTS,
    YINGCHUAN_MENTOR_CATALOG,
    YINGCHUAN_NEGATIVE_RESTLESS,
    YINGCHUAN_TUNING,
    assignYingchuanMentors,
    YingchuanDebateResolver,
    yingchuanStaminaPowerPct,
    yingchuanStateOf,
} from '../assets/scripts/core/systems/nurture/YingchuanAcademy';

const G = YINGCHUAN_GIMMICK;
const ADMISSION = {
    worldSeed: 'world-yc',
    clanUuid: 'clan-xun',
    childId: 'child-xun-yu',
    academyId: AcademyId.YINGCHUAN,
    admissionTurn: 60,
    initialStats: { str: 20, lea: 40, int: 60, pol: 55, cha: 40 },
};

function card(category: EssayCardCategory, star: 1 | 2 | 3 = 1, id = `${category}${star}`): EssayCard {
    return { id, name: id, category, star, debatePower: star === 1 ? 10 : star === 2 ? 25 : 50 };
}

function start(mode = AcademyControlMode.MANUAL): AcademyStateSnapshot {
    return createAcademySnapshot({ ...ADMISSION, controlMode: mode }, G);
}

/** 推進一步後，若出現經典事件就一律選 A（測試清談／抽牌時用） */
function act(state: AcademyStateSnapshot, action: AcademyActionPayload): AcademyStateSnapshot {
    let next = resolveAcademyAction(state, action, G);
    while (yingchuanStateOf(next).eventPending && !next.pendingInterrupt) {
        next = resolveAcademyAction(next, { actionType: 'GIMMICK_INTERACT', selectedOptionId: 'EVENT:A' }, G);
    }
    return next;
}

/** 手動策略：有打斷取第一候選；清談出點數最高三張；新牌一律換掉點數最低的；精力低就休息 */
function manualAction(state: AcademyStateSnapshot): AcademyActionPayload {
    const g = yingchuanStateOf(state);
    if (state.pendingInterrupt) return { actionType: 'RESOLVE_INTERRUPT', selectedOptionId: state.interruptOptions[0] };
    if (g.eventPending) return { actionType: 'GIMMICK_INTERACT', selectedOptionId: 'EVENT:B' };
    if (g.debatePending) {
        if (g.handCards.length === 0) return { actionType: 'GIMMICK_INTERACT', selectedOptionId: 'SKIP' };
        const picks = g.handCards.map((c, i) => ({ i, p: c.debatePower })).sort((a, b) => b.p - a.p || a.i - b.i).slice(0, 3).map((o) => o.i);
        return { actionType: 'GIMMICK_INTERACT', selectedOptionId: `DEBATE:${picks.join(',')}` };
    }
    if (g.pendingCard) {
        let low = 0;
        g.handCards.forEach((c, i) => { if (c.debatePower < g.handCards[low].debatePower) low = i; });
        return { actionType: 'GIMMICK_INTERACT', selectedOptionId: g.pendingCard.debatePower > g.handCards[low].debatePower ? `DISCARD:${low}` : 'DECLINE' };
    }
    if (state.energy < 35) return { actionType: 'REST' };
    return { actionType: 'TRAIN', targetStat: state.currentTurn % 3 === 0 ? 'pol' : 'int' };
}

function runManual(): AcademyStateSnapshot {
    let state = start();
    for (let guard = 0; guard < 400 && !state.graduated; guard++) state = resolveAcademyAction(state, manualAction(state), G);
    return state;
}

export function createYingchuanAcademySuite(): TestSuite {
    const suite = new TestSuite('YingchuanAcademy (潁川書院策論與清談 PROG-2-1903)');

    suite.test('TC-YC-02：天人合一倍率精確為 2.5；同氣相求 2.0；2 同 1 異 1.3', () => {
        const tri = YingchuanDebateResolver.evaluateCombo([card(EssayCardCategory.SKY), card(EssayCardCategory.EARTH), card(EssayCardCategory.PEOPLE)]);
        assert.equals('TRI_HARMONIC', tri.comboType);
        assert.equals(2.5, tri.multiplier);
        const three = YingchuanDebateResolver.evaluateCombo([card(EssayCardCategory.EARTH), card(EssayCardCategory.EARTH), card(EssayCardCategory.EARTH)]);
        assert.equals('THREE_OF_KIND', three.comboType);
        assert.equals(2, three.multiplier);
        const common = YingchuanDebateResolver.evaluateCombo([card(EssayCardCategory.SKY), card(EssayCardCategory.SKY), card(EssayCardCategory.PEOPLE)]);
        assert.equals('COMMON', common.comboType);
        assert.equals(130, common.multiplierPct);
    });

    suite.test('練智力／政治／統率才抽牌，練武力不抽', () => {
        const s0 = start();
        assert.equals(1, yingchuanStateOf(resolveAcademyAction(s0, { actionType: 'TRAIN', targetStat: 'int' }, G)).handCards.length);
        assert.equals(0, yingchuanStateOf(resolveAcademyAction(s0, { actionType: 'TRAIN', targetStat: 'str' }, G)).handCards.length);
    });

    suite.test('TC-YC-01：手牌 5 張時再抽，新牌待決定，手牌永不超過 5', () => {
        let state = start();
        const g0 = yingchuanStateOf(state);
        g0.handCards = [1, 2, 3, 4, 5].map((n) => card(EssayCardCategory.SKY, 1, `H${n}`));
        state = resolveAcademyAction(state, { actionType: 'TRAIN', targetStat: 'int' }, G);
        const g = yingchuanStateOf(state);
        assert.equals(YINGCHUAN_HAND_LIMIT, g.handCards.length);
        assert.isTrue(g.pendingCard !== null);
        const newId = g.pendingCard!.id;
        const swapped = resolveAcademyAction(state, { actionType: 'GIMMICK_INTERACT', selectedOptionId: 'DISCARD:2' }, G);
        assert.equals(newId, yingchuanStateOf(swapped).handCards[2].id);
        assert.equals(null, yingchuanStateOf(swapped).pendingCard);
        const declined = resolveAcademyAction(state, { actionType: 'GIMMICK_INTERACT', selectedOptionId: 'DECLINE' }, G);
        assert.equals('H3', yingchuanStateOf(declined).handCards[2].id);
        assert.throws(() => resolveAcademyAction(declined, { actionType: 'GIMMICK_INTERACT', selectedOptionId: 'DISCARD:0' }, G));
    });

    suite.test('TC-YC-03：同一種子在第 6 回合前抽牌，重跑 100 次結果一致', () => {
        const runTo6 = () => {
            let s = start();
            while (s.currentTurn < 6) s = act(s, { actionType: 'TRAIN', targetStat: 'int' });
            return JSON.stringify(yingchuanStateOf(s).handCards);
        };
        const first = runTo6();
        for (let i = 0; i < 100; i++) assert.equals(first, runTo6());
    });

    suite.test('清談大會：第 6 回合須先清談才能訓練，出牌後手牌移除', () => {
        let state = start();
        while (state.currentTurn < 6) state = act(state, { actionType: 'TRAIN', targetStat: 'int' });
        const g = yingchuanStateOf(state);
        assert.isTrue(g.debatePending);
        assert.throws(() => resolveAcademyAction(state, { actionType: 'TRAIN', targetStat: 'int' }, G));
        assert.throws(() => resolveAcademyAction(state, { actionType: 'GIMMICK_INTERACT', selectedOptionId: 'DEBATE:0,0,1' }, G));
        const debated = resolveAcademyAction(state, { actionType: 'GIMMICK_INTERACT', selectedOptionId: 'DEBATE:0,1,2' }, G);
        assert.equals(g.handCards.length - 3, yingchuanStateOf(debated).handCards.length);
        assert.isFalse(yingchuanStateOf(debated).debatePending);
        assert.equals(6, debated.currentTurn, '清談不消耗回合');
        assert.contains(debated.chronicles.map((c) => c.title).join(','), '潁水清談');
        resolveAcademyAction(debated, { actionType: 'TRAIN', targetStat: 'int' }, G);
    });

    suite.test('天人合一：智力與政治同時成長，記次數與名士認可印章', () => {
        let state = start();
        while (state.currentTurn < 6) state = act(state, { actionType: 'REST' });
        const g = yingchuanStateOf(state);
        g.handCards = [card(EssayCardCategory.SKY, 3), card(EssayCardCategory.EARTH, 3), card(EssayCardCategory.PEOPLE, 3)];
        const after = resolveAcademyAction(state, { actionType: 'GIMMICK_INTERACT', selectedOptionId: 'DEBATE:0,1,2' }, G);
        // 150 點 × 體力 100% × 250% ÷ 2 = 187
        assert.equals(state.stats.int + 187, after.stats.int);
        assert.equals(state.stats.pol + 187, after.stats.pol);
        assert.equals(1, yingchuanStateOf(after).triHarmonicCount);
        assert.isTrue(yingchuanStateOf(after).masterEndorsements.indexOf(YINGCHUAN_MASTERS[6].endorsement) >= 0, '150 點超過司馬徽考評線');
    });

    suite.test('體力折算：60↑ 100%、30~59 90%、0~29 70%', () => {
        assert.equals(100, yingchuanStaminaPowerPct(60));
        assert.equals(90, yingchuanStaminaPowerPct(59));
        assert.equals(90, yingchuanStaminaPowerPct(30));
        assert.equals(70, yingchuanStaminaPowerPct(29));
    });

    suite.test('低體力強行苦讀：多次嘗試中會出現受挫並記【心浮氣躁】', () => {
        let found = false;
        for (let k = 0; k < 40 && !found; k++) {
            const s = createAcademySnapshot({ ...ADMISSION, childId: `child-${k}`, initialEnergy: 10 }, G);
            const after = resolveAcademyAction(s, { actionType: 'TRAIN', targetStat: 'int' }, G);
            found = yingchuanStateOf(after).negativeTraits.indexOf(YINGCHUAN_NEGATIVE_RESTLESS) >= 0;
        }
        assert.isTrue(found, '35% 受挫在 40 個種子內應出現');
    });

    suite.test('結業：通過荀爽大考且達條件，發放三項專屬產出', () => {
        let state = start();
        for (let guard = 0; guard < 400; guard++) {
            if (state.pendingInterrupt === 'GRADUATION') break;
            state = resolveAcademyAction(state, manualAction(state), G);
        }
        const g = yingchuanStateOf(state);
        g.masterEndorsements = [YINGCHUAN_MASTERS[6].endorsement, YINGCHUAN_MASTERS[36].endorsement];
        g.triHarmonicCount = 2;
        state.stats.int = 95;
        state.stats.pol = 85;
        const done = resolveAcademyAction(state, { actionType: 'RESOLVE_INTERRUPT', selectedOptionId: state.interruptOptions[0] }, G);
        assert.isTrue(done.graduated);
        assert.isTrue(done.learnedTactics.indexOf(TAC_LIAODI_JIXIAN) >= 0);
        assert.isTrue(done.learnedTactics.indexOf(TAC_SHISHENG_SHIBAI) >= 0);
        assert.isTrue(done.learnedTraits.indexOf(TRT_YINGSHUI_QINGLIU) >= 0);
        assert.isTrue(done.learnedTactics.length <= 3);
    });

    suite.test('結業：沒有荀爽印章就不發放', () => {
        let state = start();
        for (let guard = 0; guard < 400; guard++) {
            if (state.pendingInterrupt === 'GRADUATION') break;
            state = resolveAcademyAction(state, manualAction(state), G);
        }
        yingchuanStateOf(state).masterEndorsements = [];
        state.learnedTactics = [];
        state.learnedTraits = [];
        state.stats.int = 99;
        state.stats.pol = 99;
        const done = resolveAcademyAction(state, { actionType: 'RESOLVE_INTERRUPT', selectedOptionId: state.interruptOptions[0] }, G);
        assert.equals(-1, done.learnedTactics.indexOf(TAC_LIAODI_JIXIAN));
        assert.equals(-1, done.learnedTraits.indexOf(TRT_YINGSHUI_QINGLIU));
    });

    suite.test('手動跑完 36 回合：六次清談、可畢業、結果可重播', () => {
        const a = runManual();
        assert.isTrue(a.graduated);
        assert.equals(6, a.chronicles.filter((c) => c.title === '潁水清談').length);
        assert.equals(JSON.stringify(a), JSON.stringify(runManual()));
        assert.isTrue(a.stats.int > ADMISSION.initialStats.int);
    });

    suite.test('AUTO 模式：清談由引擎代出牌，一路跑完', () => {
        let state = start(AcademyControlMode.AUTO);
        for (let guard = 0; guard < 400 && !state.graduated; guard++) {
            assert.isFalse(yingchuanStateOf(state).debatePending);
            state = resolveAcademyAction(state, state.energy < 35 ? { actionType: 'REST' } : { actionType: 'TRAIN', targetStat: 'int' }, G);
        }
        assert.isTrue(state.graduated);
        assert.equals(6, state.chronicles.filter((c) => c.title === '潁水清談').length);
    });

    suite.test('教官：入學第 1 回合才能指派，至多 3 位且不重複', () => {
        const s0 = start();
        const assigned = assignYingchuanMentors(s0, YINGCHUAN_MENTOR_CATALOG);
        assert.equals(3, yingchuanStateOf(assigned).mentors.length);
        assert.equals(0, yingchuanStateOf(s0).mentors.length, '輸入快照不得被改動');
        assert.throws(() => assignYingchuanMentors(s0, [...YINGCHUAN_MENTOR_CATALOG, YINGCHUAN_MENTOR_CATALOG[0]]));
        assert.throws(() => assignYingchuanMentors(s0, [YINGCHUAN_MENTOR_CATALOG[0], YINGCHUAN_MENTOR_CATALOG[0]]));
        const moved = resolveAcademyAction(s0, { actionType: 'REST' }, G);
        assert.throws(() => assignYingchuanMentors(moved, [YINGCHUAN_MENTOR_CATALOG[0]]));
    });

    suite.test('教官羈絆：打出同系牌 +15，滿 100 後下一場清談觸發七日頓悟並成為弱冠禮候選', () => {
        const guoJia = YINGCHUAN_MENTOR_CATALOG.find((m) => m.generalId === 'guo-jia')!;
        let state = assignYingchuanMentors(start(), [guoJia]);
        while (state.currentTurn < 6) state = act(state, { actionType: 'REST' });
        const sky = () => [card(EssayCardCategory.SKY, 1, 'a'), card(EssayCardCategory.SKY, 1, 'b'), card(EssayCardCategory.SKY, 1, 'c')];
        yingchuanStateOf(state).handCards = sky();
        state = resolveAcademyAction(state, { actionType: 'GIMMICK_INTERACT', selectedOptionId: 'DEBATE:0,1,2' }, G);
        assert.equals(3 * YINGCHUAN_TUNING.mentorBondPerCard, yingchuanStateOf(state).mentors[0].bond);
        yingchuanStateOf(state).mentors[0].bond = 100;
        while (state.currentTurn < 12 || state.pendingInterrupt) state = state.pendingInterrupt
            ? resolveAcademyAction(state, { actionType: 'RESOLVE_INTERRUPT', selectedOptionId: state.interruptOptions[0] }, G)
            : act(state, { actionType: 'REST' });
        yingchuanStateOf(state).handCards = sky();
        state = resolveAcademyAction(state, { actionType: 'GIMMICK_INTERACT', selectedOptionId: 'DEBATE:0,1,2' }, G);
        const g = yingchuanStateOf(state);
        assert.isTrue(g.mentors[0].epiphanyDone);
        assert.isTrue(g.inspirations.indexOf(guoJia.signatureTactic) >= 0);
        assert.contains(state.chronicles.map((c) => c.title).join(','), '七日清談頓悟');
        assert.equals(guoJia.signatureTactic, G.comingOfAgeOptions!(state, null as never)[0]);
        assert.equals(3, G.comingOfAgeOptions!(state, null as never).length);
    });

    suite.test('事件：第 3 回合水鏡先生之問，未抉擇前不得訓練；A 調高天時牌權重並加智力', () => {
        let state = start();
        state = resolveAcademyAction(state, { actionType: 'REST' }, G);
        state = resolveAcademyAction(state, { actionType: 'REST' }, G);
        assert.equals(3, state.currentTurn);
        assert.equals('EVT_SHUIJING_QUESTION', yingchuanStateOf(state).eventPending);
        assert.throws(() => resolveAcademyAction(state, { actionType: 'TRAIN', targetStat: 'int' }, G));
        const a = resolveAcademyAction(state, { actionType: 'GIMMICK_INTERACT', selectedOptionId: 'EVENT:A' }, G);
        assert.equals(state.stats.int + 15, a.stats.int);
        assert.equals(YINGCHUAN_TUNING.eventFavoredCategoryWeight, yingchuanStateOf(a).categoryWeights[0]);
        assert.equals(null, yingchuanStateOf(a).eventPending);
        assert.throws(() => resolveAcademyAction(a, { actionType: 'GIMMICK_INTERACT', selectedOptionId: 'EVENT:A' }, G));
        const b = resolveAcademyAction(state, { actionType: 'GIMMICK_INTERACT', selectedOptionId: 'EVENT:B' }, G);
        assert.equals(state.stats.pol + 15, b.stats.pol);
        assert.equals(YINGCHUAN_TUNING.eventFavoredCategoryWeight, yingchuanStateOf(b).categoryWeights[2]);
    });

    suite.test('事件：潁水文會需體力 ≥50；荀氏藏書閣需清談點數；終考必發', () => {
        const ids = YINGCHUAN_EVENTS.map((e) => `${e.turn}:${e.id}`).join(',');
        assert.contains(ids, '33:EVT_FINAL_STRATEGY');
        const a = runManual();
        const titles = a.chronicles.map((c) => c.title);
        assert.isTrue(titles.indexOf('水鏡先生之問') >= 0);
        assert.isTrue(titles.indexOf('終考：王佐之策') >= 0);
        assert.isTrue(a.learnedTraits.indexOf(TRT_YINGSHUI_QINGLIU) >= 0, '終考選 B 解鎖潁水清流');
        // 體力不足時潁水文會不觸發
        let low = start();
        while (low.currentTurn < 9 || low.pendingInterrupt || yingchuanStateOf(low).eventPending || yingchuanStateOf(low).debatePending) low = resolveAcademyAction(low, manualAction(low), G);
        low.energy = 10;
        const after = resolveAcademyAction(low, { actionType: 'TRAIN', targetStat: 'str' }, G);
        assert.equals(10, after.currentTurn);
        assert.equals(null, yingchuanStateOf(after).eventPending);
    });

    return suite;
}
