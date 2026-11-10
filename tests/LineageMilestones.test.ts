// @spec-source → 子嗣五歲抓周揭曉與及冠入學直通學府代際傳承規格書.md (doc_spec_1172) §二、§三、§四；PROG-2-2204（LOOP-04）
/**
 * LineageMilestones.test.ts — 代際傳承：抓周加成、及冠偵測、隊列、存讀檔、先祖教官置頂、客卿備援、彈窗。
 *
 * Unity 對照：EditMode Test，驗資料鏈與 session 結算，不開 Scene。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { NurtureService } from '../assets/scripts/core/services/NurtureService';
import { UnveilingService } from '../assets/scripts/core/services/UnveilingService';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import type { MentorCard } from '../assets/scripts/core/models/MentorCard';
import { preferredMentorDeck } from '../assets/scripts/core/systems/MentorDeck';
import { unveilGeneral, type UnveilingGeneral } from '../assets/scripts/core/systems/Unveiling';
import {
    ancestorIdsOf,
    ancestorMentorsFirst,
    applyGraspChoice,
    comingOfAgeCrossings,
    enqueueLineageMilestones,
    guestScholarMentorCard,
    normalizeLineageQueue,
    type LineageGeneral,
} from '../assets/scripts/core/systems/LineageMilestones';
import { ANCESTOR_MENTOR_MARK, NurtureFlowController } from '../assets/scripts/ui/core/NurtureFlowController';
import { LineageMilestonePopupController, lineageMilestoneView } from '../assets/scripts/ui/core/LineageMilestonePopupController';

function general(id: string, extra: Record<string, unknown> = {}): GeneralConfig {
    return { id, name: id, faction: 'shu', gender: '男', age: 30, hp: 1000, maxLifespan: 70, str: 50, int: 50, lea: 50, pol: 50, cha: 50, luk: 10, ...extra } as unknown as GeneralConfig;
}

function child(id: string, age: number, extra: Record<string, unknown> = {}): GeneralConfig {
    return general(id, { age, status: 'Mystery', hiddenFlags: ['mystery-phase'], genes: [], fatherId: 'guan-yu', motherId: 'hu-shi', str: 60, lea: 40, int: 50, pol: 30, cha: 45, luk: 20, ...extra });
}

function setup(roster: GeneralConfig[], adapter = new MemoryStorageAdapter()): GameSession {
    const session = new GameSession();
    session.setRosterStore(new InMemoryRosterStore(roster));
    session.setSaveService(new PlayerSaveService(adapter));
    session.setAutoSave(false);
    session.setGovernanceEventRandom(() => 0.99);
    session.setSeasonEventRandom(() => 0.99);
    session.setChronicleRandom(() => 0.99);
    return session;
}

function mentorCard(sourceGeneralId: string, extra: Partial<MentorCard> = {}): MentorCard {
    return {
        uid: `mentor-${sourceGeneralId}`, sourceGeneralId, name: sourceGeneralId, faction: 'shu', retiredAge: 65, retiredSeason: 10, retiredYear: 200,
        ep_snapshot: 100, gene_refs: [], parentUids: ['', ''], source: 'Retire',
        generalSnapshot: general(sourceGeneralId, { age: 65, str: 95, careerClass: 'Warrior' }),
        ...extra,
    };
}

function layoutIds(): Set<string> {
    const file = path.join(__dirname, '..', 'assets', 'resources', 'ui-spec', 'layouts', 'lineage-milestone-main.json');
    const ids = new Set<string>();
    const walk = (node: { id?: string; children?: unknown[] }): void => {
        if (node.id) ids.add(node.id);
        for (const c of node.children ?? []) walk(c as { id?: string; children?: unknown[] });
    };
    walk(JSON.parse(fs.readFileSync(file, 'utf8')).root);
    return ids;
}

export function createLineageMilestonesSuite(): TestSuite {
    const suite = new TestSuite('LineageMilestones');

    suite.test('抓周加成：兩項屬性 ×1.1（頂層、stats、dualLayerStats），上限 100；只能抓一次', () => {
        const kid = { id: 'k', str: 60, lea: 95, int: 50, stats: { str: 60 }, dualLayerStats: { str: { base: 60, current: 62, revelationLevel: 'EXACT' } } } as unknown as LineageGeneral;
        const after = applyGraspChoice(kid, 'WOODEN_SWORD') as unknown as Record<string, number> & LineageGeneral;
        assert.equals(66, after.str);
        assert.equals(100, after.lea, '上限 100');
        assert.equals(50, after.int, '其他屬性不變');
        assert.equals(66, after.stats?.str);
        assert.equals(66, after.dualLayerStats?.str?.base);
        assert.equals(68, after.dualLayerStats?.str?.current);
        assert.equals('EXACT', after.dualLayerStats?.str?.revelationLevel as unknown as string);
        assert.equals('尚武雄豪', after.aspiration);
        assert.equals('Brave', after.personality?.type);
        assert.equals(null, applyGraspChoice(after, 'BAMBOO_SLIP'), '已抓過');
    });

    suite.test('TC-LINEAGE-01：4.75 歲子嗣換季到 5 歲開獎並排入抓周；選木劍後武力統率 +10%、志向尚武', async () => {
        const session = setup([general('guan-yu', { age: 40 }), child('guan-xing', 4.75)]);
        assert.equals(null, session.pendingLineageMilestone);
        await session.advanceSeason();
        const pending = session.pendingLineageMilestone;
        assert.equals('grasp', pending?.kind);
        assert.equals('guan-xing', pending?.generalId);
        const before = session.roster.find((g) => g.id === 'guan-xing') as unknown as Record<string, number>;
        const result = await session.chooseGrasp('WOODEN_SWORD');
        assert.isTrue(result.ok);
        const after = session.roster.find((g) => g.id === 'guan-xing') as unknown as Record<string, unknown>;
        assert.equals(Math.round(before.str * 1.1), after.str);
        assert.equals(Math.round(before.lea * 1.1), after.lea);
        assert.equals(before.int, after.int);
        assert.equals('尚武雄豪', after.aspiration);
        assert.equals('Unveiled', after.status, '五維已揭曉');
        assert.equals(null, session.pendingLineageMilestone);
        assert.isFalse((await session.chooseGrasp('BAMBOO_SLIP')).ok, '不可再抓');
    });

    suite.test('多子嗣同季：逐一排隊不遺漏；陣亡者自動略過；存讀檔保留隊列', async () => {
        const adapter = new MemoryStorageAdapter();
        const session = setup([general('guan-yu', { age: 40 }), child('a', 4.75), child('b', 4.75)], adapter);
        await session.advanceSeason();
        assert.equals('a', session.pendingLineageMilestone?.generalId);
        await session.save();
        const reloaded = setup([], adapter);
        await reloaded.load();
        assert.equals('a', reloaded.pendingLineageMilestone?.generalId);
        assert.isTrue((await reloaded.chooseGrasp('JADE_PENDANT')).ok);
        assert.equals('b', reloaded.pendingLineageMilestone?.generalId);
        const queue = enqueueLineageMilestones([{ kind: 'grasp', generalId: 'x', season: 1 }], [{ kind: 'grasp', generalId: 'x', season: 2 }, { kind: 'coming-of-age', generalId: 'x', season: 2 }]);
        assert.equals(2, queue.length, '同一位同一種只留一筆');
        assert.equals(1, normalizeLineageQueue([{ kind: 'nope', generalId: 'x' }, { kind: 'grasp', generalId: 'y' }, null]).length);
    });

    suite.test('及冠：已開獎子嗣跨過 15 歲排入通知；未開獎或已成年不算；稍後就移出隊列', async () => {
        const grown = unveilGeneral(child('guan-xing', 14.75) as unknown as UnveilingGeneral).general;
        const crossings = comingOfAgeCrossings(
            [{ id: 'a', age: 14.75, fate: {} }, { id: 'b', age: 14.75 }, { id: 'c', age: 15, fate: {} }],
            [{ id: 'a', age: 15, fate: {} }, { id: 'b', age: 15 }, { id: 'c', age: 15.25, fate: {} }],
        );
        assert.equals('a', crossings.join());
        const session = setup([general('guan-yu', { age: 64 }), grown as unknown as GeneralConfig]);
        await session.advanceSeason();
        const pending = session.pendingLineageMilestone;
        assert.equals('coming-of-age', pending?.kind);
        const view = lineageMilestoneView(pending!);
        assert.isTrue(view.texts.milestoneTitle.includes('及冠入學'));
        assert.isTrue(view.actives.btnSendAcademy);
        assert.isFalse(view.actives.btnGraspSword);
        assert.equals('guan-xing', await session.dismissComingOfAge());
        assert.equals(null, session.pendingLineageMilestone);
    });

    suite.test('先祖判定：父母、祖父母（含教官卡快照）都算；先祖排前面、編成優先放先祖', () => {
        const roster: LineageGeneral[] = [{ id: 'kid', fatherId: 'guan-xing' }, { id: 'guan-xing', fatherId: 'guan-yu' }];
        const cards = [mentorCard('zhang-fei', { ep_snapshot: 999 }), mentorCard('guan-yu'), mentorCard('nobody', { ep_snapshot: 500 })];
        const ancestors = ancestorIdsOf(roster[0], roster, cards);
        assert.isTrue(ancestors.has('guan-xing') && ancestors.has('guan-yu'));
        assert.isFalse(ancestors.has('zhang-fei'));
        assert.equals('mentor-guan-yu', ancestorMentorsFirst(cards, ancestors)[0].uid);
        const deck = preferredMentorDeck(cards, new Set(['mentor-guan-yu']));
        assert.equals('mentor-guan-yu', deck[0]);
        assert.equals('mentor-zhang-fei', deck[1], '其餘依強度');
    });

    suite.test('TC-LINEAGE-02：及冠送入學府，導師首位推薦關羽並標記先祖傳承；入學後會話帶著關羽', async () => {
        const kid = unveilGeneral(child('guan-xing', 15) as unknown as UnveilingGeneral).general;
        const roster = new InMemoryRosterStore([kid as unknown as GeneralConfig]);
        const unveiling = new UnveilingService(roster, () => 0.5);
        unveiling.choose('guan-xing', 'accept');
        const nurture = new NurtureService(roster, { random: () => 0.5, currentSeason: () => 3 });
        const cards = [mentorCard('zhang-fei', { ep_snapshot: 999 }), mentorCard('guan-yu')];
        const flow = new NurtureFlowController({ roster, unveiling, nurture, loadMentorCards: async () => cards, persist: async () => undefined });
        const names = await flow.recommendAncestorDeck('guan-xing');
        assert.equals('guan-yu', names.join());
        assert.equals('mentor-guan-yu', flow.deck[0]);
        const texts = flow.getView().texts;
        assert.isTrue((texts.deckSlotLabel0 ?? '').startsWith(ANCESTOR_MENTOR_MARK), '先祖標記');
        assert.isTrue(texts.flowNotice?.includes('先祖傳承') === true);
        await flow.startNurture();
        const session = nurture.getSession('guan-xing');
        assert.isTrue(!!session, '入學成功');
        assert.equals('mentor-guan-yu', session!.mentors[0].id);
        assert.equals('guan-yu', session!.mentors[0].lineage?.generalId, '先祖血脈資料帶進會話');
    });

    suite.test('缺導師保護：家中沒有教官時由客卿名儒（水鏡先生）任教，入學不卡死', async () => {
        const kid = unveilGeneral(child('kid', 15) as unknown as UnveilingGeneral).general;
        const roster = new InMemoryRosterStore([kid as unknown as GeneralConfig]);
        const unveiling = new UnveilingService(roster, () => 0.5);
        unveiling.choose('kid', 'accept');
        const nurture = new NurtureService(roster, { random: () => 0.5, currentSeason: () => 3 });
        const flow = new NurtureFlowController({ roster, unveiling, nurture, loadMentorCards: async () => [], persist: async () => undefined });
        flow.select('kid');
        await flow.loadDeck();
        assert.isTrue(flow.deck.every((uid) => uid === null), '一般入口不給客卿（維持 PROG-2-1134 至少 1 位教官）');
        await flow.recommendAncestorDeck('kid');
        assert.equals(guestScholarMentorCard('kid').uid, flow.deck[0]);
        assert.isTrue(flow.getView().texts.flowNotice?.includes('水鏡先生') === true);
        await flow.startNurture();
        assert.isTrue(!!nurture.getSession('kid'));
    });

    suite.test('彈窗：版面節點齊全；抓周後換下一位，及冠送入學府會打開學府並帶子嗣 id，隊列空了關窗', async () => {
        const ids = layoutIds();
        for (const id of ['milestoneTitle', 'milestoneDesc', 'milestoneNote', 'btnGraspSword', 'btnGraspBamboo', 'btnGraspJade', 'graspSwordLabel', 'graspBambooLabel', 'graspJadeLabel', 'btnSendAcademy', 'sendAcademyLabel', 'btnMilestoneLater', 'milestoneLaterLabel']) {
            assert.isTrue(ids.has(id), `版面缺 ${id}`);
        }
        const queue = [
            { kind: 'grasp' as const, generalId: 'a', season: 1, generalName: '甲' },
            { kind: 'coming-of-age' as const, generalId: 'b', season: 1, generalName: '乙' },
        ];
        const host = { node: { active: false }, binder: null };
        const opened: string[] = [];
        const popup = new LineageMilestonePopupController({
            mountHost: async () => host as never,
            apply: () => undefined,
            next: () => queue[0] ?? null,
            chooseGrasp: async () => { queue.shift(); return { ok: true, line: 'ok' }; },
            dismissComingOfAge: async () => queue.shift()?.generalId ?? null,
            openAcademy: (id) => { opened.push(id); },
            toast: () => undefined,
        });
        await popup.mount();
        assert.isTrue(popup.tryOpen());
        await popup.grasp('WOODEN_SWORD');
        assert.isTrue(host.node.active, '換上及冠通知');
        await popup.comingOfAge(true);
        assert.equals('b', opened.join());
        assert.isFalse(host.node.active);
    });

    return suite;
}
