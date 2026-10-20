/**
 * NurtureFlow.test.ts — 開獎 / 培育畫面流程 headless 測試（PROG-2-0034）
 *
 * 不開 Cocos、不建節點：直接驗證 NurtureFlowController 吐出的 FlowView，
 * 並比對 view 的 key 都對得到 nurture-flow-main.json 的節點 id。
 *
 * Unity 對照：EditMode Test 測 Presenter，不實例化 Scene。
 */
import { TestSuite, assert } from './TestRunner';
import { FlowView, NurtureFlowController } from '../assets/scripts/ui/core/NurtureFlowController';
import { InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { NurtureService } from '../assets/scripts/core/services/NurtureService';
import { UnveilingService } from '../assets/scripts/core/services/UnveilingService';
import { NURTURE_TOTAL_ROUNDS } from '../assets/scripts/core/systems/NurtureSystem';
import { GameTimeMode } from '../assets/scripts/core/systems/GameClock';
import { chooseFate, unveilGeneral, UnveilingGeneral } from '../assets/scripts/core/systems/Unveiling';
import type { MentorCard } from '../assets/scripts/core/models/MentorCard';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs') as typeof import('fs');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const path = require('path') as typeof import('path');

const ROOT = path.resolve(__dirname, '..');

function readJson<T>(rel: string): T {
    return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8')) as T;
}

function seeded(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function child(id: string, extra: Partial<UnveilingGeneral> = {}): UnveilingGeneral {
    return {
        id, name: id, faction: 'shu', gender: '男', age: 5, status: 'Mystery', hp: 800,
        str: 60, int: 50, lea: 55, pol: 40, cha: 45, luk: 30,
        hiddenFlags: ['mystery-phase'], genes: [], ...extra,
    } as UnveilingGeneral;
}

/** 已開獎、尚未選宿命 */
function unveiled(id: string): UnveilingGeneral {
    return unveilGeneral(child(id)).general;
}

function card(id: string): MentorCard {
    return {
        uid: `mentor-${id}`, sourceGeneralId: id, name: id, faction: 'shu',
        retiredAge: 66, retiredSeason: 4, retiredYear: 2, ep_snapshot: 80, gene_refs: [],
        parentUids: ['f', 'm'],
        generalSnapshot: { id, name: id, faction: 'shu', hp: 1000, str: 90, int: 40, lea: 70, pol: 30, cha: 50, careerClass: 'Warrior' } as unknown as GeneralConfig,
    };
}

interface Rig {
    roster: InMemoryRosterStore;
    flow: NurtureFlowController;
    nurture: NurtureService;
    saves: { count: number };
}

function makeRig(
    generals: GeneralConfig[],
    options: { mode?: GameTimeMode; cards?: MentorCard[]; failSave?: boolean } = {},
): Rig {
    const roster = new InMemoryRosterStore(generals);
    const mode = options.mode;
    const nurture = new NurtureService(roster, {
        random: seeded(7),
        currentSeason: () => 3,
        currentMode: mode === undefined ? undefined : () => mode,
        requireNurtureMode: mode !== undefined,
    });
    const saves = { count: 0 };
    const flow = new NurtureFlowController({
        roster,
        unveiling: new UnveilingService(roster, seeded(3)),
        nurture,
        loadMentorCards: async () => options.cards ?? [],
        persist: async () => {
            saves.count += 1;
            if (options.failSave) throw new Error('disk full');
        },
    });
    return { roster, flow, nurture, saves };
}

function collectLayoutIds(node: { id?: string; children?: unknown[] }, out: Set<string>): void {
    if (node.id) out.add(node.id);
    for (const c of node.children ?? []) collectLayoutIds(c as { id?: string; children?: unknown[] }, out);
}

export function createNurtureFlowSuite(): TestSuite {
    const suite = new TestSuite('NurtureFlow (開獎 / 培育畫面流程)');

    suite.test('流程控制器不 import cc（可 headless 測）', () => {
        const text = fs.readFileSync(path.join(ROOT, 'assets/scripts/ui/core/NurtureFlowController.ts'), 'utf8');
        assert.isFalse(/from\s+['"]cc['"]/.test(text));
    });

    suite.test('自動培育按鈕（NUR-14）：沒有子嗣時不可按；未提供 autoNurture 依賴時也不可按', () => {
        const rig = makeRig([]);
        assert.isFalse(rig.flow.getView().enabled.btnAutoNurture);
    });

    suite.test('自動培育被擋下時，提示文字對應 NO_TICKET 原因，且不改其他狀態', async () => {
        const roster = new InMemoryRosterStore([unveiled('auto-ui')]);
        const flow = new NurtureFlowController({
            roster,
            unveiling: new UnveilingService(roster, seeded(3)),
            nurture: new NurtureService(roster, { random: seeded(7), currentSeason: () => 3 }),
            loadMentorCards: async () => [],
            persist: async () => undefined,
            autoNurture: async () => ({ ok: false, blocked: 'NO_TICKET' }),
        });
        await flow.autoNurture();
        assert.isTrue(flow.getView().texts.flowNotice!.includes('沒有自動培育券'));
    });

    suite.test('沒有開獎子嗣：empty 畫面只顯示提示，按鈕全部不可按', () => {
        const { flow } = makeRig([child('mystery-kid', { age: 3 })]);
        const view = flow.getView();
        assert.equals('empty', view.mode);
        assert.isTrue(view.actives.flowEmptyHint);
        assert.isFalse(view.actives.fatePanel);
        assert.isFalse(view.actives.nurturePanel);
        assert.isFalse(view.enabled.btnFateAccept);
        assert.equals('0 / 0', view.texts.flowPager);
    });

    suite.test('開獎結果：顯示六維、天命建議與順應 / 抗命按鈕', () => {
        const { flow } = makeRig([unveiled('alpha')]);
        const view = flow.getView();
        assert.equals('fate', view.mode);
        assert.isTrue(view.actives.fatePanel);
        // PROG-2-0527：開獎標題改用規格 UI_UNVEIL_5（未注入語系表時用 zh-TW 預設）
        assert.equals('天命開獎！alpha 五維資質揭曉：', view.texts.fateName);
        assert.isTrue(view.texts.fateStats.includes('武力 60'));
        assert.isTrue(view.texts.fateStats.includes('運氣 30'));
        // str+lea = 115 > int+pol = 90 → 武官
        assert.equals('天命分流：武官', view.texts.fateRecommend);
        assert.equals('順應天命（成長率正常）', view.texts.fateAcceptLabel);
        assert.equals('逆天而行（成長率 -20%，有機率大器晚成）', view.texts.fateDefyLabel);
        assert.isTrue(view.texts.fateDefyHint.includes('0.8'));
        assert.isTrue(view.enabled.btnFateAccept);
        assert.isTrue(view.enabled.btnFateDefy);
    });

    suite.test('順應：寫回名冊、存檔一次，畫面進入入學', async () => {
        const { flow, roster, saves } = makeRig([unveiled('alpha')]);
        await flow.chooseFate('accept');
        const saved = roster.getAll()[0] as UnveilingGeneral;
        assert.equals('accept', saved.fate!.choice!);
        assert.equals('Warrior', saved.careerClass!);
        assert.equals(1, saves.count);
        const view = flow.getView();
        assert.equals('start', view.mode);
        assert.isTrue(view.texts.flowNotice.includes('順應天命'));
    });

    suite.test('抗命：職能反轉、成長率 0.8，並顯示在培育畫面', async () => {
        const { flow, roster } = makeRig([unveiled('alpha')]);
        await flow.chooseFate('defy');
        const saved = roster.getAll()[0] as UnveilingGeneral;
        assert.equals('Scholar', saved.careerClass!);
        assert.equals('成長率 ×0.8', flow.getView().texts.nurtureGrowth);
        assert.isTrue(flow.getView().texts.flowNotice.includes('逆天'));
    });

    suite.test('待選宿命的子嗣排在最前面，上一位 / 下一位會循環切換', () => {
        const ready = chooseFate(unveilGeneral(child('ready')).general, 'accept');
        const { flow } = makeRig([ready, unveiled('pending')]);
        assert.equals('pending', flow.candidates()[0].id, '待選宿命優先');
        assert.equals('pending', flow.getView().childId!);
        assert.equals('1 / 2', flow.getView().texts.flowPager);
        flow.selectNext(1);
        assert.equals('ready', flow.getView().childId!);
        assert.equals('2 / 2', flow.getView().texts.flowPager);
        flow.selectNext(1);
        assert.equals('pending', flow.getView().childId!, '循環回第一位');
        flow.selectNext(-1);
        assert.equals('ready', flow.getView().childId!, '往回循環');
    });

    suite.test('非培育季：入學按鈕不可按並說明原因', async () => {
        const { flow } = makeRig([unveiled('alpha')], { mode: GameTimeMode.Governance });
        await flow.chooseFate('accept');
        const view = flow.getView();
        assert.equals('start', view.mode);
        assert.isFalse(view.enabled.btnStartNurture);
        assert.isTrue(view.texts.startHint.includes('不是培育季'));
    });

    suite.test('完整流程：入學帶教官 → 36 回合 → 畢業結算 → 關閉回到空畫面', async () => {
        const { flow, roster, nurture, saves } = makeRig([unveiled('alpha')], {
            mode: GameTimeMode.Nurture,
            cards: [card('guan'), card('zhang')],
        });
        await flow.chooseFate('accept');

        const start = flow.getView();
        assert.equals('start', start.mode);
        assert.isTrue(start.enabled.btnStartNurture);
        assert.isTrue(start.texts.startHint.includes('入學令'));

        await flow.startNurture();
        assert.isTrue(nurture.getSession('alpha') !== null);
        let view = flow.getView();
        assert.equals('train', view.mode);
        assert.isTrue(view.actives.trainBlock);
        assert.equals('回合 0 / 36', view.texts.nurtureRound);
        assert.equals('啟蒙期 · 回合 1-12', view.texts.nurturePhase);
        assert.isTrue(view.texts.nurtureMentors.includes('guan'));
        assert.isTrue(view.texts.nurtureMentors.includes('zhang'));
        assert.isTrue(view.enabled.btnTrain_str && view.enabled.btnRest);

        // 每位教官都站在某一格：五格的教官欄加起來提到兩位教官
        const mentorCells = ['str', 'int', 'lea', 'pol', 'cha'].map((k) => view.texts[`slotMentors_${k}`]).join('|');
        assert.isTrue(mentorCells.includes('guan') && mentorCells.includes('zhang'));

        const kinds = ['str', 'int', 'lea', 'pol', 'cha'] as const;
        for (let round = 1; round <= NURTURE_TOTAL_ROUNDS; round++) {
            view = flow.getView();
            assert.equals('train', view.mode, `第 ${round} 回合前應可訓練`);
            // 精力低時休息，否則輪流練五維
            const lowVigor = nurture.getSession('alpha')!.vigor < 40;
            await flow.train(lowVigor ? 'rest' : kinds[round % kinds.length]);
        }

        view = flow.getView();
        assert.equals('graduate', view.mode);
        assert.isTrue(view.actives.graduateBlock);
        assert.isTrue(view.enabled.btnGraduate);
        assert.isFalse(view.enabled.btnRest, '36 回合後不能再訓練');
        assert.equals('培育完成', view.texts.nurturePhase);

        const result = await flow.graduate();
        view = flow.getView();
        assert.equals('report', view.mode);
        assert.isTrue(view.actives.reportBlock);
        assert.equals(`評級 ${result.rating}`, view.texts.reportRating);
        assert.isTrue(view.texts.reportTags.startsWith('畢業標籤：'));
        assert.equals(result.rating, (roster.getAll()[0] as { graduationRating?: string }).graduationRating!);
        assert.isTrue(nurture.getSession('alpha') === null, '畢業後教官解鎖、會話移除');

        flow.dismissReport();
        assert.equals('empty', flow.getView().mode);
        // 起始選宿命 1 + 入學 1 + 36 回合 + 畢業 1
        assert.equals(1 + 1 + NURTURE_TOTAL_ROUNDS + 1, saves.count);
    });

    suite.test('中止培育：回到入學畫面，入學令不退', async () => {
        const { flow, nurture } = makeRig([unveiled('alpha')], { cards: [card('guan')] });
        await flow.chooseFate('accept');
        const before = nurture.admissionsLeft();
        await flow.startNurture();
        assert.equals(before - 1, nurture.admissionsLeft());
        await flow.abandon();
        assert.equals('start', flow.getView().mode);
        assert.equals(before - 1, nurture.admissionsLeft());
        assert.equals(0, nurture.lockedMentorIds().length);
    });

    suite.test('存檔失敗不會讓遊戲動作回滾，只在提示後面註記', async () => {
        const { flow, roster } = makeRig([unveiled('alpha')], { failSave: true });
        await flow.chooseFate('accept');
        assert.equals('accept', (roster.getAll()[0] as UnveilingGeneral).fate!.choice!);
        assert.isTrue(flow.getView().texts.flowNotice.includes('存檔失敗'));
    });

    suite.test('沒選子嗣就按動作會丟錯（畫面層會 toast）', async () => {
        const { flow } = makeRig([]);
        let thrown = false;
        try {
            await flow.chooseFate('accept');
        } catch {
            thrown = true;
        }
        assert.isTrue(thrown);
    });

    suite.test('view 的所有 key 都對得到 nurture-flow-main.json 的節點 id；screen / skin 串得起來', async () => {
        const layout = readJson<{ root: { id?: string; children?: unknown[] } }>('assets/resources/ui-spec/layouts/nurture-flow-main.json');
        const ids = new Set<string>();
        collectLayoutIds(layout.root, ids);

        const views: FlowView[] = [];
        views.push(makeRig([]).flow.getView());

        const fateRig = makeRig([unveiled('a')], { mode: GameTimeMode.Governance });
        views.push(fateRig.flow.getView());
        await fateRig.flow.chooseFate('accept');
        views.push(fateRig.flow.getView());

        const full = makeRig([unveiled('b')], { mode: GameTimeMode.Nurture, cards: [card('guan')] });
        await full.flow.chooseFate('defy');
        await full.flow.startNurture();
        views.push(full.flow.getView());
        for (let i = 0; i < NURTURE_TOTAL_ROUNDS; i++) await full.flow.train('rest');
        views.push(full.flow.getView());
        await full.flow.graduate();
        views.push(full.flow.getView());

        const missing = new Set<string>();
        for (const view of views) {
            for (const key of [...Object.keys(view.texts), ...Object.keys(view.actives), ...Object.keys(view.enabled)]) {
                if (!ids.has(key)) missing.add(key);
            }
        }
        assert.equals('', [...missing].join(','), `view 有 key 在版面找不到節點 id：${[...missing].join(', ')}`);

        const screen = readJson<{ layout: string; skin: string }>('assets/resources/ui-spec/screens/nurture-flow-screen.json');
        assert.equals('nurture-flow-main', screen.layout);
        assert.isTrue(fs.existsSync(path.join(ROOT, `assets/resources/ui-spec/skins/${screen.skin}.json`)));
    });

    suite.test('每個 skinSlot / styleSlot 都在 nurture-flow-default.json 有定義', () => {
        const layout = readJson<{ root: unknown }>('assets/resources/ui-spec/layouts/nurture-flow-main.json');
        const skin = readJson<{ slots: Record<string, unknown> }>('assets/resources/ui-spec/skins/nurture-flow-default.json');
        const used = new Set<string>();
        const walk = (node: { skinSlot?: string; styleSlot?: string; children?: unknown[] }): void => {
            if (node.skinSlot) used.add(node.skinSlot);
            if (node.styleSlot) used.add(node.styleSlot);
            for (const c of node.children ?? []) walk(c as never);
        };
        walk(layout.root as never);
        const undefinedSlots = [...used].filter((slot) => !(slot in skin.slots));
        assert.equals('', undefinedSlots.join(','));
    });

    suite.test('大廳季度 HUD 有「開獎・培育」入口按鈕，且 LobbyScene 綁了它', () => {
        const hud = readJson<{ root: { id?: string; children?: unknown[] } }>('assets/resources/ui-spec/layouts/lobby-season-hud-main.json');
        const ids = new Set<string>();
        collectLayoutIds(hud.root, ids);
        assert.isTrue(ids.has('btnOpenNurture'));
        const lobby = fs.readFileSync(path.join(ROOT, 'assets/scripts/ui/scenes/LobbyScene.ts'), 'utf8');
        assert.isTrue(lobby.includes("buttonId: 'btnOpenNurture'"));
        assert.isTrue(lobby.includes("'nurture-flow-screen'"));
        assert.isTrue(lobby.includes('GAME_SESSION_EVENTS.GeneralUnveiled'));
    });

    /** 把培育跑到 completed（畢業前），回傳已就緒的 flow */
    async function runToCompleted(rig: Rig, childId: string): Promise<void> {
        await rig.flow.chooseFate('accept');
        await rig.flow.startNurture();
        const kinds = ['str', 'int', 'lea', 'pol', 'cha'] as const;
        for (let round = 1; round <= NURTURE_TOTAL_ROUNDS; round++) {
            const lowVigor = rig.nurture.getSession(childId)!.vigor < 40;
            await rig.flow.train(lowVigor ? 'rest' : kinds[round % kinds.length]);
        }
    }

    suite.test('保留成績單：不寫名冊、畫面顯示份數、最多 3 份', async () => {
        const rig = makeRig([unveiled('alpha')], { mode: GameTimeMode.Nurture, cards: [card('guan')] });
        await runToCompleted(rig, 'alpha');
        assert.equals(0, rig.nurture.reportCardCount('alpha'));

        await rig.flow.keepReport();
        assert.equals(1, rig.nurture.reportCardCount('alpha'));
        assert.isTrue((rig.roster.getAll()[0] as { graduationRating?: string }).graduationRating === undefined, '保留不寫名冊');
        assert.isTrue(rig.nurture.getSession('alpha')!.status === 'completed', '保留後會話仍是完成狀態');

        let view = rig.flow.getView();
        assert.equals('graduate', view.mode);
        assert.isTrue(view.enabled.btnKeepReport);
        assert.isTrue(view.enabled.btnRetake);
        assert.isTrue(view.enabled.btnCommitReport);
        assert.equals('保留成績單 1 / 3', view.texts.reportBookLabel);

        for (let i = 0; i < 3; i++) await rig.flow.keepReport();
        assert.equals(3, rig.nurture.reportCardCount('alpha'), '超過 3 份時丟最舊的，只留 3 份');
        view = rig.flow.getView();
        assert.equals('保留成績單 3 / 3', view.texts.reportBookLabel);
    });

    suite.test('沒有保留成績單：重修與定型按鈕不可按，直接呼叫會丟錯', async () => {
        const rig = makeRig([unveiled('alpha')], { mode: GameTimeMode.Nurture, cards: [card('guan')] });
        await runToCompleted(rig, 'alpha');
        const view = rig.flow.getView();
        assert.equals('graduate', view.mode);
        assert.isFalse(view.enabled.btnRetake);
        assert.isFalse(view.enabled.btnCommitReport);

        let threwRetake = false;
        try { await rig.flow.retake(); } catch { threwRetake = true; }
        assert.isTrue(threwRetake, '沒有成績單時不能重修');

        let threwCommit = false;
        try { await rig.flow.commitReport(); } catch { threwCommit = true; }
        assert.isTrue(threwCommit, '沒有成績單時不能定型');
    });

    suite.test('保留並重修：重新開場，已保留的成績單留著', async () => {
        const rig = makeRig([unveiled('alpha')], { mode: GameTimeMode.Nurture, cards: [card('guan')] });
        await runToCompleted(rig, 'alpha');
        await rig.flow.keepReport();

        await rig.flow.retake();
        assert.equals('active', rig.nurture.getSession('alpha')!.status);
        assert.equals(1, rig.nurture.reportCardCount('alpha'));
        const view = rig.flow.getView();
        assert.equals('train', view.mode);
        assert.equals('回合 0 / 36', view.texts.nurtureRound);
    });

    suite.test('定型：取最新一份寫入名冊，其餘成績單與會話一併銷毀', async () => {
        const rig = makeRig([unveiled('alpha')], { mode: GameTimeMode.Nurture, cards: [card('guan')] });
        await runToCompleted(rig, 'alpha');
        await rig.flow.keepReport();
        await rig.flow.keepReport();
        const before = rig.saves.count;

        await rig.flow.commitReport();
        const view = rig.flow.getView();
        assert.equals('report', view.mode);
        assert.isTrue(view.texts.reportRating.startsWith('評級 '));
        assert.equals(0, rig.nurture.reportCardCount('alpha'));
        assert.isTrue(rig.nurture.getSession('alpha') === null, '定型後會話移除');
        assert.isTrue((rig.roster.getAll()[0] as { graduationRating?: string }).graduationRating !== undefined, '定型後寫入名冊');
        assert.isTrue(rig.saves.count > before, '定型後存檔');
    });

    return suite;
}
