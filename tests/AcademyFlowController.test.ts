/**
 * AcademyFlowController — 學府入學與 36 回合修業畫面（PROG-2-9189）
 *
 * 涵蓋：入學資格（最低 15 歲、設定檔可調）、入學令與落盤失敗還原、動作先 commit 再落盤、
 * 結算未確認離開後 recover 接續、離開再回來停在同一回合、打斷點呼叫點、版面 id 與語系鍵對照。
 *
 * Unity 對照：EditMode Test 驗證 Presenter 的狀態機與 ViewModel。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { AcademyFlowController, type AcademyChildLike, type AcademyFlowDeps } from '../assets/scripts/ui/core/AcademyFlowController';
import { ACADEMY_FLOW_FALLBACK_ZH_TW, ACADEMY_ORDER, enrollView, sessionView, type AcademyFlowViewState } from '../assets/scripts/ui/core/AcademyFlowView';
import { standaloneAcademyRig, type AcademyApiRig } from './AcademyApiRig';
import { type AcademyRecordPort, type PersistedAcademyRecord } from '../assets/scripts/core/services/GameAcademySaveStore';
import { academyEnrollRules, checkEnrollAge, configureAcademyEnrollRules, resetAcademyEnrollRules, shouldRecommendAncestor } from '../assets/scripts/core/systems/nurture/AcademyEnrollRules';
import { isAcademyRecordActive } from '../assets/scripts/core/services/GameAcademySaveStore';
import { GameClock } from '../assets/scripts/core/systems/GameClock';
import type { AcademyStateSnapshot } from '../assets/scripts/core/systems/nurture/AcademyTypes';

const ROOT = path.resolve(__dirname, '..');

class FakePort implements AcademyRecordPort {
    record: PersistedAcademyRecord | null = null;
    readonly gameTime = new GameClock().state;
    getAcademyRecord(): PersistedAcademyRecord | null { return this.record; }
    setAcademyRecord(record: PersistedAcademyRecord | null): void { this.record = record; }
}

interface FakeHost { node: { active: boolean }; last: AcademyFlowViewState | null }

function child(patch: Partial<AcademyChildLike> = {}): AcademyChildLike {
    return { id: 'c1', name: '少主', age: 16, fate: { choice: 'accept' }, str: 30, lea: 30, int: 30, pol: 30, cha: 30, ...patch };
}

interface Harness {
    ctrl: AcademyFlowController<FakeHost>;
    port: FakePort;
    enroll: FakeHost;
    session: FakeHost;
    toasts: string[];
    saves: { count: number; fail: boolean };
    rig: AcademyApiRig;
    tokens: { left: number };
    roster: AcademyChildLike[];
    calls: string[];
    clickers: Record<string, () => void>;
}

async function harness(opts: { roster?: AcademyChildLike[]; tokens?: number; openInterrupt?: boolean } = {}): Promise<Harness> {
    const port = new FakePort();
    const rig = standaloneAcademyRig(port);
    const enroll: FakeHost = { node: { active: true }, last: null };
    const session: FakeHost = { node: { active: true }, last: null };
    const toasts: string[] = [];
    // 落盤次數與失敗注入走 save.write 的 persist（rig.saves／rig.fail），保留原本的 h.saves.count／h.saves.fail 寫法
    const saves = {
        get count(): number { return rig.saves.count; },
        get fail(): boolean { return rig.fail.on; },
        set fail(value: boolean) { rig.fail.on = value; },
    };
    const tokens = { left: opts.tokens ?? 1 };
    const roster = opts.roster ?? [child()];
    const calls: string[] = [];
    const clickers: Record<string, () => void> = {};
    const deps: AcademyFlowDeps<FakeHost> = {
        mountEnrollHost: async (b) => { b.forEach((x) => { clickers[x.buttonId] = x.handler; }); return enroll; },
        mountSessionHost: async (b) => { b.forEach((x) => { clickers[x.buttonId] = x.handler; }); return session; },
        apply: (host, view) => { host.last = view; },
        bringToFront: (host) => { host.node.active = true; },
        lookup: () => (key: string) => key,
        toast: (m) => { toasts.push(m); },
        roster: () => roster,
        nurtureBlockReasons: () => [],
        loadMentorCards: async () => [],
        lockedMentorIds: () => [],
        tokensLeft: () => tokens.left,
        consumeToken: () => { if (tokens.left <= 0) return false; tokens.left -= 1; return true; },
        refundToken: () => { tokens.left += 1; },
        clanUuid: () => 'clan-test',
        clanPrestigeTier: () => 0,
        admissionTurn: () => 0,
        api: rig.api,
        isActive: () => isAcademyRecordActive(port.record),
        ...(opts.openInterrupt ? { openInterrupt: (s: Readonly<AcademyStateSnapshot>) => { calls.push(`interrupt:${s.pendingInterrupt}`); return true; } } : {}),
        onGraduated: (s) => { calls.push(`graduated:${s.childId}`); },
    };
    const ctrl = new AcademyFlowController<FakeHost>(deps);
    await ctrl.mount();
    return { ctrl, port, enroll, session, toasts, saves, rig, tokens, roster, calls, clickers };
}

/** 一路按「訓練 str → 確認」推進 n 回合 */
async function playTurns(h: Harness, n: number): Promise<void> {
    for (let i = 0; i < n; i++) {
        if (h.ctrl.mode === 'interrupt') await h.ctrl.resolveInterrupt();
        // 潁川有清談事件與清談大會時先處理
        const rec = h.port.record!.committed;
        const g = rec.gimmickStatePayload as { debatePending?: boolean; eventPending?: string | null; handCards?: unknown[] };
        if (g.eventPending) await h.ctrl.act({ actionType: 'GIMMICK_INTERACT', selectedOptionId: 'EVENT:A' });
        if (g.debatePending) {
            const hand = (g.handCards ?? []).length;
            const picks = Array.from({ length: Math.min(3, hand) }, (_, k) => k);
            await h.ctrl.act({ actionType: 'GIMMICK_INTERACT', selectedOptionId: hand === 0 ? 'SKIP' : `DEBATE:${picks.join(',')}` });
        }
        if (h.ctrl.mode === 'interrupt') await h.ctrl.resolveInterrupt();
        await h.ctrl.act({ actionType: 'TRAIN', targetStat: 'int' });
        await h.ctrl.confirm();
    }
}

function layoutIds(name: string): Set<string> {
    const json = JSON.parse(fs.readFileSync(path.join(ROOT, `assets/resources/ui-spec/layouts/${name}.json`), 'utf8')) as { root: unknown };
    const ids = new Set<string>();
    const walk = (n: { id?: string; children?: unknown[] }): void => {
        if (n.id) ids.add(n.id);
        for (const c of n.children ?? []) walk(c as { id?: string; children?: unknown[] });
    };
    walk(json.root as { id?: string; children?: unknown[] });
    return ids;
}

export function createAcademyFlowControllerSuite(): TestSuite {
    const suite = new TestSuite('AcademyFlowController (學府入學與修業 PROG-2-9189)');

    suite.test('入學規則：最低 15 歲來自設定；未滿回傳還差幾年；及冠才推薦先祖教官', () => {
        resetAcademyEnrollRules();
        assert.equals(15, academyEnrollRules().minEnrollAge);
        assert.equals(3, checkEnrollAge(12).yearsShort);
        assert.isTrue(checkEnrollAge(15).ok);
        assert.isTrue(checkEnrollAge(14.9).yearsShort === 1);
        assert.isFalse(shouldRecommendAncestor(14));
        assert.isTrue(shouldRecommendAncestor(15));
        configureAcademyEnrollRules({ minEnrollAge: 18 });
        assert.equals(2, checkEnrollAge(16).yearsShort);
        configureAcademyEnrollRules({ minEnrollAge: 'x' as unknown as number });
        assert.equals(15, academyEnrollRules().minEnrollAge, '壞值退回預設');
        resetAcademyEnrollRules();
    });

    suite.test('設定檔 academy-enroll-rules.json 與內建預設一致，且 ServiceLoader 有載入它', () => {
        const json = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/resources/data/academy-enroll-rules.json'), 'utf8')) as Record<string, number>;
        configureAcademyEnrollRules(json);
        assert.equals(json.minEnrollAge, academyEnrollRules().minEnrollAge);
        assert.equals(json.mentorSlotsBase, academyEnrollRules().mentorSlotsBase);
        resetAcademyEnrollRules();
        const loader = fs.readFileSync(path.join(ROOT, 'assets/scripts/core/managers/ServiceLoader.ts'), 'utf8');
        assert.isTrue(loader.indexOf('ACADEMY_ENROLL_RULES_JSON') >= 0 && loader.indexOf('configureAcademyEnrollRules') >= 0);
    });

    suite.test('未滿 15 歲：入學鈕不可按並顯示還差幾年；強行呼叫 enroll 也不成立，入學令不扣', async () => {
        resetAcademyEnrollRules();
        const h = await harness({ roster: [child({ age: 12 })] });
        await h.ctrl.openEnroll();
        assert.isFalse(h.enroll.last!.enabled.btnAcEnrollConfirm);
        assert.equals('15 歲及冠方可入學（還差 3 年）', h.enroll.last!.texts.acEnrollHint);
        assert.isFalse(await h.ctrl.enroll());
        assert.equals(1, h.tokens.left);
        assert.equals(null, h.port.record);
    });

    suite.test('滿 15 歲可入學：潁川、客卿任教、扣 1 張入學令、紀錄落盤、5 所學府只開潁川', async () => {
        resetAcademyEnrollRules();
        const h = await harness({ roster: [child({ age: 15 })] });
        await h.ctrl.openEnroll();
        assert.isTrue(h.enroll.last!.enabled.btnAcEnrollConfirm);
        assert.equals(ACADEMY_ORDER.filter((a) => a.open).length, 1);
        assert.isTrue(h.enroll.last!.texts.acAcademyLabel1.indexOf('即將開放') >= 0);
        assert.isTrue(await h.ctrl.enroll());
        assert.equals(0, h.tokens.left);
        const rec = h.port.record!;
        assert.equals('ACAD_YINGCHUAN', rec.committed.academyId);
        assert.equals(1, rec.committed.currentTurn);
        assert.isTrue(rec.acknowledged);
        assert.isTrue(h.saves.count >= 1);
        assert.isTrue(h.session.node.active && !h.enroll.node.active);
        assert.equals('第 1 / 36 回合', h.session.last!.texts.acSessTurn);
    });

    suite.test('沒有入學令不能入學；其他學府點了只提示即將開放', async () => {
        const h = await harness({ tokens: 0 });
        await h.ctrl.openEnroll();
        assert.isFalse(h.enroll.last!.enabled.btnAcEnrollConfirm);
        assert.isFalse(await h.ctrl.enroll());
        h.ctrl.pickAcademy(2);
        assert.isTrue(h.toasts[h.toasts.length - 1].indexOf('江東督府') >= 0);
        assert.equals(null, h.port.record);
    });

    suite.test('入學落盤失敗：紀錄還原成沒有、入學令退回、不進修業畫面', async () => {
        const h = await harness();
        await h.ctrl.openEnroll();
        h.saves.fail = true;
        assert.isFalse(await h.ctrl.enroll());
        assert.equals(null, h.port.record);
        assert.equals(1, h.tokens.left);
        assert.isFalse(h.session.node.active);
        assert.isTrue(h.enroll.last!.texts.acEnrollNotice.length > 0);
    });

    suite.test('動作先 commit 再落盤：訓練後進結算畫面，確認後回到可操作；落盤失敗則回到動作前', async () => {
        const h = await harness();
        await h.ctrl.openEnroll();
        await h.ctrl.enroll();
        const turn0 = h.port.record!.committed.currentTurn;
        h.saves.fail = true;
        assert.isFalse(await h.ctrl.act({ actionType: 'TRAIN', targetStat: 'int' }));
        assert.equals(turn0, h.port.record!.committed.currentTurn, '落盤失敗：回合不前進');
        assert.isTrue(h.port.record!.acknowledged);
        assert.equals('idle', h.ctrl.mode);
        h.saves.fail = false;
        assert.isTrue(await h.ctrl.act({ actionType: 'TRAIN', targetStat: 'int' }));
        assert.equals('settling', h.ctrl.mode);
        assert.isFalse(h.port.record!.acknowledged, '結算確認前紀錄是未確認');
        assert.equals(turn0 + 1, h.port.record!.committed.currentTurn);
        assert.isTrue(h.session.last!.actives.btnAcConfirm);
        assert.isFalse(h.session.last!.enabled.btnAcTrain_str === undefined);
        await h.ctrl.confirm();
        assert.equals('idle', h.ctrl.mode);
        assert.isTrue(h.port.record!.acknowledged);
    });

    suite.test('結算中暫離＝確認後離開；回來停在同一回合，不算異常中斷', async () => {
        const h = await harness();
        await h.ctrl.openEnroll();
        await h.ctrl.enroll();
        await h.ctrl.act({ actionType: 'REST' });
        const turn = h.port.record!.committed.currentTurn;
        await h.ctrl.leave();
        assert.isFalse(h.session.node.active);
        assert.isTrue(h.port.record!.acknowledged);
        await h.ctrl.openFromMenu();
        assert.isTrue(h.session.node.active);
        assert.equals(turn, h.port.record!.committed.currentTurn);
        assert.equals(0, h.port.record!.committed.sessionCrashCounter);
        assert.equals('idle', h.ctrl.mode);
    });

    suite.test('異常中斷（結算沒確認就關閉）：重開接續同一回合、直接顯示上次結果並累計中斷次數', async () => {
        const h = await harness();
        await h.ctrl.openEnroll();
        await h.ctrl.enroll();
        await h.ctrl.act({ actionType: 'TRAIN', targetStat: 'str' });
        const turn = h.port.record!.committed.currentTurn;
        // 模擬重新載入：換一個新控制器，紀錄還在 port 裡且是未確認
        const h2 = await harness();
        h2.port.record = JSON.parse(JSON.stringify(h.port.record)) as PersistedAcademyRecord;
        await h2.ctrl.openFromMenu();
        assert.equals(turn, h2.port.record!.committed.currentTurn);
        assert.equals(1, h2.port.record!.committed.sessionCrashCounter);
        assert.equals('settling', h2.ctrl.mode);
        assert.isTrue(h2.session.last!.texts.acSessLog.indexOf('settle.recovered') >= 0 || h2.session.last!.texts.acSessLog.indexOf('尚未確認') >= 0);
    });

    suite.test('修業無法放棄：沒有放棄入口；進行中再次入學被擋', async () => {
        const h = await harness({ tokens: 2 });
        await h.ctrl.openEnroll();
        await h.ctrl.enroll();
        assert.isTrue(h.clickers.btnAcLeave !== undefined);
        assert.isTrue(Object.keys(h.clickers).every((id) => id.toLowerCase().indexOf('abandon') < 0 && id.toLowerCase().indexOf('giveup') < 0));
        assert.isFalse(await h.ctrl.enroll());
        assert.equals(1, h.tokens.left, '第二次入學不扣令');
    });

    suite.test('打得完 36 回合：第 12／24 回合打斷由預留呼叫點接手；結業時呼叫 onGraduated', async () => {
        const h = await harness({ openInterrupt: true });
        await h.ctrl.openEnroll();
        await h.ctrl.enroll();
        await playTurns(h, 11);
        // 第 12 回合開始前：期中考評打斷
        assert.equals(12, h.port.record!.committed.currentTurn);
        assert.equals('interrupt', h.ctrl.mode);
        assert.isTrue(h.calls.indexOf('interrupt:MIDTERM') >= 0, '預留給 9190 的呼叫點');
        for (let guard = 0; guard < 80 && h.ctrl.mode !== 'graduated'; guard++) await playTurns(h, 1);
        assert.isTrue(h.calls.indexOf('interrupt:COMING_OF_AGE') >= 0, '第 24 回合弱冠禮');
        assert.isTrue(h.calls.indexOf('interrupt:GRADUATION') >= 0, '第 36 回合結業確認');
        assert.isTrue(h.port.record!.committed.graduated);
        assert.equals('graduated', h.ctrl.mode);
        assert.isTrue(h.calls.indexOf('graduated:c1') >= 0, '預留給 9191 的呼叫點');
        assert.isFalse(isAcademyRecordActive(h.port.record), '結業後不再凍結外界時間');
    });

    suite.test('沒有彈窗接手時打斷點顯示占位並可用預設選項繼續', async () => {
        const h = await harness();
        await h.ctrl.openEnroll();
        await h.ctrl.enroll();
        await playTurns(h, 11);
        assert.equals('interrupt', h.ctrl.mode);
        assert.isTrue(h.session.last!.actives.acInterruptBox);
        assert.isFalse(h.session.last!.actives.acTrainBox);
        h.clickers.btnAcInterrupt();
        await new Promise((r) => setTimeout(r, 0));
        assert.equals('idle', h.ctrl.mode);
    });

    suite.test('版面 id 對照：入學與修業兩個 view 的每個 key 都在對應 layout 的節點 id 裡', async () => {
        const enrollIds = layoutIds('academy-enroll-main');
        const sessionIds = layoutIds('academy-session-main');
        const h = await harness();
        await h.ctrl.openEnroll();
        const missing: string[] = [];
        const check = (view: AcademyFlowViewState, ids: Set<string>, tag: string): void => {
            for (const group of [view.texts, view.actives, view.enabled, view.fills ?? {}]) {
                for (const key of Object.keys(group)) if (!ids.has(key)) missing.push(`${tag}:${key}`);
            }
        };
        check(h.enroll.last!, enrollIds, 'enroll');
        await h.ctrl.enroll();
        check(h.session.last!, sessionIds, 'session');
        // 每個綁定的按鈕 id 也必須存在
        for (const id of Object.keys(h.clickers)) if (!enrollIds.has(id) && !sessionIds.has(id)) missing.push(`button:${id}`);
        assert.equals('', missing.join(','));
        // 無子嗣時的空畫面也只用合法 id
        const empty = enrollView({ childCount: 0, child: null, childIndex: 0, yearsShort: 0, ancestorRecommended: false, mentorSlots: 3, mentors: [], guestTeaching: false, controlMode: 'MANUAL' as never, tokens: 0, notice: '', canEnroll: false });
        check(empty, enrollIds, 'empty');
        assert.isTrue(empty.actives.acEnrollEmpty);
    });

    suite.test('語系：fallback 表的每個 ui.academy.flow.* 鍵四語系 JSON 都有；佔位符個數一致', () => {
        const langs = ['zh-TW', 'zh-CN', 'en', 'ja'];
        const bundles = langs.map((l) => JSON.parse(fs.readFileSync(path.join(ROOT, `assets/resources/i18n/${l}.json`), 'utf8')) as Record<string, string>);
        const problems: string[] = [];
        for (const key of Object.keys(ACADEMY_FLOW_FALLBACK_ZH_TW)) {
            if (key.indexOf('ui.academy.flow.') !== 0) continue;
            const holders = (s: string): number => (s.match(/\{\d+\}/g) ?? []).length;
            bundles.forEach((b, i) => {
                if (typeof b[key] !== 'string') problems.push(`${langs[i]}缺${key}`);
                else if (holders(b[key]) !== holders(ACADEMY_FLOW_FALLBACK_ZH_TW[key])) problems.push(`${langs[i]}佔位符不同${key}`);
            });
            assert.equals(ACADEMY_FLOW_FALLBACK_ZH_TW[key], bundles[0][key], `zh-TW 與 fallback 一致：${key}`);
        }
        assert.equals('', problems.join(';'));
    });

    suite.test('修業畫面：潁川清談手牌與事件選項顯示；blocked 時訓練與休息不可按', async () => {
        const h = await harness();
        await h.ctrl.openEnroll();
        await h.ctrl.enroll();
        const snap = JSON.parse(JSON.stringify(h.port.record!.committed)) as AcademyStateSnapshot;
        const g = snap.gimmickStatePayload as unknown as { eventPending: string | null; handCards: unknown[] };
        g.eventPending = 'EVT_SHUIJING_QUESTION';
        const view = sessionView({ snapshot: snap, childName: '少主', mode: 'idle', settle: null, notice: '', pickedCards: [] });
        assert.isTrue(view.actives.btnAcEventA && view.actives.btnAcEventB);
        assert.isFalse(view.enabled.btnAcRest);
        assert.isFalse(view.enabled.btnAcTrain_int);
        assert.isTrue(view.texts.acEventALabel.indexOf('兵爭') >= 0);
    });

    return suite;
}
