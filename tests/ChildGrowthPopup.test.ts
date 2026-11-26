/**
 * ChildGrowthPopup.test.ts — 子嗣成長事件彈窗與親子談話（PROG-2-10070）
 * 鎖住：話題表驗證與輪替、帳本舊存檔相容與跨年歸零、family.talkToChild（一年一次、好感由資料決定、錯誤碼、禁帶欄位）、
 * childInteractionCountThisYear、存檔讀回、彈窗控制器（觸發、守衛、選項入帳、銀兩不足、稍後再說）、
 * 祠堂親子談話區塊、畫面規格節點與四語系 key。
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { assert, TestSuite } from './TestRunner';
import type { GeneralConfig } from '../assets/scripts/core/models/GeneralUnit';
import {
    addChildInteraction,
    childInteractionCountOf,
    childTalkCountOf,
    childTalkedThisYear,
    emptyChildLedger,
    isEmptyChildLedger,
    normalizeChildLedger,
    recordChildTalk,
} from '../assets/scripts/core/systems/BloodlineChildLedger';
import { CHILD_TALK_FAVOR_DELTA_MAX, CHILD_TALK_FAVOR_DELTA_MIN, childTalkTopicFor, loadChildTalkConfig, validateChildTalkConfig } from '../assets/scripts/core/systems/ChildTalk';
import { DEFAULT_STARTER_SEEDLING_CONFIG } from '../assets/scripts/core/services/StarterSeedlingService';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import { createLocalApi } from '../assets/scripts/core/api/localserver/createLocalApi';
import type { FamilyChildLedgerResult, FamilyGrowthEventView, FamilyTalkToChildResult } from '../assets/scripts/shared/api/ApiCommands';
import { isApiFail } from '../assets/scripts/shared/api/ApiProtocol';
import { ChildGrowthPopupController, childGrowthPopupView, type ChildGrowthPopupView, type ChildGrowthResolveOutcome } from '../assets/scripts/ui/core/ChildGrowthPopupController';
import { childTalkView } from '../assets/scripts/ui/core/ChildTalkView';
import { ClanShrineController } from '../assets/scripts/ui/core/ClanShrineController';
import type { ClanShrineView } from '../assets/scripts/ui/core/ClanShrineView';
import type { MentorHoldingsButtonBinding } from '../assets/scripts/ui/core/MentorHoldingsController';

const ROOT = join(__dirname, '..');
const readJson = (rel: string): any => JSON.parse(readFileSync(join(ROOT, rel), 'utf8'));
const generals = readJson('assets/resources/data/generals.json') as GeneralConfig[];
const SEEDLING_ID = DEFAULT_STARTER_SEEDLING_CONFIG.childId;
const zhTw = readJson('assets/resources/i18n/zh-TW.json') as Record<string, string>;
const t = (key: string, ...args: string[]): string => (zhTw[key] ?? key).replace(/\{(\d+)\}/g, (_m, i) => args[Number(i)] ?? '');

async function sessionAfterSeasons(seasons: number): Promise<{ session: GameSession; save: PlayerSaveService }> {
    const save = new PlayerSaveService(new MemoryStorageAdapter());
    const session = new GameSession(5);
    session.setRosterStore(new InMemoryRosterStore());
    session.setSaveService(save);
    session.setAutoSave(false);
    session.setRandomSource(() => 0.99);
    session.setGeneralTemplates(generals);
    session.configureFamily(readJson('assets/resources/data/family-config.json'));
    await session.startNewGameWithStarters(5, generals, {});
    for (let i = 0; i < seasons; i++) await session.advanceSeason();
    return { session, save };
}

function collectIds(node: any, out: Set<string>): void {
    if (node?.id) out.add(node.id);
    for (const child of node?.children ?? []) collectIds(child, out);
}

const EVENT: FamilyGrowthEventView = {
    childId: 'kid-a', eventId: 'child_y3_stove_sugar', year: 3,
    titleKey: 'bloodline.event.y3.title', descKey: 'bloodline.event.y3.desc',
    options: [{ id: 'A', labelKey: 'bloodline.event.y3.optA' }, { id: 'B', labelKey: 'bloodline.event.y3.optB' }],
};
const EVENT_2: FamilyGrowthEventView = { ...EVENT, childId: 'kid-b', eventId: 'child_y4_academy_nap', titleKey: 'bloodline.event.y4.title', descKey: 'bloodline.event.y4.desc', options: [{ id: 'A', labelKey: 'bloodline.event.y4.optA' }, { id: 'B', labelKey: 'bloodline.event.y4.optB' }] };

function popupSetup(queue: FamilyGrowthEventView[], opts: { canOpen?: () => boolean; outcome?: () => ChildGrowthResolveOutcome } = {}) {
    let bindings: MentorHoldingsButtonBinding[] = [];
    const host = { node: { active: true }, binder: null };
    const applied: ChildGrowthPopupView[] = [];
    const toasts: string[] = [];
    const resolved: Array<[string, string, string]> = [];
    const ctrl = new ChildGrowthPopupController({
        mountHost: async (b) => { bindings = b; return host; },
        apply: (_h, v) => { applied.push(v); },
        pending: async () => queue.slice(),
        childInfo: (id) => (id === 'kid-a' ? { name: '小曹', age: 9 } : id === 'kid-b' ? { name: '小劉', age: 10 } : null),
        resolve: async (childId, eventId, optionId) => {
            resolved.push([childId, eventId, optionId]);
            const out = opts.outcome ? opts.outcome() : { ok: true as const, resultKey: 'bloodline.event.y3.resB' };
            if (out.ok) queue.splice(queue.findIndex((e) => e.childId === childId && e.eventId === eventId), 1);
            return out;
        },
        t,
        toast: (m) => { toasts.push(m); },
        ...(opts.canOpen ? { canOpen: opts.canOpen } : {}),
    });
    return { ctrl, host, applied, toasts, resolved, queue, click: (id: string) => bindings.find((b) => b.buttonId === id)?.handler() };
}

export function createChildGrowthPopupSuite(): TestSuite {
    const suite = new TestSuite('ChildGrowthPopup (成長事件彈窗與親子談話 PROG-2-10070)');

    suite.test('話題表：資料合格、好感增量 1～3、依累計次數輪替；壞資料會被驗出', () => {
        const cfg = loadChildTalkConfig();
        assert.equals(3, cfg.topics.length);
        for (const topic of cfg.topics) {
            assert.isTrue(topic.favorDelta >= CHILD_TALK_FAVOR_DELTA_MIN && topic.favorDelta <= CHILD_TALK_FAVOR_DELTA_MAX);
            assert.isTrue(typeof zhTw[topic.lineKey] === 'string', `缺 i18n ${topic.lineKey}`);
        }
        assert.equals(cfg.topics[0].id, childTalkTopicFor(cfg, 0).id);
        assert.equals(cfg.topics[2].id, childTalkTopicFor(cfg, 2).id);
        assert.equals(cfg.topics[0].id, childTalkTopicFor(cfg, 3).id, '用完回頭');
        assert.equals(cfg.topics[0].id, childTalkTopicFor(cfg, -5).id);
        assert.isTrue(validateChildTalkConfig({ schemaVersion: 1, topics: [{ id: 'x', lineKey: 'k', favorDelta: 9 }] }).length > 0);
        assert.isTrue(validateChildTalkConfig({ schemaVersion: 1, topics: [] }).length > 0);
    });

    suite.test('帳本：舊存檔缺談話欄位視為從沒談過；談話記年份與次數；互動數跨年歸零', () => {
        const old = normalizeChildLedger({ v: 1, favor: { a: 40 }, epithetFragments: 1, classmateFriends: {} });
        assert.isFalse(childTalkedThisYear(old, 'a', 3));
        assert.equals(0, childInteractionCountOf(old, 3));
        assert.isFalse(isEmptyChildLedger(old));
        const talked = recordChildTalk(emptyChildLedger(), 'a', 3);
        assert.isTrue(childTalkedThisYear(talked, 'a', 3));
        assert.isFalse(childTalkedThisYear(talked, 'a', 4));
        assert.equals(1, childTalkCountOf(talked, 'a'));
        assert.equals(1, childInteractionCountOf(talked, 3));
        assert.equals(0, childInteractionCountOf(talked, 4), '跨年自動歸零');
        assert.equals(1, childInteractionCountOf(addChildInteraction(talked, 4), 4), '新一年從 1 起算');
        const round = normalizeChildLedger(JSON.parse(JSON.stringify(talked)));
        assert.isTrue(childTalkedThisYear(round, 'a', 3));
        const bad = normalizeChildLedger({ talkYear: { a: 'x', b: 2.9 }, talkCount: { a: -1 }, interaction: { year: 'z', count: 5 } });
        assert.equals(2, bad.talkYear.b);
        assert.equals(0, childInteractionCountOf(bad, 2));
        assert.isFalse(isEmptyChildLedger(talked));
    });

    suite.test('talkToChild：每名孩子每年一次；好感依話題 +1、+2；隔年再談；互動數與成長事件選擇一起算', async () => {
        const { session } = await sessionAfterSeasons(8);
        const year = session.gameTime.currentYear;
        const base = session.childFavor(SEEDLING_ID);
        assert.equals(0, session.childInteractionCountThisYear);
        const first = session.talkToChild(SEEDLING_ID);
        assert.isTrue(first.ok);
        if (!first.ok) return;
        assert.equals(1, first.result.favorDelta);
        assert.equals(base + 1, session.childFavor(SEEDLING_ID));
        assert.equals(1, session.childInteractionCountThisYear);
        const again = session.talkToChild(SEEDLING_ID);
        assert.isTrue(!again.ok && again.reason === 'already-talked');
        assert.equals(base + 1, session.childFavor(SEEDLING_ID), '被擋不入帳');
        const stranger = session.talkToChild('no-such-child');
        assert.isTrue(!stranger.ok && stranger.reason === 'unknown-child');
        assert.isTrue(session.resolveBloodlineEvent(SEEDLING_ID, 'child_y3_stove_sugar', 'B').ok);
        assert.equals(2, session.childInteractionCountThisYear, '成長事件選擇也算親子互動');
        for (let i = 0; i < 4; i++) await session.advanceSeason();
        assert.equals(year + 1, session.gameTime.currentYear);
        assert.equals(0, session.childInteractionCountThisYear, '換年歸零');
        const second = session.talkToChild(SEEDLING_ID);
        assert.isTrue(second.ok);
        if (second.ok) assert.equals(2, second.result.favorDelta, '第二次換第二句話題');
    });

    suite.test('命令：family.talkToChild 一年一次、錯誤碼、禁帶欄位；family.childLedger 帶孩子清單與今年談過名單', async () => {
        const { session } = await sessionAfterSeasons(8);
        const bundle = createLocalApi(new PlayerSaveService(new MemoryStorageAdapter()), { now: () => 1_000 });
        const unbound = await bundle.api.cmd('family.talkToChild', { childId: SEEDLING_ID }, { idemKey: 't:0' });
        assert.isTrue(isApiFail(unbound) && unbound.errorCode === 'E360');
        bundle.setChildGrowthHost(session.childGrowthHost);
        let seq = 1;
        const talk = (args: Record<string, unknown>) => bundle.api.cmd<FamilyTalkToChildResult>('family.talkToChild', args, { idemKey: `t:${seq++}` });
        const extra = await talk({ childId: SEEDLING_ID, favor: 99 });
        assert.isTrue(isApiFail(extra) && extra.errorCode === 'E103');
        const blank = await talk({});
        assert.isTrue(isApiFail(blank) && blank.errorCode === 'E001');
        const unknown = await talk({ childId: 'ghost' });
        assert.isTrue(isApiFail(unknown) && unknown.errorCode === 'E372');

        const before = await bundle.api.query<FamilyChildLedgerResult>('family.childLedger', {});
        assert.isTrue(!isApiFail(before));
        const seed = (before as { result: FamilyChildLedgerResult }).result.children.find((c) => c.id === SEEDLING_ID);
        assert.isTrue(!!seed && seed.age === 9, '幼苗在孩子清單裡，整歲');
        assert.equals(0, (before as { result: FamilyChildLedgerResult }).result.talkedThisYear.length);

        const ok = await talk({ childId: SEEDLING_ID });
        assert.isTrue(!isApiFail(ok));
        const result = (ok as { result: FamilyTalkToChildResult }).result;
        assert.equals('child.talk.line1', result.lineKey);
        assert.equals(1, result.interactionCountThisYear);
        const dup = await talk({ childId: SEEDLING_ID });
        assert.isTrue(isApiFail(dup) && dup.errorCode === 'E373');
        const after = await bundle.api.query<FamilyChildLedgerResult>('family.childLedger', {});
        const view = (after as { result: FamilyChildLedgerResult }).result;
        assert.isTrue(view.talkedThisYear.includes(SEEDLING_ID));
        assert.equals(1, view.interactionCountThisYear);
    });

    suite.test('存檔讀回：談話紀錄與本年互動數都在；舊存檔（帳本沒有談話欄位）可讀、可談', async () => {
        const { session, save } = await sessionAfterSeasons(8);
        assert.isTrue(session.talkToChild(SEEDLING_ID).ok);
        await session.save();
        const loaded = new GameSession(9);
        loaded.setRosterStore(new InMemoryRosterStore());
        loaded.setSaveService(save);
        assert.isTrue(await loaded.load());
        assert.equals(1, loaded.childInteractionCountThisYear);
        const dup = loaded.talkToChild(SEEDLING_ID);
        assert.isTrue(!dup.ok && dup.reason === 'already-talked');

        const snapshot = JSON.parse(JSON.stringify(await save.load())) as { bloodlineChildLedger?: Record<string, unknown> };
        assert.isTrue(!!snapshot.bloodlineChildLedger);
        delete snapshot.bloodlineChildLedger!.talkYear;
        delete snapshot.bloodlineChildLedger!.talkCount;
        delete snapshot.bloodlineChildLedger!.interaction;
        const oldStorage = new PlayerSaveService(new MemoryStorageAdapter());
        await oldStorage.save(snapshot as never);
        const old = new GameSession(9);
        old.setRosterStore(new InMemoryRosterStore());
        old.setSaveService(oldStorage);
        assert.isTrue(await old.load());
        assert.equals(0, old.childInteractionCountThisYear);
        assert.isTrue(old.talkToChild(SEEDLING_ID).ok, '舊存檔還沒談過，今年可以談');
    });

    suite.test('彈窗畫面文字：孩子名／歲數、標題描述、A／B 選項（含效果摘要）、還有幾件', () => {
        const v = childGrowthPopupView(EVENT, { name: '小曹', age: 9 }, 2, t);
        assert.equals('偷吃灶糖', v.texts.cgTitle);
        assert.equals('小曹（9 歲）', v.texts.cgChild);
        assert.equals(zhTw['bloodline.event.y3.desc'], v.texts.cgDesc);
        assert.equals('嚴厲訓斥（政略 +1、好感 -2）', v.texts.btnGrowthALabel);
        assert.equals('分他一半（好感 +5、圖鑑碎片 +1）', v.texts.btnGrowthBLabel);
        assert.equals('還有 2 件小事等你處理', v.texts.cgMore);
        assert.equals('', childGrowthPopupView(EVENT, { name: 'x', age: 9 }, 0, t).texts.cgMore);
        assert.isTrue(v.enabled.btnGrowthA && v.enabled.btnGrowthB);
    });

    suite.test('彈窗觸發：有待決事件才開；沒有就不開；守衛不允許時合併成待開、解除後補開一次', async () => {
        const empty = popupSetup([]);
        await empty.ctrl.mount();
        assert.isFalse(await empty.ctrl.open());
        assert.isFalse(empty.ctrl.isOpen);

        let allowed = false;
        const guarded = popupSetup([EVENT], { canOpen: () => allowed });
        await guarded.ctrl.mount();
        assert.isFalse(guarded.host.node.active, '掛載後先收起');
        assert.isFalse(await guarded.ctrl.open());
        assert.isFalse(await guarded.ctrl.open(), '重複請求合併');
        assert.isFalse(guarded.ctrl.isOpen);
        allowed = true;
        assert.isTrue(await guarded.ctrl.refreshAvailability());
        assert.isTrue(guarded.ctrl.isOpen);
        assert.equals(1, guarded.applied.length);
        assert.isFalse(await guarded.ctrl.refreshAvailability(), '待開請求只補一次');
    });

    suite.test('選項入帳：點 A 呼叫 resolve 並 Toast 結果；還有下一件就接著顯示，沒有就收起', async () => {
        const s = popupSetup([EVENT, EVENT_2]);
        await s.ctrl.mount();
        assert.isTrue(await s.ctrl.open());
        assert.equals('小曹（9 歲）', s.applied[0].texts.cgChild);
        assert.equals('還有 1 件小事等你處理', s.applied[0].texts.cgMore);
        await s.ctrl.choose('B');
        assert.equals(JSON.stringify([['kid-a', 'child_y3_stove_sugar', 'B']]), JSON.stringify(s.resolved));
        assert.equals(zhTw['bloodline.event.y3.resB'], s.toasts[0]);
        assert.isTrue(s.ctrl.isOpen, '還有下一件');
        assert.equals('小劉（10 歲）', s.applied[s.applied.length - 1].texts.cgChild);
        await s.ctrl.choose('A');
        assert.equals(2, s.resolved.length);
        assert.isFalse(s.ctrl.isOpen, '全部處理完就收起');
        assert.equals(0, s.queue.length);
    });

    suite.test('銀兩不足：只提示、視窗與事件都留著；「稍後再說」只收起、待決不丟；事件已被處理過就跳下一件', async () => {
        const low = popupSetup([EVENT], { outcome: () => ({ ok: false, reason: 'silver-low' }) });
        await low.ctrl.mount();
        await low.ctrl.open();
        await low.ctrl.choose('A');
        assert.equals(zhTw['ui.child.growth.silver_low'], low.toasts[0]);
        assert.isTrue(low.ctrl.isOpen);
        assert.equals(1, low.queue.length);
        low.click('btnGrowthClose');
        assert.isFalse(low.ctrl.isOpen);
        assert.equals(1, low.queue.length, '稍後再說不丟事件');
        assert.isTrue(await low.ctrl.open(), '下次還會問');

        const gone = popupSetup([EVENT]);
        await gone.ctrl.mount();
        await gone.ctrl.open();
        gone.queue.length = 0;
        await gone.ctrl.choose('A');
        assert.isFalse(gone.ctrl.isOpen);
    });

    suite.test('祠堂親子談話：顯示孩子與好感、談話後顯示話題並 Toast 好感增量；今年談過按鈕灰掉；換一位', async () => {
        const snap: FamilyChildLedgerResult = {
            favor: { a: 35 }, favorDefault: 30, epithetFragments: 0, classmateFriends: {},
            children: [{ id: 'a', name: '小曹', age: 9 }, { id: 'b', name: '小劉', age: 8 }],
            talkedThisYear: [], interactionCountThisYear: 0,
        };
        const initial = childTalkView({ snapshot: snap, index: 0, lastTalk: null, t });
        assert.equals('小曹（9 歲）　親子好感 35', initial.texts.shrineChildInfo);
        assert.equals('親子談話', initial.texts.btnChildTalkLabel);
        assert.isTrue(initial.enabled.btnChildTalk);
        assert.isTrue(initial.actives.btnChildNext);
        assert.equals('小劉（8 歲）　親子好感 30', childTalkView({ snapshot: snap, index: 1, lastTalk: null, t }).texts.shrineChildInfo, '沒紀錄用預設好感');
        assert.isFalse(childTalkView({ snapshot: { ...snap, children: [snap.children[0]] }, index: 0, lastTalk: null, t }).actives.btnChildNext, '只有一位不顯示換人');
        const none = childTalkView({ snapshot: { ...snap, children: [] }, index: 0, lastTalk: null, t });
        assert.equals(zhTw['ui.child.talk.none'], none.texts.shrineChildInfo);
        assert.isFalse(none.enabled.btnChildTalk);

        let bindings: MentorHoldingsButtonBinding[] = [];
        const host = { node: { active: false }, binder: null };
        const applied: ClanShrineView[] = [];
        const toasts: string[] = [];
        let state = snap;
        const ctrl = new ClanShrineController({
            mountHost: async (b) => { bindings = b; return host; },
            apply: (_h, v) => { applied.push(v); },
            prestige: () => 0, tier: () => 1, canClaim: () => false, claim: async () => 0, offeringPills: 1, now: () => 1000,
            toast: (m) => { toasts.push(m); },
            child: {
                snapshot: async () => state,
                talk: async (childId) => {
                    state = { ...state, favor: { ...state.favor, [childId]: 36 }, talkedThisYear: [childId], interactionCountThisYear: 1 };
                    return { ok: true, result: { childId, topicId: 'talk_stove', lineKey: 'child.talk.line1', favorDelta: 1, favor: 36, interactionCountThisYear: 1 } };
                },
                t,
            },
        });
        await ctrl.mount();
        const click = (id: string): void => bindings.find((b) => b.buttonId === id)?.handler();
        assert.isTrue(bindings.some((b) => b.buttonId === 'btnChildTalk') && bindings.some((b) => b.buttonId === 'btnChildNext'));
        ctrl.setOpen(true);
        await ctrl.refreshChildren();
        assert.equals('小曹（9 歲）　親子好感 35', applied[applied.length - 1].texts.shrineChildInfo);
        assert.equals('祠堂', applied[applied.length - 1].texts.shrineTitle, '原有祠堂文字仍在');
        assert.isTrue(await ctrl.talkToCurrentChild());
        const last = applied[applied.length - 1];
        assert.equals('小曹（9 歲）　親子好感 36', last.texts.shrineChildInfo);
        assert.equals(zhTw['child.talk.line1'], last.texts.shrineChildLine);
        assert.equals('今年已談過了', last.texts.btnChildTalkLabel);
        assert.isFalse(last.enabled.btnChildTalk);
        assert.equals('親子好感 +1', toasts[0]);
        click('btnChildNext');
        const next = applied[applied.length - 1];
        assert.equals('小劉（8 歲）　親子好感 30', next.texts.shrineChildInfo);
        assert.isTrue(next.enabled.btnChildTalk, '另一位孩子還沒談');
    });

    suite.test('祠堂沒給孩子依賴時不綁親子按鈕、畫面維持原樣', async () => {
        let bindings: MentorHoldingsButtonBinding[] = [];
        const applied: ClanShrineView[] = [];
        const ctrl = new ClanShrineController({
            mountHost: async (b) => { bindings = b; return { node: { active: false }, binder: null }; },
            apply: (_h, v) => { applied.push(v); },
            prestige: () => 0, tier: () => 1, canClaim: () => false, claim: async () => 0, offeringPills: 1, now: () => 1000, toast: () => undefined,
        });
        await ctrl.mount();
        assert.isFalse(bindings.some((b) => b.buttonId === 'btnChildTalk'));
        ctrl.refresh();
        assert.isTrue(!('shrineChildInfo' in applied[applied.length - 1].texts));
    });

    suite.test('畫面規格：彈窗與祠堂的節點 id 齊全，皮膚登記 settle 家族；四語系 key 與佔位符一致', () => {
        const popup = new Set<string>();
        collectIds(readJson('assets/resources/ui-spec/layouts/child-growth-popup-main.json').root, popup);
        for (const id of ['cgTitle', 'cgChild', 'cgDesc', 'cgHint', 'cgMore', 'btnGrowthA', 'btnGrowthB', 'btnGrowthClose', 'btnGrowthALabel', 'btnGrowthBLabel', 'btnGrowthCloseLabel']) {
            assert.isTrue(popup.has(id), `彈窗缺節點 ${id}`);
        }
        const shrine = new Set<string>();
        collectIds(readJson('assets/resources/ui-spec/layouts/clan-shrine-main.json').root, shrine);
        for (const id of ['shrineChildInfo', 'shrineChildLine', 'btnChildTalk', 'btnChildTalkLabel', 'btnChildNext', 'btnChildNextLabel']) {
            assert.isTrue(shrine.has(id), `祠堂缺節點 ${id}`);
        }
        const settle = readJson('assets/resources/ui-spec/themes/theme-registry.json').familyBindings.settle;
        assert.isTrue(settle.appliesToSkins.includes('child-growth-popup-screen.skin'));
        for (const slot of Object.keys(readJson('assets/resources/ui-spec/skins/child-growth-popup-screen.skin.json').slots)) {
            assert.isTrue(!!settle.slotRoles[slot], `${slot} 沒有 settle 角色對應`);
        }
        const keys = ['ui.child.talk_btn', 'ui.child.growth.title', 'ui.child.growth.child', 'ui.child.growth.hint', 'ui.child.growth.close', 'ui.child.growth.more',
            'ui.child.growth.silver_low', 'ui.child.growth.gone', 'ui.child.talk.info', 'ui.child.talk.none', 'ui.child.talk.hint', 'ui.child.talk.done_btn',
            'ui.child.talk.next', 'ui.child.talk.gain', 'ui.child.talk.already', 'child.talk.line1', 'child.talk.line2', 'child.talk.line3'];
        const placeholders = (text: string): string => (text.match(/\{\d+\}/g) ?? []).sort().join(',');
        for (const lang of ['zh-TW', 'zh-CN', 'en', 'ja']) {
            const dict = readJson(`assets/resources/i18n/${lang}.json`) as Record<string, string>;
            for (const key of keys) {
                assert.isTrue(typeof dict[key] === 'string' && dict[key] !== '', `${lang} 缺 ${key}`);
                assert.equals(placeholders(zhTw[key]), placeholders(dict[key]), `${lang} ${key} 佔位符不一致`);
            }
        }
    });

    return suite;
}
