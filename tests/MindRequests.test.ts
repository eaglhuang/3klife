/**
 * MindRequests.test.ts — 武將心智 MIND-2（PROG-2-9150）：學習規則、主動請求、勸阻與抗命、信箱回寫、重播與存檔
 *
 * 鎖住：連敗後 Wise 謹慎／Brave 雪恥且成功一次解除、羈絆與宿怨累計、請求頻率上限（全隊每季 ≤6、同將同類冷卻）、
 * 勸阻只小幅下修成功率、只有忠誠 <30 且連續受辱才抗命一次、請求與台詞引用真實事件（任務名、對手名、季數）、
 * 答應／拒絕回寫事件、同 seed 同結果、存檔來回、五因子接真資料、日誌個人化反應、季度性格事件經歷權重。
 *
 * Unity 對照：像替一組 Utility AI 行為與信箱寫的 EditMode 測試，全部純邏輯，不開場景。
 */
import { assert, TestSuite } from './TestRunner';
import { OfflineGeneralMindService } from '../assets/scripts/core/mind/OfflineGeneralMindService';
import { planRequests, type RequestPlanInput } from '../assets/scripts/core/mind/MindRequests';
import { bondsOf, confidenceOf, insultCount, learnedTags } from '../assets/scripts/core/mind/MindLearning';
import { personalityVector } from '../assets/scripts/core/mind/MindRules';
import { normalizeGeneralMind } from '../assets/scripts/core/mind/MindSave';
import { REQUEST_ADVISE, REQUEST_ASK_BATTLE, REQUEST_ASK_BATTLE_GRUDGE, REQUEST_COMPLAIN_IDLE, REQUEST_REDEEM, citeOf } from '../assets/scripts/core/mind/MindLineTemplates';
import { MIND_CONFIG, type MindContext, type MindGeneralView, type MindRequest } from '../assets/scripts/core/mind/MindTypes';
import { npcCooldownModifier, npcMoodModifier, npcRelationshipModifier, scoreInitiative } from '../assets/scripts/core/systems/NpcUtilityAI';
import {
    JOURNAL_REACTION_PERSONAL, JOURNAL_REACTION_FALLBACK, canAcceptReactionLine, journalReactionLine,
} from '../assets/scripts/core/systems/JournalReaction';
import { rollSeasonPersonalityEvents } from '../assets/scripts/core/systems/SeasonPersonalityEvents';
import { buildMindRequestRows, mindBadgeText } from '../assets/scripts/ui/components/mind/MindRequestView';
import { GameSession } from '../assets/scripts/core/managers/GameSession';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

const VIEWS: Record<string, MindGeneralView> = {
    'zhang-fei': { id: 'zhang-fei', name: '張飛', personality: { type: 'Brave' } },
    zhuge: { id: 'zhuge', name: '諸葛亮', personality: { type: 'Wise' } },
    'guan-yu': { id: 'guan-yu', name: '關羽', personality: { type: 'Loyal' } },
    'xiahou-dun': { id: 'xiahou-dun', name: '夏侯惇', personality: { type: 'Brave' } },
    'lu-bu': { id: 'lu-bu', name: '呂布' },
};

const SEASON_NAMES = ['春', '夏', '秋', '冬'];
const seasonLabel = (s: number): string => `第${Math.floor(s / 4) + 1}年${SEASON_NAMES[s % 4]}`;

function ctxFor(season: number, extra: Record<string, Partial<MindContext>> = {}): (id: string) => MindContext {
    return (id) => ({
        season,
        general: VIEWS[id] ?? { id, name: id, personality: { type: 'Brave' } },
        nameOf: (x) => VIEWS[x]?.name,
        seasonLabel,
        ...(extra[id] ?? {}),
    });
}

function task(svc: OfflineGeneralMindService, id: string, season: number, outcome: 'SUCCESS' | 'FAIL', generalIds: string[] = ['zhang-fei'], extra: Record<string, unknown> = {}) {
    return svc.onTaskSettled({
        taskId: id, season, tags: ['Military', 'hebei'], label: '河北押運', risk: 3, intelLevelAtDispatch: 3,
        generalIds, delegated: false, volunteered: false, outcome, ...extra,
    });
}

function planInput(svc: OfflineGeneralMindService, season: number, seed: number, ids: string[], extra: Record<string, Partial<MindContext>> = {}, over: Partial<RequestPlanInput> = {}): RequestPlanInput {
    const snap = svc.snapshot();
    const ctxOf = ctxFor(season, extra);
    return {
        season, seed, generalIds: ids, events: snap.events, ledger: snap.ledger, cooldowns: snap.cooldowns,
        pending: snap.requests.filter(r => r.status === 'PENDING'), issuedThisSeason: 0,
        contextOf: ctxOf, moodOf: (id, ctx) => svc.moodOf(id, ctx), ...over,
    };
}

/** 掃種子找出「會提出指定請求」的一季；純函式規劃，不動狀態 */
function seedFor(svc: OfflineGeneralMindService, season: number, ids: string[], kind: string, extra: Record<string, Partial<MindContext>> = {}): { seed: number; requests: MindRequest[] } {
    for (let seed = 1; seed <= 600; seed++) {
        const requests = planRequests(planInput(svc, season, seed, ids, extra));
        if (requests.some(r => r.kind === kind)) return { seed, requests };
    }
    throw new Error(`找不到會提出 ${kind} 的種子`);
}

function member(id: string, extra: Record<string, unknown> = {}): GeneralConfig {
    return { id, name: id.toUpperCase(), personality: { type: 'Brave' }, ...extra } as unknown as GeneralConfig;
}

export function createMindRequestsSuite(): TestSuite {
    const suite = new TestSuite('MindRequests (PROG-2-9150 武將心智 MIND-2)');

    suite.test('學習：連敗兩回 Wise 變謹慎、Brave 變雪恥，成功一次解除', () => {
        const svc = new OfflineGeneralMindService();
        task(svc, 't1', 1, 'FAIL', ['zhang-fei']);
        task(svc, 't2', 2, 'FAIL', ['zhang-fei']);
        task(svc, 't1', 1, 'FAIL', ['zhuge']);
        task(svc, 't2', 2, 'FAIL', ['zhuge']);
        const snap = svc.snapshot();
        const brave = learnedTags(snap.ledger['zhang-fei'], snap.events['zhang-fei'], 'Brave', personalityVector(VIEWS['zhang-fei']));
        const wise = learnedTags(snap.ledger.zhuge, snap.events.zhuge, 'Wise', personalityVector(VIEWS.zhuge));
        assert.equals('REDEEM', brave[0].stance);
        assert.equals('CAUTIOUS', wise[0].stance);
        assert.equals('河北押運', wise[0].label);
        task(svc, 't3', 3, 'SUCCESS', ['zhang-fei']);
        const after = svc.snapshot();
        assert.equals(0, learnedTags(after.ledger['zhang-fei'], after.events['zhang-fei'], 'Brave', personalityVector(VIEWS['zhang-fei'])).length);
    });

    suite.test('學習：信心 (win+1)/(win+loss+2)，近期多算一次；事件被擠掉累計器仍在', () => {
        const svc = new OfflineGeneralMindService();
        for (let i = 0; i < 3; i++) task(svc, `w${i}`, i, 'SUCCESS');
        task(svc, 'l', 3, 'FAIL');
        const snap = svc.snapshot();
        const conf = confidenceOf(snap.ledger['zhang-fei'], 'hebei', snap.events['zhang-fei'], 3);
        // 累計 3 勝 1 敗，近 3 季內全部再算一次：6 勝 2 敗 → 7/10
        assert.isTrue(Math.abs(conf - 0.7) < 1e-9, `信心應為 0.7，實得 ${conf}`);
        assert.equals(0.5, confidenceOf(undefined, 'x', [], 0));
    });

    suite.test('羈絆與宿怨：並肩三次出羈絆；單挑敗於某人記入宿怨（≤3）', () => {
        const svc = new OfflineGeneralMindService();
        for (let i = 0; i < 3; i++) task(svc, `p${i}`, i, 'SUCCESS', ['zhang-fei', 'guan-yu']);
        const bonds = bondsOf(svc.snapshot().ledger['zhang-fei']);
        assert.equals('guan-yu', bonds[0].partnerId);
        for (const [i, foe] of ['lu-bu', 'a', 'b', 'c'].entries()) {
            svc.record({ generalId: 'zhang-fei', season: 5 + i, kind: 'DUEL', outcome: 'FAIL', tags: ['duel'], label: '單挑', partnerId: foe });
        }
        const grudges = svc.snapshot().ledger['zhang-fei'].grudges;
        assert.equals(MIND_CONFIG.learning.grudgeCap, grudges.length);
        assert.equals('c', grudges[grudges.length - 1]);
    });

    suite.test('請求：全隊每季 ≤6、每將每季 ≤2、重大每將 ≤1；排序重大優先', () => {
        const svc = new OfflineGeneralMindService();
        const ids: string[] = [];
        for (let g = 0; g < 14; g++) {
            const id = `brave${g}`;
            ids.push(id);
            task(svc, 'a', 1, 'FAIL', [id]);
            task(svc, 'b', 2, 'FAIL', [id]);
            VIEWS[id] = { id, name: `猛將${g}`, personality: { type: 'Brave' } };
        }
        const fame: Record<string, Partial<MindContext>> = {};
        for (const id of ids) fame[id] = { fame: { rank: 1, fame: 90, nextFame: 100, nextTitle: '偏將軍' } };
        let sawFull = false;
        for (let seed = 1; seed <= 40; seed++) {
            const out = planRequests(planInput(svc, 3, seed, ids, fame));
            assert.isTrue(out.length <= MIND_CONFIG.request.maxPerSeasonTeam, `全隊上限：${out.length}`);
            if (out.length === MIND_CONFIG.request.maxPerSeasonTeam) sawFull = true;
            const per = new Map<string, number>();
            for (const r of out) per.set(r.generalId, (per.get(r.generalId) ?? 0) + 1);
            for (const n of per.values()) assert.isTrue(n <= MIND_CONFIG.request.maxPerGeneralPerSeason);
            const firstMinor = out.findIndex(r => !r.major);
            if (firstMinor >= 0) assert.isTrue(out.slice(firstMinor).every(r => !r.major), '重大請求排在一般之前');
        }
        assert.isTrue(sawFull, '活躍：多數種子都能湊滿本季名額');
        // 已提出的名額要扣掉
        const room = planRequests(planInput(svc, 3, 7, ids, fame, { issuedThisSeason: 5 }));
        assert.isTrue(room.length <= 1);
        assert.equals(0, planRequests(planInput(svc, 3, 7, ids, fame, { issuedThisSeason: 6 })).length);
    });

    suite.test('請求：同將同類冷卻 1 季；駁回後冷卻拉長；未回應者不重複提出', () => {
        // 以多顆種子逐一試：找到會提出的那一季，驗證其後的冷卻
        const svc2 = new OfflineGeneralMindService();
        task(svc2, 'a', 1, 'FAIL');
        task(svc2, 'b', 2, 'FAIL');
        let issued: MindRequest | undefined;
        for (let k = 0; k < 400 && !issued; k++) {
            const probe = new OfflineGeneralMindService();
            probe.restore(svc2.snapshot());
            const rep = probe.onSeasonSettle(3, () => (k * 7919 % 4096) / 4096, ['zhang-fei'], ctxFor(3));
            const hit = rep.newRequests.find(r => r.kind === 'REDEEM');
            if (hit) { svc2.restore(probe.snapshot()); issued = hit; }
        }
        assert.isTrue(!!issued, '應能提出雪恥請求');
        const cd = svc2.snapshot().cooldowns['zhang-fei'].REDEEM;
        assert.equals(3 + 1 + MIND_CONFIG.request.sameKindCooldownSeasons, cd);
        // 下一季：仍在冷卻（且還有未回應），不得再提
        for (let seed2 = 1; seed2 <= 80; seed2++) {
            const out = planRequests(planInput(svc2, 4, seed2, ['zhang-fei']));
            assert.isTrue(!out.some(r => r.kind === 'REDEEM'), '冷卻中不得再提同類');
        }
        // 駁回：冷卻變長
        const res = svc2.resolveRequest((issued as MindRequest).id, false, ctxFor(3)('zhang-fei'));
        assert.isTrue(res.ok);
        assert.equals(3 + 1 + MIND_CONFIG.request.sameKindCooldownSeasons * MIND_CONFIG.request.deniedCooldownFactor, svc2.snapshot().cooldowns['zhang-fei'].REDEEM);
    });

    suite.test('勸阻：謹慎者因連敗且情報不足婉言勸阻並引用任務名；只小幅下修成功率', () => {
        const svc = new OfflineGeneralMindService();
        task(svc, 't1', 1, 'FAIL', ['zhuge'], { intelLevelAtDispatch: 1 });
        task(svc, 't2', 2, 'FAIL', ['zhuge'], { intelLevelAtDispatch: 1 });
        const op = svc.queryOpinion('zhuge', { tags: ['Military', 'hebei'], label: '河北押運', intelLevel: 0 }, ctxFor(3)('zhuge'));
        assert.isTrue(op.stance === 'DISSUADE' || op.stance === 'CAUTIOUS', `應勸阻或謹慎：${op.stance}`);
        assert.isTrue(op.line.includes('河北押運'), `台詞要引用任務名：${op.line}`);
        assert.isTrue(op.line.includes('2'), '台詞帶連敗回數');
        assert.isTrue(op.successDelta < 0 && op.successDelta >= -0.05, `只小幅下修：${op.successDelta}`);
        assert.isTrue(op.reasonCodes.includes('CAUTION_NO_INTEL'));
        // 情報充足就不那麼抗拒
        const intel = svc.queryOpinion('zhuge', { tags: ['Military', 'hebei'], label: '河北押運', intelLevel: 3 }, ctxFor(3)('zhuge'));
        assert.isTrue(intel.willingness > op.willingness);
        // 成功一次後解除
        task(svc, 't3', 3, 'SUCCESS', ['zhuge']);
        const healed = svc.queryOpinion('zhuge', { tags: ['Military', 'hebei'], intelLevel: 0 }, ctxFor(3)('zhuge'));
        assert.isTrue(healed.willingness > op.willingness);
        assert.isTrue(!healed.reasonCodes.includes('CAUTION_NO_INTEL'));
    });

    suite.test('意見：雪恥者更願意、羈絆搭檔加分、宿敵同行勸阻；永遠不拒絕（successDelta ≥ -0.05）', () => {
        const svc = new OfflineGeneralMindService();
        task(svc, 't1', 1, 'FAIL', ['zhang-fei']);
        task(svc, 't2', 2, 'FAIL', ['zhang-fei']);
        const redeem = svc.queryOpinion('zhang-fei', { tags: ['hebei'], label: '河北押運' }, ctxFor(3)('zhang-fei'));
        assert.isTrue(redeem.reasonCodes.includes('REDEEM'));
        assert.isTrue(redeem.line.includes('河北押運'));
        svc.record({ generalId: 'zhang-fei', season: 3, kind: 'DUEL', outcome: 'FAIL', tags: ['duel'], label: '單挑', partnerId: 'lu-bu' });
        const withFoe = svc.queryOpinion('zhang-fei', { tags: ['hebei'] }, ctxFor(3)('zhang-fei'), { partnerIds: ['lu-bu'] });
        assert.isTrue(withFoe.reasonCodes.includes('GRUDGE_PARTNER'));
        assert.isTrue(withFoe.line.includes('呂布'));
        assert.isTrue(withFoe.willingness < redeem.willingness);
        assert.isTrue(withFoe.successDelta >= -0.05);
    });

    suite.test('抗命：只有忠誠 <30 且連續受辱才抗命一次並寫信；其餘一律不抗命', () => {
        const svc = new OfflineGeneralMindService();
        const ctx = (loyalty: number | undefined, season: number, locked = false): MindContext => ({ ...ctxFor(season)('zhang-fei'), loyalty, loyaltyLocked: locked });
        svc.record({ generalId: 'zhang-fei', season: 1, kind: 'SCOLDED', label: '責備' });
        svc.record({ generalId: 'zhang-fei', season: 2, kind: 'PASSED_OVER', label: '無回音' });
        assert.equals(null, svc.maybeDefy('zhang-fei', ctx(10, 2)), '受辱只有兩次不抗命');
        svc.record({ generalId: 'zhang-fei', season: 3, kind: 'REQUEST_DENIED', label: '請戰' });
        assert.equals(3, insultCount(svc.snapshot().events['zhang-fei'], svc.snapshot().ledger['zhang-fei'], 3));
        assert.equals(null, svc.maybeDefy('zhang-fei', ctx(30, 3)), '忠誠 30 不抗命');
        assert.equals(null, svc.maybeDefy('zhang-fei', ctx(undefined, 3)), '不知忠誠不抗命');
        assert.equals(null, svc.maybeDefy('zhang-fei', ctx(5, 3, true)), '轉蛋鎖忠誠者不抗命');
        const letter = svc.maybeDefy('zhang-fei', ctx(25, 3));
        assert.isTrue(!!letter && letter.kind === 'DEFY_LETTER');
        assert.isTrue((letter as MindRequest).text.includes('張飛'));
        assert.equals(null, svc.maybeDefy('zhang-fei', ctx(25, 3)), '同一段受辱只抗命一次');
        assert.equals(null, svc.maybeDefy('zhang-fei', ctx(25, 4)), '抗命後的受辱歸零重算');
        for (let i = 0; i < 3; i++) svc.record({ generalId: 'zhang-fei', season: 5 + i, kind: 'SCOLDED', label: '責備' });
        assert.isTrue(!!svc.maybeDefy('zhang-fei', ctx(25, 7)), '又連續受辱才會再次抗命');
        // 抗命信只能「知道了」
        const res = svc.resolveRequest((letter as MindRequest).id, true, ctx(25, 7));
        assert.isTrue(res.ok && res.request?.status === 'ACKED');
    });

    suite.test('台詞引用真實事件：雪恥帶任務名與季數；請戰帶對手名；抱怨帶季數與上回差事；進言帶搭檔名', () => {
        const svc = new OfflineGeneralMindService();
        task(svc, 't1', 5, 'FAIL', ['zhang-fei']);
        task(svc, 't2', 6, 'FAIL', ['zhang-fei']);
        const redeem = seedFor(svc, 7, ['zhang-fei'], 'REDEEM').requests.find(r => r.kind === 'REDEEM') as MindRequest;
        assert.isTrue(redeem.text.includes('河北押運'), redeem.text);
        assert.isTrue(redeem.text.includes(seasonLabel(6)), `要引用最近敗的那季：${redeem.text}`);
        assert.isTrue(redeem.text.includes('2'), '連敗回數');
        assert.equals(6, redeem.ref?.season);

        // 請戰：單挑敗於呂布
        const duel = new OfflineGeneralMindService();
        task(duel, 'w', 4, 'SUCCESS', ['zhang-fei']);
        duel.record({ generalId: 'zhang-fei', season: 6, kind: 'DUEL', outcome: 'FAIL', tags: ['duel'], label: '單挑', partnerId: 'lu-bu' });
        const fameCtx = { 'zhang-fei': { fame: { rank: 2, fame: 270, nextFame: 300, nextTitle: '雜號將軍', bottleneck: 'DUEL' as const } } };
        const ask = seedFor(duel, 8, ['zhang-fei'], 'ASK_BATTLE', fameCtx).requests.find(r => r.kind === 'ASK_BATTLE') as MindRequest;
        assert.isTrue(ask.text.includes('呂布'), ask.text);
        assert.isTrue(ask.text.includes(seasonLabel(6)), ask.text);
        assert.isTrue(ask.text.includes('270/300'));
        assert.equals('lu-bu', ask.ref?.partnerId);

        // 抱怨冷落：久未派遣
        const idle = new OfflineGeneralMindService();
        task(idle, 'w', 1, 'SUCCESS', ['guan-yu']);
        for (let s = 2; s <= 6; s++) idle.onSeasonSettle(s, () => 0.999999, ['guan-yu'], ctxFor(s));
        const complain = seedFor(idle, 7, ['guan-yu'], 'COMPLAIN_IDLE').requests.find(r => r.kind === 'COMPLAIN_IDLE') as MindRequest;
        assert.isTrue(complain.text.includes('河北押運'), complain.text);
        assert.isTrue(complain.text.includes(seasonLabel(1)), complain.text);

        // 進言：與搭檔並肩
        const bond = new OfflineGeneralMindService();
        for (let i = 0; i < 3; i++) task(bond, `p${i}`, i + 1, 'SUCCESS', ['zhuge', 'guan-yu']);
        const advise = seedFor(bond, 5, ['zhuge'], 'ADVISE').requests.find(r => r.kind === 'ADVISE') as MindRequest;
        assert.isTrue(advise.text.includes('關羽'), advise.text);
        assert.equals('guan-yu', advise.ref?.partnerId);
    });

    suite.test('模板守則：所有請求模板的槽位都被填滿，不留 {…}', () => {
        const sample = { name: '甲', cite: '第3年夏的河北押運', n: '2', fame: '90', next: '100', title: '偏將軍', opponent: '呂布', partner: '關羽', label: '河北押運', season: '第3年夏', win: '3' };
        const all: string[] = [];
        for (const table of [REQUEST_REDEEM, REQUEST_ASK_BATTLE, REQUEST_ASK_BATTLE_GRUDGE, REQUEST_COMPLAIN_IDLE]) {
            for (const list of Object.values(table)) all.push(...list);
        }
        for (const list of Object.values(REQUEST_ADVISE)) all.push(...list);
        for (const t of all) {
            const filled = t.replace(/\{(\w+)\}/g, (_w, k: string) => (sample as Record<string, string>)[k] ?? `<<${k}>>`);
            assert.isTrue(!filled.includes('<<'), `未知槽位：${t}`);
        }
        assert.equals('第3年夏的河北押運', citeOf('河北押運', 9, seasonLabel));
        assert.equals('河北押運', citeOf('河北押運', undefined));
    });

    suite.test('回應回寫：答應雪恥→事件＋之後同類成功加倍成里程碑；駁回→REQUEST_DENIED；進言駁回不傷感情', () => {
        const svc = new OfflineGeneralMindService();
        task(svc, 't1', 1, 'FAIL');
        task(svc, 't2', 2, 'FAIL');
        const { seed } = seedFor(svc, 3, ['zhang-fei'], 'REDEEM');
        // 用同一顆種子的規劃結果直接放進信箱，驗證回應路徑
        const planned = planRequests(planInput(svc, 3, seed, ['zhang-fei'])).find(r => r.kind === 'REDEEM') as MindRequest;
        const snap = svc.snapshot();
        snap.requests.push(planned);
        svc.restore(snap);
        const before = svc.moodOf('zhang-fei', ctxFor(3)('zhang-fei'));
        const res = svc.resolveRequest(planned.id, true, ctxFor(3)('zhang-fei'));
        assert.isTrue(res.ok);
        assert.equals('REQUEST_GRANTED', res.events[0].kind);
        assert.equals('REDEEM_GRANTED', res.hook);
        assert.isTrue(res.reply.length > 0);
        assert.isTrue(svc.moodOf('zhang-fei', ctxFor(3)('zhang-fei')) !== 'LOW' || before === 'LOW');
        assert.equals(false, svc.resolveRequest(planned.id, true, ctxFor(3)('zhang-fei')).ok, '同一則不能回應兩次');
        // 之後同類成功：加倍並寫里程碑
        const win = task(svc, 't3', 4, 'SUCCESS').events[0];
        assert.equals(5, win.weight);
        assert.equals('REDEEMED', win.reason);
        assert.equals(3, win.valence);
        // 駁回
        const svc2 = new OfflineGeneralMindService();
        svc2.restore({ ...svc2.snapshot(), requests: [{ ...planned, status: 'PENDING' }] });
        const deny = svc2.resolveRequest(planned.id, false, ctxFor(3)('zhang-fei'));
        assert.equals('REQUEST_DENIED', deny.events[0].kind);
        assert.equals('DENIED', deny.request?.status);
        // 進言駁回：只算知道了
        const advice: MindRequest = { ...planned, id: 'adv', kind: 'ADVISE', major: false, status: 'PENDING' };
        const svc3 = new OfflineGeneralMindService();
        svc3.restore({ ...svc3.snapshot(), requests: [advice] });
        const ack = svc3.resolveRequest('adv', false, ctxFor(3)('zhang-fei'));
        assert.equals(0, ack.events.length);
        assert.equals('ACKED', ack.request?.status);
    });

    suite.test('回應回寫：安撫冷落→稱讚並記 lastPraiseSeason；不理→被無視；請求過期→PASSED_OVER 且冷卻拉長', () => {
        const svc = new OfflineGeneralMindService();
        task(svc, 'w', 1, 'SUCCESS', ['guan-yu']);
        const mk = (id: string, kind: MindRequest['kind'], season: number): MindRequest => ({
            id, generalId: 'guan-yu', kind, season, expiresSeason: season + 2, status: 'PENDING', major: false,
            text: '測試請求', reasonCodes: [], read: false,
        });
        svc.restore({ ...svc.snapshot(), requests: [mk('c1', 'COMPLAIN_IDLE', 2), mk('c2', 'COMPLAIN_IDLE', 2)] });
        const soothe = svc.resolveRequest('c1', true, ctxFor(2)('guan-yu'));
        assert.equals('PRAISED', soothe.events[0].kind);
        assert.equals(2, svc.snapshot().ledger['guan-yu'].lastPraiseSeason);
        const ignore = svc.resolveRequest('c2', false, ctxFor(2)('guan-yu'));
        assert.equals('PASSED_OVER', ignore.events[0].kind);
        // 稱讚、被無視不算被派上用場：冷落不會因此解除
        assert.equals(1, svc.snapshot().ledger['guan-yu'].lastActiveSeason);
        // 過期
        const svc2 = new OfflineGeneralMindService();
        task(svc2, 'w', 1, 'SUCCESS', ['guan-yu']);
        svc2.restore({ ...svc2.snapshot(), requests: [mk('old', 'REDEEM', 2)] });
        const rep = svc2.onSeasonSettle(5, () => 0.5, ['guan-yu'], ctxFor(5));
        assert.equals(1, rep.expiredRequests.length);
        assert.equals('EXPIRED', svc2.mailbox().find(r => r.id === 'old')?.status);
        assert.isTrue(svc2.recentMemories('guan-yu', 10).some(e => e.kind === 'PASSED_OVER'));
    });

    suite.test('可重播：同事件、同 seed 的請求逐字相同；存檔來回信箱與冷卻不變', () => {
        const build = () => {
            const svc = new OfflineGeneralMindService();
            for (const id of ['zhang-fei', 'xiahou-dun']) { task(svc, 'a', 1, 'FAIL', [id]); task(svc, 'b', 2, 'FAIL', [id]); }
            for (let s = 3; s <= 6; s++) svc.onSeasonSettle(s, () => ((s * 2654435761) % 1000) / 1000, ['zhang-fei', 'xiahou-dun'], ctxFor(s));
            return svc;
        };
        const a = build();
        const b = build();
        assert.equals(JSON.stringify(a.snapshot()), JSON.stringify(b.snapshot()));
        assert.equals(JSON.stringify(a.mailbox()), JSON.stringify(b.mailbox()));
        const c = new OfflineGeneralMindService();
        c.restore(JSON.parse(JSON.stringify(a.snapshot())));
        assert.equals(JSON.stringify(a.snapshot()), JSON.stringify(c.snapshot()));
        assert.equals(JSON.stringify(a.mailbox()), JSON.stringify(c.mailbox()));
        // 同季重複結算只算一次
        const before = JSON.stringify(a.snapshot());
        a.onSeasonSettle(6, () => 0.1, ['zhang-fei', 'xiahou-dun'], ctxFor(6));
        assert.equals(before, JSON.stringify(a.snapshot()));
    });

    suite.test('存檔：舊檔缺欄位視為空；壞請求被丟棄；容量上限；未回應優先保留', () => {
        const legacy = normalizeGeneralMind({ v: 1, events: {}, ledger: { a: { seq: 1, byTag: {}, partners: {} } }, lastSeasonSettled: 3 });
        assert.equals(0, legacy.requests.length);
        assert.equals(0, legacy.ledger.a.grudges.length);
        assert.equals(-1, legacy.ledger.a.lastPraiseSeason);
        const good = { id: 'r1', generalId: 'a', kind: 'ADVISE', season: 1, expiresSeason: 3, status: 'PENDING', major: false, text: '進言', reasonCodes: ['X'], read: false };
        const cleaned = normalizeGeneralMind({ v: 1, requests: [good, { ...good, id: 'r2', kind: 'NOPE' }, null, 5, { ...good, id: 'r3', status: 'WEIRD' }, good], cooldowns: { a: { ADVISE: 4, NOPE: 9, REDEEM: 'x' } } });
        assert.equals(1, cleaned.requests.length);
        assert.equals(4, cleaned.cooldowns.a.ADVISE);
        assert.equals(undefined, cleaned.cooldowns.a.NOPE);
        const many = Array.from({ length: 50 }, (_, i) => ({ ...good, id: `r${i}`, status: i < 3 ? 'PENDING' : 'GRANTED' }));
        const trimmed = normalizeGeneralMind({ v: 1, requests: many }).requests;
        assert.equals(MIND_CONFIG.request.mailboxCap, trimmed.length);
        assert.equals(3, trimmed.filter(r => r.status === 'PENDING').length);
    });

    suite.test('Utility AI 五因子接真資料：忠誠低抱怨↑求封↓、心情、冷卻歸零、性格偏好', () => {
        assert.isTrue(npcRelationshipModifier('COMPLAIN_IDLE', 20) > npcRelationshipModifier('COMPLAIN_IDLE', 90));
        assert.isTrue(npcRelationshipModifier('ASK_PROMOTE', 20) < npcRelationshipModifier('ASK_PROMOTE', 90));
        assert.equals(1, npcRelationshipModifier('COMPLAIN_IDLE', undefined));
        assert.equals(1, npcRelationshipModifier('COMPLAIN_IDLE', 10, true));
        assert.isTrue(npcMoodModifier('COMPLAIN_IDLE', 'LOW') > npcMoodModifier('COMPLAIN_IDLE', 'EAGER'));
        assert.equals(0, npcCooldownModifier(5, 4));
        assert.equals(1, npcCooldownModifier(5, 5));
        const base = { urgency: 1, mood: 'NORMAL' as const, season: 3 };
        const brave = { bold: 0.7, prudent: 0.2, warm: 0.2, whim: 0.2 };
        const wise = { bold: 0.2, prudent: 0.7, warm: 0.2, whim: 0.2 };
        assert.isTrue(scoreInitiative({ ...base, kind: 'ASK_BATTLE', axes: brave }) > scoreInitiative({ ...base, kind: 'ASK_BATTLE', axes: wise }));
        assert.isTrue(scoreInitiative({ ...base, kind: 'ADVISE', axes: wise }) > scoreInitiative({ ...base, kind: 'ADVISE', axes: brave }));
        assert.equals(0, scoreInitiative({ ...base, kind: 'ADVISE', axes: wise, nextAllowedSeason: 9 }));
        assert.isTrue(scoreInitiative({ ...base, kind: 'ASK_PROMOTE', axes: wise }) > scoreInitiative({ ...base, kind: 'ADVISE', axes: wise }), '求封急迫度高於進言');
    });

    suite.test('日誌個人化反應：戰報／派遣引用過去的任務與季數，長度合格；沒有提示時維持原行為', () => {
        for (const category of ['BATTLE', 'DISPATCH'] as const) {
            for (const outcome of ['FAIL', 'SUCCESS'] as const) {
                for (const type of ['Brave', 'Wise', 'Loyal', 'Playful'] as const) {
                    for (const name of ['甲', '夏侯惇', '司馬懿']) {
                        for (const cite of ['河北押運', '第12年秋的河北押運', '第3年夏的軍務差事']) {
                            const r = journalReactionLine({ category }, name, 0, { type, cite, outcome });
                            assert.equals('PERSONAL', r.source, `${category}/${outcome}/${type}/${name}/${cite}`);
                            assert.isTrue(canAcceptReactionLine(r.text), `長度：${r.text}`);
                            assert.isTrue(r.text.includes(cite) && r.text.includes(name));
                        }
                    }
                }
            }
        }
        assert.equals(4, Object.values(JOURNAL_REACTION_PERSONAL).flatMap(t => Object.values(t)).length);
        assert.equals('TEMPLATE', journalReactionLine({ category: 'BATTLE' }, '趙雲', 0).source);
        assert.equals('TEMPLATE', journalReactionLine({ category: 'GROWTH' }, '趙雲', 0, { type: 'Brave', cite: '河北押運', outcome: 'FAIL' }).source, '只有戰報與派遣個人化');
        assert.equals(JOURNAL_REACTION_FALLBACK, journalReactionLine({ category: 'BATTLE' }, '  ', 0, { type: 'Brave', cite: 'x', outcome: 'FAIL' }).text);
    });

    suite.test('季度性格事件：沒給權重行為不變；有經歷權重時近期連敗者更常被抽中', () => {
        const generals = [
            { id: 'a', name: 'A', age: 30, personality: { type: 'Brave' as const } },
            { id: 'b', name: 'B', age: 30, personality: { type: 'Brave' as const } },
        ];
        const seq = (values: number[]) => { let i = 0; return () => values[i++ % values.length]; };
        const plain = rollSeasonPersonalityEvents(generals, 1, seq([0.9, 0.2]));
        const same = rollSeasonPersonalityEvents(generals, 1, seq([0.9, 0.2]), { a: 1, b: 1 });
        assert.equals(JSON.stringify(plain), JSON.stringify(same));
        let aPicked = 0;
        let bPicked = 0;
        for (let i = 0; i < 200; i++) {
            const r = rollSeasonPersonalityEvents(generals, 1, seq([0.9, (i % 100) / 100]), { a: 2.5, b: 1 });
            if (r.pending[0].generalId === 'a') aPicked += 1; else bPicked += 1;
        }
        assert.isTrue(aPicked > bPicked * 1.8, `權重高者較常被抽：${aPicked}:${bPicked}`);
    });

    suite.test('GameSession：換季後出現請求、可答應、回寫事件並隨存檔來回', async () => {
        const session = new GameSession(1);
        const ids = Array.from({ length: 10 }, (_, i) => `brave${i}`);
        await session.addGenerals(ids.map((id) => member(id)));
        let sawRequest: MindRequest | undefined;
        for (let round = 0; round < 6 && !sawRequest; round++) {
            for (const id of ids) {
                session.mind.record({ generalId: id, season: session.mind.snapshot().lastSeasonSettled < 0 ? 0 : round + 1, kind: 'TASK_DONE', outcome: 'FAIL', tags: ['hebei'], label: '河北押運' });
            }
            await session.advanceSeason(0);
            sawRequest = session.mindMailbox().find((r) => r.status === 'PENDING');
        }
        assert.isTrue(!!sawRequest, '換季後信箱應出現武將請求');
        const req = sawRequest as MindRequest;
        assert.isTrue(session.mindUnreadCount() > 0);
        const perSeason = new Map<number, number>();
        for (const r of session.mindMailbox()) perSeason.set(r.season, (perSeason.get(r.season) ?? 0) + 1);
        for (const n of perSeason.values()) assert.isTrue(n <= MIND_CONFIG.request.maxPerSeasonTeam);
        const result = await session.resolveMindRequest(req.id, true);
        assert.isTrue(result.ok && result.reply.length > 0);
        assert.equals('GRANTED', session.mindMailbox().find((r) => r.id === req.id)?.status ?? 'ACKED');
        const op = session.mindOpinion(ids[0], { tags: ['hebei'], label: '河北押運', intelLevel: 0 });
        assert.isTrue(op.successDelta >= -0.05 && op.line.length > 0);
        const snap = session.createSnapshot(new Date(0));
        assert.isTrue((snap.generalMind?.requests.length ?? 0) > 0, '信箱隨存檔寫出');
    });

    suite.test('信箱畫面資料：按鈕依種類、已回應顯示反應句、徽章顯示待回應數', () => {
        const base = { generalId: 'zhang-fei', season: 3, expiresSeason: 5, major: false, text: '主公', reasonCodes: [] as string[], read: false };
        const rows = buildMindRequestRows([
            { ...base, id: 'a', kind: 'ASK_PROMOTE', status: 'PENDING', major: true },
            { ...base, id: 'b', kind: 'APOLOGIZE', status: 'PENDING' },
            { ...base, id: 'c', kind: 'DEFY_LETTER', status: 'PENDING' },
            { ...base, id: 'd', kind: 'ADVISE', status: 'GRANTED', reply: '謝主公', read: true },
        ], (id) => (id === 'zhang-fei' ? '張飛' : id));
        assert.equals('准/駁', rows[0].buttons.map((b) => b.label).join('/'));
        assert.equals('寬慰/責備', rows[1].buttons.map((b) => b.label).join('/'));
        assert.equals('知道了', rows[2].buttons.map((b) => b.label).join('/'));
        assert.equals(0, rows[3].buttons.length);
        assert.equals('謝主公', rows[3].reply);
        assert.isTrue(rows[0].unread && !rows[3].unread);
        assert.equals('張飛・求封', rows[0].kindLabel);
        assert.equals('信箱 2', mindBadgeText(2));
        assert.equals('信箱', mindBadgeText(0));
    });

    return suite;
}
