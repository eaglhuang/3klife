// @spec-source → 通用任務卡 D（PROG-2-9152）：詳情視窗與候選清單改吃服務層投影
import { TestSuite, assert } from '../TestRunner';
import type { MissionDetailView, Revealable } from '../../assets/scripts/core/mission/MissionTypes';
import type { CandidateView, IMissionService, MissionCardView, MissionResult } from '../../assets/scripts/core/mission/service/IMissionService';
import {
    MISSION_PERFECT_REVEAL_NOTE, buildMissionDialogState, candidateOptions, intelGainFloatText, intelUnlockNote, labeled, lockedStatusText,
    perfectRewardLabel, returnSeasonText, seasonCodeLabel, stripLabel,
} from '../../assets/scripts/ui/mission/MissionDetailPresenter';

const ok = <T>(value: T): MissionResult<T> => ({ ok: true, value, revision: 1, ledger: [], events: [] });
const hint = (text: string): Revealable => ({ state: 'hint', text });

function detail(over: Partial<MissionDetailView> = {}): MissionDetailView {
    return {
        id: 'M1', defId: 'beacon-patrol', title: '巡查烽燧', brief: '簡介', theme: 'patrol', difficulty: 'NORMAL', intel: 35, intelBand: 'vague',
        facts: [{ key: 'a', label: '敵情', text: '約數十人', state: 'hint' }, { key: 'b', label: '地形', text: '???', state: 'hidden' }],
        objective: hint('巡查烽燧'), hints: ['傳聞有異'], rate: hint('成功率：高'), risk: hint('風險：低'), riskTags: [], reward: hint('量級：★★'),
        hiddenRewards: [], cost: { grain: 100, troops: 50, gold: 20, silver: 0, energy: 10 }, durationSeasons: 1, expireSeason: 3, status: 'OPEN',
        canRecon: true, canWait: true, ...over,
    };
}

function cand(id: string, over: Partial<CandidateView> = {}): CandidateView {
    return { generalId: id, name: id, block: [], blockText: '', rate: hint('成功率：中'), volunteer: false, memoryHint: '', ...over };
}

function card(over: Partial<MissionCardView> = {}): MissionCardView {
    return {
        id: 'M1', defId: 'beacon-patrol', title: '巡查烽燧', theme: 'patrol', difficulty: 'NORMAL', intel: 35, intelBand: 'vague', status: 'OPEN',
        expireSeason: 3, rate: hint('成功率：高'), reward: hint('量級：★★'), ...over,
    };
}

/** 只實作畫面會讀的三個查詢；動作與同步一律不該被呼叫（投影純讀） */
function fake(d: MissionDetailView, cands: CandidateView[], c: MissionCardView = card()): IMissionService {
    const never = (): never => { throw new Error('presenter 不該呼叫動作'); };
    return {
        getBoard: () => ok({ revision: 1, season: 1, missions: [c] }),
        getDetail: () => ok(d),
        getCandidates: () => ok(cands),
        getHistory: never, recon: never, wait: never, dispatch: never, advanceSeason: never, getSnapshot: never, loadSnapshot: never, onChanged: never,
    } as unknown as IMissionService;
}

const ctx = (over: Record<string, unknown> = {}) => ({
    season: 1, stock: { grain: 500, gold: 500, silver: 500, troops: 500 }, reconGrainCost: 50, reconCap: 90, hiddenRevealIntel: 100, selectedGeneralId: null as string | null, ...over,
});
const wall = (): 'Military' => 'Military';

export function createMissionDetailPresenterSuite(): TestSuite {
    const suite = new TestSuite('MissionDetailPresenter (PROG-2-9152：詳情視窗與候選清單改吃服務層)');

    suite.test('標籤去重：投影自帶「風險：」「成功率：」時不再重複前綴', () => {
        assert.equals('風險：低', labeled('風險', '風險：低'));
        assert.equals('風險：高？', labeled('風險', '高？'));
        assert.equals('風險：大失敗約 12%', labeled('風險', '大失敗約 12%'));
        assert.equals('成功率 高', labeled('成功率', '成功率：高', ' '));
        assert.equals('成功率 未知', labeled('成功率', '未知', ' '));
        assert.equals('成功率 約 40～60%', labeled('成功率', '約 40～60%', ' '));
        assert.equals('高', stripLabel('成功率', '成功率：高'));
    });

    suite.test('詳情 state 沒有重複標籤，且全部取自服務投影', () => {
        const s = buildMissionDialogState(fake(detail(), [cand('A')]), 'M1', wall, ctx({ selectedGeneralId: 'A' }))!;
        assert.equals('風險：低・剩餘期限 3 季', s.envScoutWeatherLine);
        assert.equals('成功率 中（A）', s.generalSelectHintLabel);
        assert.equals('量級：★★', s.rewardBaseLabel);
        assert.isFalse(s.envScoutWeatherLine.includes('風險：風險'));
        assert.isFalse(s.generalSelectHintLabel.includes('成功率 成功率'));
        assert.equals('敵情：約數十人', s.envScoutTerrainLine, '隱藏的事實不顯示');
    });

    suite.test('低情報：風險「高？」、成功率「未知」，不洩漏細節', () => {
        const d = detail({ intel: 10, intelBand: 'blind', rate: { state: 'hidden', text: '未知' }, risk: { state: 'hidden', text: '高？' } });
        const s = buildMissionDialogState(fake(d, [cand('A', { rate: { state: 'hidden', text: '未知' } })]), 'M1', wall, ctx({ selectedGeneralId: 'A' }))!;
        assert.equals('風險：高？・剩餘期限 3 季', s.envScoutWeatherLine);
        assert.equals('成功率 未知（A）', s.generalSelectHintLabel);
    });

    suite.test('候選分「可派」「不可派（附原因）」兩組，可派者帶記憶提示與自願者標記', () => {
        const opts = candidateOptions([
            cand('hurt', { block: ['injured'], blockText: '受傷休養中' }),
            cand('vet', { memoryHint: '曾 3 次勝任軍事' }),
            cand('vol', { volunteer: true }),
            cand('away', { block: ['on-mission'], blockText: '出任務中', memoryHint: '不該顯示' }),
        ]);
        assert.equals(4, opts.length, '全員列出，沒有人消失');
        assert.equals(['vet', 'vol', 'hurt', 'away'].join(','), opts.map((o) => o.id).join(','), '可派在前、不可派在後');
        assert.equals('available', opts[0].group);
        assert.equals('曾 3 次勝任軍事', opts[0].memoryHint);
        assert.equals(true, opts[1].volunteer);
        assert.equals('unavailable', opts[2].group);
        assert.equals('受傷休養中', opts[2].blockedText);
        assert.isTrue(opts[3].memoryHint === undefined, '不可派者不顯示記憶提示');
        assert.equals('vet', opts[0].label, '標籤只放武將名，不把提示塞進名字');
    });

    suite.test('完美獎勵：情報 90 以下一律 ???＋說明；100 才揭曉', () => {
        for (const intel of [0, 30, 60, 90]) {
            const label = perfectRewardLabel({ intel, hiddenRewards: ['隱藏：名馬'] });
            assert.isTrue(label.startsWith('???'), `intel ${intel}`);
            assert.isTrue(label.includes(MISSION_PERFECT_REVEAL_NOTE));
            assert.isFalse(label.includes('名馬'), '情報不足時不洩漏隱藏獎勵');
        }
        assert.equals('隱藏：名馬', perfectRewardLabel({ intel: 100, hiddenRewards: ['隱藏：名馬'] }));
        assert.equals('無額外完美獎勵', perfectRewardLabel({ intel: 100, hiddenRewards: [] }));
        const s = buildMissionDialogState(fake(detail({ intel: 90, intelBand: 'full', canRecon: false }), [cand('A')]), 'M1', wall, ctx())!;
        assert.isTrue(s.rewardPerfectLabel.includes('情報 100 才會揭曉'));
        assert.isTrue(s.intelHintLabel.includes('已達再探上限'), '90 不寫「情報已完整」');
        assert.isTrue((s.actionBlockedText['re-scout'] ?? '').includes('連鎖'), '再探鈕停用原因說明要靠連鎖或特殊來源');
    });

    suite.test('再探浮字：「情報 +25 → 78%」，並限制在 0～100', () => {
        assert.equals('情報 +25 → 78%', intelGainFloatText(25, 78));
        assert.equals('情報 +35 → 100%', intelGainFloatText(35, 130));
        assert.equals('情報 +0 → 0%', intelGainFloatText(-5, -2));
    });

    suite.test('派遣後鎖定：情報、成功率顯示派出時的值，四鈕停用，並顯示預計回報季', () => {
        const d = detail({ status: 'ACTIVE', intel: 78, intelBand: 'clear', rate: { state: 'range', text: '約 60～80%' } });
        const c = card({ status: 'ACTIVE', executorName: '張飛', returnSeason: 5 });
        const s = buildMissionDialogState(fake(d, [cand('張飛', { block: ['on-mission'], blockText: '出任務中' })], c), 'M1', wall, ctx({ season: 2 }))!;
        assert.isTrue(s.locked);
        assert.equals(0, s.availableActions.length);
        for (const k of ['re-scout', 'wait', 'execute', 'assign'] as const) assert.equals('任務進行中', s.actionBlockedText[k]);
        assert.equals('已鎖定・情報 78%，分支與成功率已凍結', s.intelHintLabel);
        assert.isTrue(s.intelFogVisible, '鎖定中提示列要顯示（鎖定文字在那裡）');
        assert.isTrue(s.envScoutWeatherLine.includes('預計第 2 年 2 季回報（還有 3 季）'), s.envScoutWeatherLine);
        assert.equals('成功率 約 60～80%（派出時定下）・張飛出任務中', s.generalSelectHintLabel);
        assert.isFalse(s.volunteerBadgeVisible);
    });

    suite.test('季編碼轉「第 N 年 M 季」，鎖定文字缺回報季時不崩', () => {
        assert.equals('第 1 年 1 季', seasonCodeLabel(0));
        assert.equals('第 1 年 4 季', seasonCodeLabel(3));
        assert.equals('第 2 年 1 季', seasonCodeLabel(4));
        assert.equals('已鎖定・情報 50%，分支與成功率已凍結', lockedStatusText({ intel: 50 }));
        assert.equals('', returnSeasonText(undefined, 1));
        assert.equals('預計第 1 年 3 季回報（還有 2 季）', returnSeasonText(card({ returnSeason: 2 }), 0));
    });

    suite.test('四鈕：沒有可派武將、糧草不足、已等待過都有明確原因；名冊為空另有文字', () => {
        const none = buildMissionDialogState(fake(detail(), [cand('A', { block: ['on-mission'], blockText: '出任務中' })]), 'M1', wall, ctx())!;
        assert.equals(['re-scout', 'wait'].join(','), none.availableActions.join(','));
        assert.isTrue((none.actionBlockedText.execute ?? '').includes('下方各武將原因'));
        const empty = buildMissionDialogState(fake(detail(), []), 'M1', wall, ctx())!;
        assert.equals('名冊裡目前沒有武將', empty.generalSelectHintLabel);
        const poor = buildMissionDialogState(fake(detail({ canWait: false }), [cand('A')]), 'M1', wall, ctx({ stock: { grain: 10, gold: 500, silver: 500, troops: 500 } }))!;
        assert.isTrue((poor.actionBlockedText['re-scout'] ?? '').includes('糧草不足'));
        assert.equals('此任務已等待過', poor.actionBlockedText.wait);
        assert.isTrue(poor.costFoodValueLabel.includes('不足，現有 10'));
    });

    suite.test('情報提示寫出下一段能多看到什麼（取捨可見，PROG-2-9965）', () => {
        const bands = { vague: 30, clear: 60, full: 90 };
        assert.isTrue(intelUnlockNote(10, bands).includes('30%'));
        assert.isTrue(intelUnlockNote(35, bands).includes('60%'));
        assert.isTrue(intelUnlockNote(70, bands).includes('90%'));
        assert.equals('', intelUnlockNote(95, bands));
        assert.equals('', intelUnlockNote(10));
        const s = buildMissionDialogState(fake(detail({ intel: 35 }), [cand('a')]), 'M1', wall, { ...ctx(), intelBands: bands })!;
        assert.isTrue(s.intelHintLabel.includes('到 60% 可看到成功率區間'));
    });

    suite.test('沒有該任務回傳 null；presenter 只讀不寫（不呼叫任何動作）', () => {
        const svc = fake(detail(), []);
        (svc as unknown as { getDetail: () => MissionResult<never> }).getDetail = () => ({ ok: false, code: 'NO_MISSION', text: 'x' });
        assert.isTrue(buildMissionDialogState(svc, 'NOPE', wall, ctx()) === null);
    });

    return suite;
}
