/**
 * QuestBase.test.ts — 任務最小版 QST-M（PROG-2-9209；任務 Base doc_spec_1185、總綱 doc_spec_1182 §12 第 4 列）
 *
 * 鎖住：設定正規化與正式 ACADEMY_36 定義、一個學府任務跑完 36 步、閘門（12／24／36）擋 advance 與 settle 與其他動作、
 * 暫離期間倒數不遞減、結算走 reward.claim 且重送不重複結算、占用走 occupancy.*（接取登記、結算／放棄／過期釋放、衝突整筆回滾）、
 * advance／accept 冪等、錯誤碼 E35x、權威欄位不可夾帶、GameSession 存檔往返與舊檔缺值。
 *
 * Unity 對照：像一組 PlayMode 契約測試，用假的獎勵與占用後端驗證任務狀態機。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { createLocalApi } from '../assets/scripts/core/api/localserver/createLocalApi';
import type { QuestAuthority } from '../assets/scripts/core/api/localserver/QuestCommands';
import type { WalletAuthority } from '../assets/scripts/core/api/localserver/WalletCommands';
import type { RewardAuthority } from '../assets/scripts/core/api/localserver/RewardCommands';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import type {
    OccupancyQueryResult, TaskAcceptResult, TaskAdvanceResult, TaskChangeResult, TaskQueryResult, TaskSettleResult, TaskTickResult,
} from '../assets/scripts/shared/api/ApiCommands';
import { isApiFail, type ApiResult } from '../assets/scripts/shared/api/ApiProtocol';
import { OccupancyService } from '../assets/scripts/shared/occupancy/OccupancyService';
import { ACADEMY_GATE_TURNS, ACADEMY_QUEST_DEF_ID, ACADEMY_TOTAL_TURNS, createAcademyQuestAdapter } from '../assets/scripts/shared/quest/AcademyQuest';
import { findQuestDef, normalizeQuestConfig, checkQuestRewards } from '../assets/scripts/shared/quest/QuestConfig';
import { emptyQuestState, isEmptyQuestState, normalizeQuestState, QuestService } from '../assets/scripts/shared/quest/QuestService';
import { QuestError, type QuestConfigV1, type QuestStateV1 } from '../assets/scripts/shared/quest/QuestTypes';
import { normalizeRewardConfig } from '../assets/scripts/shared/reward/RewardConfig';
import { emptyRewardMeta, type RewardMeta } from '../assets/scripts/shared/reward/RewardRules';

class FakeWallet implements WalletAuthority {
    public bag: Record<string, number> = { bronze: 0 };
    public balance(currency: string): number { return this.bag[currency] ?? 0; }
    public spend(currency: string, amount: number): boolean {
        if (this.balance(currency) < amount) return false;
        this.bag[currency] = this.balance(currency) - amount;
        return true;
    }
    public snapshot(): Record<string, number> { return { ...this.bag }; }
    public credit(currency: string, amount: number): void { this.bag[currency] = this.balance(currency) + amount; }
}

class MemoryReward implements RewardAuthority {
    public rewardMeta: RewardMeta = emptyRewardMeta();
    public meta(): RewardMeta { return this.rewardMeta; }
    public setMeta(meta: RewardMeta): void { this.rewardMeta = meta; }
}

class MemoryQuest implements QuestAuthority {
    public current: QuestStateV1 = emptyQuestState();
    public state(): QuestStateV1 { return this.current; }
    public setState(state: QuestStateV1): void { this.current = state; }
}

const ROOT = path.join(__dirname, '..');

/** 測試用定義：正式 ACADEMY_36 加上獎勵套件，再加兩張小的（有倒數、兩位執行者） */
function testQuestConfig(): QuestConfigV1 {
    const shipped = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/data/quest-config.json'), 'utf8')) as { defs: Array<Record<string, unknown>> };
    const academy = { ...shipped.defs[0], outcome: { success: { reward: 'BUNDLE_GRAD_OK' }, fail: { reward: 'BUNDLE_GRAD_FAIL' } } };
    return normalizeQuestConfig({
        defs: [
            academy,
            {
                id: 'ACADEMY_TIMED', taskKind: 'academy', steps: 4, occupancy: 'academy', countdownSeasons: 3,
                gates: [{ id: 'G2', at: 2, clearWhen: { kind: 'flag', key: 'exam.passed' } }],
                outcome: { success: { reward: 'BUNDLE_GRAD_OK' } },
            },
            {
                id: 'ACADEMY_PAIR', taskKind: 'academy', steps: 2, actors: { min: 2, max: 2 }, occupancy: 'academy', releaseOnPause: true,
                outcome: { success: { reward: null } },
            },
            { id: 'NEED_RANK', taskKind: 'academy', steps: 1, acceptWhen: { kind: 'rank', op: '>=', value: 3 }, occupancy: null },
        ],
    });
}

function rig(config: QuestConfigV1 = testQuestConfig(), grade?: (childId: string) => 'success' | 'fail') {
    const bundle = createLocalApi(new PlayerSaveService(new MemoryStorageAdapter()), { now: () => 1_000 });
    const wallet = new FakeWallet();
    const reward = new MemoryReward();
    const quest = new MemoryQuest();
    const occupancy = new OccupancyService();
    let now = 10;
    let exam = false;
    bundle.setWallet(wallet);
    bundle.setRewardAuthority(reward);
    bundle.setRewardConfig(normalizeRewardConfig({
        bundles: [
            { id: 'BUNDLE_GRAD_OK', effects: [{ kind: 'currency', id: 'bronze', amount: 50 }], sources: ['quest'] },
            { id: 'BUNDLE_GRAD_FAIL', kind: 'penalty', effects: [{ kind: 'currency', id: 'bronze', amount: -5 }], sources: ['quest'] },
        ],
    }));
    bundle.setOccupancyHost({ service: occupancy });
    bundle.setQuestConfig(config);
    bundle.setQuestAuthority(quest);
    bundle.registerQuestKind(createAcademyQuestAdapter(grade ? { grade } : {}));
    bundle.setQuestHooks({
        nowIndex: () => now,
        evaluate: (cond) => (cond as { kind?: string; key?: string }).kind === 'flag' ? exam : false,
    });
    return {
        api: bundle.api, bundle, wallet, reward, quest, occupancy,
        setNow(value: number): void { now = value; },
        passExam(): void { exam = true; },
    };
}

type Rig = ReturnType<typeof rig>;

function ok<T>(res: ApiResult<T>): T {
    if (isApiFail(res)) throw new Error(`${res.errorCode} ${res.message}`);
    return res.result;
}

function errorOf(res: ApiResult<unknown>): string {
    return isApiFail(res) ? res.errorCode : 'OK';
}

let keySeq = 0;
function idem(): { idemKey: string } {
    keySeq += 1;
    return { idemKey: `qst-test-${keySeq}` };
}

async function accept(r: Rig, defId: string, actors: string[], acceptKey: string): Promise<ApiResult<TaskAcceptResult>> {
    return r.api.cmd<TaskAcceptResult>('task.accept', { defId, actors, acceptKey }, idem());
}

async function advance(r: Rig, qid: string, fromStep: number, steps?: number): Promise<ApiResult<TaskAdvanceResult>> {
    return r.api.cmd<TaskAdvanceResult>('task.advance', { qid, fromStep, ...(steps !== undefined ? { steps } : {}) }, idem());
}

async function view(r: Rig, qid: string) {
    return ok(await r.api.query<TaskQueryResult>('task.query', { qid })).tasks[0];
}

async function occupiedIds(r: Rig): Promise<string[]> {
    return ok(await r.api.query<OccupancyQueryResult>('occupancy.query', {})).occupiedIds;
}

export function createQuestBaseSuite(): TestSuite {
    const suite = new TestSuite('QuestBase (任務最小版 QST-M，taskKind=academy PROG-2-9209)');

    suite.test('設定正規化：壞定義被丟、閘門超出步數被丟；正式 quest-config.json 的 ACADEMY_36 是 36 步、閘門 12／24／36', () => {
        assert.equals(0, normalizeQuestConfig(null).defs.length);
        const cfg = normalizeQuestConfig({
            defs: [{ id: '' }, { id: 'A', taskKind: 'academy' }, { id: 'B', taskKind: 'academy', steps: 3, gates: [{ id: 'g', at: 9 }, { id: 'h', at: 2 }] }],
        });
        assert.equals(1, cfg.defs.length);
        assert.equals(1, cfg.defs[0].gates.length, 'at 超過步數的閘門被丟');
        assert.equals('advance,settle', cfg.defs[0].gates[0].blocks.join(','), '閘門預設擋 advance 與 settle');
        const shipped = normalizeQuestConfig(JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/data/quest-config.json'), 'utf8')));
        const def = findQuestDef(shipped, ACADEMY_QUEST_DEF_ID);
        assert.isTrue(def !== undefined);
        assert.equals(ACADEMY_TOTAL_TURNS, def!.steps);
        assert.equals(ACADEMY_GATE_TURNS.join(','), def!.gates.map((g) => g.at).join(','));
        assert.equals('academy', def!.occupancy);
        assert.equals(0, checkQuestRewards(shipped, () => false).length, '正式定義暫無獎勵引用（A0 補），不會指向不存在的套件');
        assert.isTrue(checkQuestRewards(testQuestConfig(), () => false).length > 0, '套件不存在時交叉檢查會報錯');
        assert.equals(0, checkQuestRewards(testQuestConfig(), () => true).length, '套件存在就合格');
    });

    suite.test('一個學府任務跑完 36 步：12／24／36 閘門各停一次，清閘後才能繼續；結算發獎、釋放占用、紀錄齊全', async () => {
        const r = rig();
        const created = ok(await accept(r, ACADEMY_QUEST_DEF_ID, ['child1'], 'enroll-1'));
        assert.isTrue(created.created);
        const qid = created.task.qid;
        assert.equals('child1', (await occupiedIds(r)).join(','), '接取時占用執行者');
        const gateStops: number[] = [];
        for (let step = 0; step < ACADEMY_TOTAL_TURNS; step += 1) {
            const out = ok(await advance(r, qid, step));
            assert.isTrue(out.advanced);
            assert.equals(step + 1, out.task.step);
            if (out.gateReached) {
                gateStops.push(out.task.step);
                ok(await r.api.cmd<TaskChangeResult>('task.clearGate', { qid, gateId: out.gateReached }, idem()));
            }
        }
        assert.equals('12,24,36', gateStops.join(','));
        const done = await view(r, qid);
        assert.equals(36, done.step);
        assert.equals('ACTIVE', done.state);
        const settled = ok(await r.api.cmd<TaskSettleResult>('task.settle', { qid }, idem()));
        assert.equals('success', settled.tier);
        assert.equals('BUNDLE_GRAD_OK', settled.bundleId);
        assert.isTrue(settled.grantId !== null && settled.grantId !== '');
        assert.isFalse(settled.replayed);
        assert.equals(50, r.wallet.balance('bronze'), '獎勵走 reward.claim 入帳');
        assert.equals(0, (await occupiedIds(r)).length, '結算後釋放占用');
        const final = await view(r, qid);
        assert.equals('SETTLED', final.state);
        const kinds = final.log.map((e) => e.kind);
        assert.equals(36, kinds.filter((k) => k === 'advance').length);
        assert.equals(3, kinds.filter((k) => k === 'gate').length);
        assert.equals(3, kinds.filter((k) => k === 'clearGate').length);
        assert.equals('accept', kinds[0]);
        assert.equals('settle', kinds[kinds.length - 1]);
    });

    suite.test('閘門阻擋其他動作：停在第 12 步時 advance 與 settle 回 E353，query 列出 blockedActions，清閘後解除', async () => {
        const r = rig();
        const qid = ok(await accept(r, ACADEMY_QUEST_DEF_ID, ['c1'], 'k1')).task.qid;
        const stop = ok(await advance(r, qid, 0, 36));
        assert.equals(12, stop.task.step, '一次想走 36 步也只走到第一個閘門');
        assert.equals(12, stop.stepsDone);
        assert.equals('TERM_1', stop.gateReached);
        const blocked = await view(r, qid);
        assert.equals('TERM_1', blocked.pendingGate);
        assert.isTrue(blocked.blockedActions.indexOf('enroll') >= 0 && blocked.blockedActions.indexOf('mentorAssign') >= 0);
        assert.equals('E353', errorOf(await advance(r, qid, 12)));
        assert.equals('E353', errorOf(await r.api.cmd('task.settle', { qid }, idem())));
        const service = new QuestService(r.quest.state(), { config: testQuestConfig() });
        assert.isTrue(service.isActionBlocked(qid, 'enroll'));
        assert.isFalse(service.isActionBlocked(qid, 'somethingElse'));
        ok(await r.api.cmd('task.clearGate', { qid, gateId: 'TERM_1' }, idem()));
        const after = await view(r, qid);
        assert.equals(null, after.pendingGate);
        assert.equals(0, after.blockedActions.length);
        assert.isTrue(ok(await advance(r, qid, 12)).advanced);
    });

    suite.test('清閘條件由宿主評估：條件未達回 E357；還沒走到的閘門回 E354；已清除重送回 changed=false', async () => {
        const r = rig();
        const qid = ok(await accept(r, 'ACADEMY_TIMED', ['c1'], 'k1')).task.qid;
        assert.equals('E354', errorOf(await r.api.cmd('task.clearGate', { qid, gateId: 'G2' }, idem())), '還沒走到第 2 步');
        ok(await advance(r, qid, 0, 2));
        assert.equals('E357', errorOf(await r.api.cmd('task.clearGate', { qid, gateId: 'G2' }, idem())));
        r.passExam();
        assert.isTrue(ok(await r.api.cmd<TaskChangeResult>('task.clearGate', { qid, gateId: 'G2' }, idem())).changed);
        assert.isFalse(ok(await r.api.cmd<TaskChangeResult>('task.clearGate', { qid, gateId: 'G2' }, idem())).changed);
        assert.equals('E001', errorOf(await r.api.cmd('task.clearGate', { qid, gateId: 'NOPE' }, idem())), '沒有這個閘門＝格式錯誤');
    });

    suite.test('暫離期間不遞減：PAUSED 時 tick 不扣倒數、不能 advance；resume 後才繼續扣；倒數歸零過期並釋放占用', async () => {
        const r = rig();
        r.setNow(10);
        const qid = ok(await accept(r, 'ACADEMY_TIMED', ['c1'], 'k1')).task.qid;
        assert.equals(3, (await view(r, qid)).remainingSeasons);
        const t1 = ok(await r.api.cmd<TaskTickResult>('task.tick', { nowIndex: 11 }, idem()));
        assert.equals(1, t1.delta);
        assert.equals(2, (await view(r, qid)).remainingSeasons);
        assert.isTrue(ok(await r.api.cmd<TaskChangeResult>('task.pause', { qid, reason: 'sick' }, idem())).changed);
        ok(await r.api.cmd('task.tick', { nowIndex: 15 }, idem()));
        const paused = await view(r, qid);
        assert.equals('PAUSED', paused.state);
        assert.equals(2, paused.remainingSeasons, '暫離 4 季倒數沒動');
        assert.equals('E352', errorOf(await advance(r, qid, 0)), '暫離中不能推進');
        assert.equals('E352', errorOf(await r.api.cmd('task.settle', { qid }, idem())));
        assert.equals('c1', (await occupiedIds(r)).join(','), '暫離仍在學，占用保留');
        assert.isFalse(ok(await r.api.cmd<TaskChangeResult>('task.pause', { qid }, idem())).changed, '重複暫離冪等');
        assert.isTrue(ok(await r.api.cmd<TaskChangeResult>('task.resume', { qid }, idem())).changed);
        assert.isFalse(ok(await r.api.cmd<TaskChangeResult>('task.resume', { qid }, idem())).changed, '重複恢復冪等');
        assert.isTrue(ok(await advance(r, qid, 0)).advanced);
        ok(await r.api.cmd('task.tick', { nowIndex: 15 }, idem()));
        assert.equals(2, (await view(r, qid)).remainingSeasons, '高水位冪等：同季重送不再扣');
        const expired = ok(await r.api.cmd<TaskTickResult>('task.tick', { nowIndex: 17 }, idem()));
        assert.equals(qid, expired.expired.join(','));
        assert.equals('EXPIRED', (await view(r, qid)).state);
        assert.equals(0, (await occupiedIds(r)).length, '過期釋放占用');
    });

    suite.test('結算走 reward.claim 且重送不重複：換 idemKey 重送回 replayed=true，錢包只入帳一次；同 idemKey 重送回原結果', async () => {
        const r = rig();
        const qid = ok(await accept(r, ACADEMY_QUEST_DEF_ID, ['c1'], 'k1')).task.qid;
        for (let s = 0; s < 36; s += 1) {
            const out = ok(await advance(r, qid, s));
            if (out.gateReached) ok(await r.api.cmd('task.clearGate', { qid, gateId: out.gateReached }, idem()));
        }
        const key = idem();
        const first = ok(await r.api.cmd<TaskSettleResult>('task.settle', { qid }, key));
        const again = await r.api.cmd<TaskSettleResult>('task.settle', { qid }, key);
        assert.isTrue((again as { replayed?: boolean }).replayed === true, '同 idemKey 命令層直接回原結果（replayed）');
        assert.equals(first.grantId, ok(again).grantId);
        const resend = ok(await r.api.cmd<TaskSettleResult>('task.settle', { qid }, idem()));
        assert.isTrue(resend.replayed);
        assert.equals(first.grantId, resend.grantId, '回原結果，不是新的一筆');
        assert.equals(50, r.wallet.balance('bronze'), '只入帳一次');
        assert.equals(1, r.reward.rewardMeta.grants.length, '獎勵紀錄只有一筆');
        assert.equals(`quest:${qid}:settle`, r.reward.rewardMeta.grants[0].key);
        assert.equals('E352', errorOf(await r.api.cmd('task.abandon', { qid }, idem())), '已結算不能放棄');
    });

    suite.test('成敗等級由種類 adapter 決定：評等 fail 走懲罰套件（reward.claim 的 penalty），任務自己不加減資源', async () => {
        const r = rig(testQuestConfig(), () => 'fail');
        r.wallet.bag.bronze = 20;
        const qid = ok(await accept(r, ACADEMY_QUEST_DEF_ID, ['c1'], 'k1')).task.qid;
        for (let s = 0; s < 36; s += 1) {
            const out = ok(await advance(r, qid, s));
            if (out.gateReached) ok(await r.api.cmd('task.clearGate', { qid, gateId: out.gateReached }, idem()));
        }
        const settled = ok(await r.api.cmd<TaskSettleResult>('task.settle', { qid }, idem()));
        assert.equals('fail', settled.tier);
        assert.equals('BUNDLE_GRAD_FAIL', settled.bundleId);
        assert.equals(15, r.wallet.balance('bronze'));
    });

    suite.test('獎勵失敗整筆不生效：套件不存在回 E321，任務仍 ACTIVE、占用不釋放，補上套件後重試成功', async () => {
        const cfg = testQuestConfig();
        const r = rig(cfg);
        r.bundle.setRewardConfig(normalizeRewardConfig({ bundles: [] }));
        const qid = ok(await accept(r, 'ACADEMY_TIMED', ['c1'], 'k1')).task.qid;
        ok(await advance(r, qid, 0, 2));
        r.passExam();
        ok(await r.api.cmd('task.clearGate', { qid, gateId: 'G2' }, idem()));
        ok(await advance(r, qid, 2, 2));
        assert.equals('E321', errorOf(await r.api.cmd('task.settle', { qid }, idem())));
        const stuck = await view(r, qid);
        assert.equals('ACTIVE', stuck.state);
        assert.equals(null, stuck.result);
        assert.equals('c1', (await occupiedIds(r)).join(','));
        r.bundle.setRewardConfig(normalizeRewardConfig({ bundles: [{ id: 'BUNDLE_GRAD_OK', effects: [{ kind: 'currency', id: 'bronze', amount: 7 }] }] }));
        assert.equals('success', ok(await r.api.cmd<TaskSettleResult>('task.settle', { qid }, idem())).tier);
        assert.equals(7, r.wallet.balance('bronze'));
    });

    suite.test('advance 冪等：fromStep 已過回 advanced=false 不再推進；跳級回 E355；多帶 tier／progress 欄位被擋', async () => {
        const r = rig();
        const qid = ok(await accept(r, ACADEMY_QUEST_DEF_ID, ['c1'], 'k1')).task.qid;
        assert.isTrue(ok(await advance(r, qid, 0)).advanced);
        const resend = ok(await advance(r, qid, 0));
        assert.isFalse(resend.advanced);
        assert.equals(1, resend.task.step, '重送沒有多走一步');
        assert.equals('E355', errorOf(await advance(r, qid, 5)));
        assert.equals('E103', errorOf(await r.api.cmd('task.advance', { qid, fromStep: 1, tier: 'critical' }, idem())), '不得夾帶結果欄位');
        assert.equals('E103', errorOf(await r.api.cmd('task.accept', { defId: 'ACADEMY_36', actors: ['c1'], acceptKey: 'z', progress: 36 }, idem())));
        assert.equals('E103', errorOf(await r.api.cmd('task.settle', { qid, result: 'success' }, idem())), 'result 是共通權威欄位');
        assert.equals('E351', errorOf(await advance(r, 'q_999', 0)));
        assert.equals('E001', errorOf(await r.api.cmd('task.advance', { qid, fromStep: 'x' }, idem())));
        assert.equals('E354', errorOf(await r.api.cmd('task.settle', { qid }, idem())), '步數沒滿不能結算');
    });

    suite.test('accept 冪等與占用：同 acceptKey 回同一張不重複占用；同鍵不同內容 E359；執行者已忙碌 E330 且不留實例', async () => {
        const r = rig();
        const a = ok(await accept(r, ACADEMY_QUEST_DEF_ID, ['c1'], 'k1'));
        const b = ok(await accept(r, ACADEMY_QUEST_DEF_ID, ['c1'], 'k1'));
        assert.isTrue(a.created);
        assert.isFalse(b.created);
        assert.equals(a.task.qid, b.task.qid);
        assert.equals(1, ok(await r.api.query<TaskQueryResult>('task.query', {})).tasks.length);
        assert.equals(1, r.occupancy.recordsOfKind('academy').length);
        assert.equals('E359', errorOf(await accept(r, 'ACADEMY_TIMED', ['c1'], 'k1')));
        assert.equals('E330', errorOf(await accept(r, ACADEMY_QUEST_DEF_ID, ['c1'], 'k2')), 'c1 已在修業');
        assert.equals(1, ok(await r.api.query<TaskQueryResult>('task.query', {})).tasks.length, '衝突不留半張實例');
        assert.equals('E350', errorOf(await accept(r, 'NOPE', ['c9'], 'k3')));
        assert.equals('E356', errorOf(await accept(r, ACADEMY_QUEST_DEF_ID, ['a', 'b'], 'k4')), '人數不符');
        assert.equals('E356', errorOf(await accept(r, ACADEMY_QUEST_DEF_ID, [], 'k5')));
    });

    suite.test('雙執行者占用整筆回滾：第二位已忙碌時，第一位剛登記的占用被撤回、不留實例', async () => {
        const r = rig();
        r.occupancy.acquire({ personId: 'busy', kind: 'mentorAssign', refId: 'm1' });
        assert.equals('E330', errorOf(await accept(r, 'ACADEMY_PAIR', ['free', 'busy'], 'k1')));
        assert.equals('busy', (await occupiedIds(r)).join(','), 'free 沒有被留下占用');
        assert.equals(0, ok(await r.api.query<TaskQueryResult>('task.query', {})).tasks.length);
    });

    suite.test('放棄與暫離釋放：abandon 釋放占用且冪等；releaseOnPause 的定義暫離釋放、恢復重登記', async () => {
        const r = rig();
        const qid = ok(await accept(r, ACADEMY_QUEST_DEF_ID, ['c1'], 'k1')).task.qid;
        assert.isTrue(ok(await r.api.cmd<TaskChangeResult>('task.abandon', { qid }, idem())).changed);
        assert.isFalse(ok(await r.api.cmd<TaskChangeResult>('task.abandon', { qid }, idem())).changed);
        assert.equals(0, (await occupiedIds(r)).length);
        assert.equals('E352', errorOf(await advance(r, qid, 0)), '放棄後不能推進');
        const pair = ok(await accept(r, 'ACADEMY_PAIR', ['p1', 'p2'], 'k2')).task.qid;
        assert.equals(2, (await occupiedIds(r)).length);
        ok(await r.api.cmd('task.pause', { qid: pair }, idem()));
        assert.equals(0, (await occupiedIds(r)).length, 'releaseOnPause 暫離即釋放');
        ok(await r.api.cmd('task.resume', { qid: pair }, idem()));
        assert.equals(2, (await occupiedIds(r)).length, '恢復重新占用');
    });

    suite.test('接取條件由宿主評估：條件不成立回 E357，沒有評估器也視為不成立', async () => {
        const r = rig();
        assert.equals('E357', errorOf(await accept(r, 'NEED_RANK', ['c1'], 'k1')));
        const none = new QuestService(emptyQuestState(), { config: testQuestConfig() });
        try {
            none.accept({ defId: 'NEED_RANK', actors: ['c1'], acceptKey: 'k' });
            assert.isTrue(false, '應該丟錯');
        } catch (error) {
            assert.isTrue(error instanceof QuestError && error.code === 'CONDITION_UNMET');
        }
    });

    suite.test('命令層未就緒回 E358；task.query 唯讀不增加 saveRev', async () => {
        const bundle = createLocalApi(new PlayerSaveService(new MemoryStorageAdapter()), { now: () => 1 });
        const res = await bundle.api.query('task.query', {});
        assert.equals('E358', errorOf(res));
        const r = rig();
        const before = r.api.view.saveRev;
        ok(await r.api.query('task.query', {}));
        assert.equals(before, r.api.view.saveRev);
    });

    suite.test('存檔狀態正規化：壞資料丟棄、缺值補預設、舊存檔（無欄位）得到空狀態；終局實例超量只丟最舊', () => {
        assert.isTrue(isEmptyQuestState(normalizeQuestState(undefined)));
        assert.isTrue(isEmptyQuestState(normalizeQuestState('x')));
        const fixed = normalizeQuestState({
            seq: 'bad', instances: [
                { qid: 'q_1', defId: 'D', taskKind: 'academy', state: 'ACTIVE', total: 36, step: 99 },
                { qid: 'q_1', defId: 'D', taskKind: 'academy', state: 'ACTIVE' },
                { qid: 'q_2', defId: 'D', taskKind: 'academy', state: 'WAT' },
                null,
            ],
        });
        assert.equals(1, fixed.instances.length, '重複與非法狀態被丟');
        assert.equals(36, fixed.instances[0].step, 'step 夾在 0～total');
        assert.equals(1, fixed.seq, 'seq 壞值回退為實例數');
        const cfg = normalizeQuestConfig({ defs: [{ id: 'T', taskKind: 'academy', steps: 1, outcome: { success: { reward: null } } }] });
        let state = emptyQuestState();
        for (let i = 0; i < 50; i += 1) {
            const svc = new QuestService(state, { config: cfg });
            const qid = svc.accept({ defId: 'T', actors: [`a${i}`], acceptKey: `k${i}` }).instance.qid;
            svc.advance({ qid, fromStep: 0 });
            svc.finishSettle({ qid, tier: 'success', bundleId: null, grantId: null });
            state = svc.snapshot();
        }
        assert.equals(40, state.instances.length, '最多保留 40 張終局實例');
        assert.equals('q_50', state.instances[state.instances.length - 1].qid, '保留的是最新的');
    });

    suite.test('GameSession 整合：questState 隨存檔往返（步驟、閘門、暫離）；讀檔後同 acceptKey 與 fromStep 仍冪等；沒用過任務就不寫欄位', async () => {
        const adapter = new MemoryStorageAdapter();
        const store = new PlayerSaveService(adapter);
        const make = () => {
            const session = new GameSession();
            session.setRosterStore(new InMemoryRosterStore([]));
            session.setSaveService(store);
            const bundle = createLocalApi(store, { now: () => 1_000 });
            bundle.setQuestConfig(testQuestConfig());
            bundle.setQuestAuthority(session.questAuthority());
            bundle.setOccupancyHost(session.occupancyHost);
            bundle.setWallet(new FakeWallet());
            bundle.setRewardAuthority(session.rewardAuthority());
            return { session, api: bundle.api };
        };
        const a = make();
        await a.session.load();
        await a.session.save();
        const clean = await store.load();
        assert.isFalse(clean !== null && 'questState' in clean, '沒用過任務就不寫 questState，舊檔形狀不變');
        const created = ok(await a.api.cmd<TaskAcceptResult>('task.accept', { defId: ACADEMY_QUEST_DEF_ID, actors: ['kid'], acceptKey: 'enroll' }, idem()));
        ok(await a.api.cmd('task.advance', { qid: created.task.qid, fromStep: 0, steps: 36 }, idem()));
        ok(await a.api.cmd('task.pause', { qid: created.task.qid }, idem()));
        await a.session.save();
        const b = make();
        await b.session.load();
        const back = ok(await b.api.query<TaskQueryResult>('task.query', { qid: created.task.qid })).tasks[0];
        assert.equals(12, back.step);
        assert.equals('PAUSED', back.state);
        assert.equals('TERM_1', back.pendingGate);
        const replay = ok(await b.api.cmd<TaskAcceptResult>('task.accept', { defId: ACADEMY_QUEST_DEF_ID, actors: ['kid'], acceptKey: 'enroll' }, idem()));
        assert.isFalse(replay.created, '讀檔後同 acceptKey 仍回同一張');
        assert.equals(created.task.qid, replay.task.qid);
        ok(await b.api.cmd('task.resume', { qid: created.task.qid }, idem()));
        const stale = ok(await b.api.cmd<TaskAdvanceResult>('task.advance', { qid: created.task.qid, fromStep: 3 }, idem()));
        assert.isFalse(stale.advanced, '讀檔後舊的 fromStep 重送仍不推進');
    });

    return suite;
}
