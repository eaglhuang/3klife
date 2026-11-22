/**
 * StoryBase.test.ts — 劇情 base MVP：事件定義、選項、條件、已看紀錄、打斷佇列、story.trigger／choose／seen、演出 adapter（PROG-2-9208；doc_spec_1188、doc_spec_1182 §12 STY-M）
 *
 * 鎖住：設定正規化（壞圖整份丟掉）、無選項劇本當場完成並寫已看、不可重看與每實例各一次、同實例重送回原狀態、
 * 選項 id 即 selectedOptionId、選項後果走 reward.claim（入帳＋grantKey 去重）、旗標與分支、條件擋觸發與選項、
 * 單一優先序打斷佇列（必中斷先、非頭不可作答 E345、處理完輪到下一個）、整筆失敗不留半套狀態、錯誤碼 E34x、
 * 夾帶結果欄位 E103、GameSession 存檔往返（重開自愈）、演出播放器佇列與缺 cue 略過，
 * 以及學府打斷與結業文案改讀 story-config.json（選項 id 與引擎常數一致、畫面文字不變）。
 *
 * Unity 對照：像 Dialogue Graph 的 EditMode 契約測試，加一條「存檔讀檔後打斷彈窗仍在」的整合測試。
 */
import * as fs from 'fs';
import * as path from 'path';
import { assert, TestSuite } from './TestRunner';
import { createLocalApi } from '../assets/scripts/core/api/localserver/createLocalApi';
import type { RewardAuthority } from '../assets/scripts/core/api/localserver/RewardCommands';
import type { StoryAuthority } from '../assets/scripts/core/api/localserver/StoryCommands';
import type { WalletAuthority } from '../assets/scripts/core/api/localserver/WalletCommands';
import { GameSession, InMemoryRosterStore } from '../assets/scripts/core/managers/GameSession';
import { PlayerSaveService } from '../assets/scripts/core/services/PlayerSaveService';
import { MemoryStorageAdapter } from '../assets/scripts/core/storage/MemoryStorageAdapter';
import {
    ACADEMY_GRADUATION_CONFIRM, ACADEMY_MIDTERM_POLICIES, ACADEMY_RESONANCE_WITNESS,
} from '../assets/scripts/core/systems/nurture/AcademyTrainingEngine';
import { academyGraduatedTextKey, academyInterruptTextKeys, configureAcademyStories } from '../assets/scripts/core/systems/nurture/AcademyStoryTexts';
import { interruptKindText } from '../assets/scripts/ui/core/AcademyFlowView';
import type {
    StoryAvailableEntry, StoryChooseResult, StoryPendingResult, StorySeenResult, StoryTriggerResult,
} from '../assets/scripts/shared/api/ApiCommands';
import { isApiFail, type ApiResult } from '../assets/scripts/shared/api/ApiProtocol';
import { DEFAULT_STORY_CONFIG, normalizeStoryConfig, storyPopupOf, type StoryConfigV1 } from '../assets/scripts/shared/story/StoryConfig';
import { StoryPlayer, type PopupSink, type StoryPlayView } from '../assets/scripts/shared/story/StoryPresentation';
import {
    emptyStoryMeta, isEmptyStoryMeta, normalizeStoryMeta, orderedQueue, type StoryMeta,
} from '../assets/scripts/shared/story/StoryRules';
import { emptyRewardMeta, type RewardMeta } from '../assets/scripts/shared/reward/RewardRules';
import { normalizeRewardConfig } from '../assets/scripts/shared/reward/RewardConfig';

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

class MemoryStory implements StoryAuthority {
    public storyMeta: StoryMeta = emptyStoryMeta();
    public meta(): StoryMeta { return this.storyMeta; }
    public setMeta(meta: StoryMeta): void { this.storyMeta = meta; }
}

/** 測試劇本：把常見形狀都放一份 */
function testStories(): StoryConfigV1 {
    return normalizeStoryConfig({
        stories: [
            // 無選項、不可重看的歷史劇情
            { id: 'S_HISTORY', kind: 'history', start: 'n1', nodes: {
                n1: { type: 'scene', cues: [{ cue: 'popup', textKey: 'story.h.line1' }, { cue: 'bgm', id: 'bgm_war' }], next: 'end' },
                end: { type: 'end' } } },
            // 二選一：善意給銅錢＋旗標、嚴格給旗標；另有條件選項
            { id: 'S_BIRTHDAY', kind: 'growth', repeatable: true, start: 'n1', nodes: {
                n1: { type: 'scene', cues: [{ cue: 'popup', textKey: 'story.b.line1' }], next: 'c1' },
                c1: { type: 'choice', options: [
                    { id: 'kind', textKey: 'story.b.opt_kind', next: 'e_kind' },
                    { id: 'strict', textKey: 'story.b.opt_strict', next: 'e_strict' },
                    { id: 'secret', next: 'e_strict', condition: { kind: 'flag', key: 'story.unlocked.secret' } } ] },
                e_kind: { type: 'effects', effects: [{ kind: 'reward', ref: 'BUNDLE_KIND' }, { kind: 'flag', set: 'child.trait.gentle' }], next: 'end' },
                e_strict: { type: 'effects', effects: [{ kind: 'flag', set: 'child.trait.strict' }], next: 'end' },
                end: { type: 'end' } } },
            // 條件擋觸發
            { id: 'S_GATED', kind: 'bond', trigger: { when: { kind: 'flag', key: 'child.trait.gentle' } }, start: 'n1', nodes: {
                n1: { type: 'scene', cues: [{ cue: 'popup', textKey: 'story.g.line1' }], next: 'end' }, end: { type: 'end' } } },
            // 看過 S_HISTORY 才走另一條支線（branch）
            { id: 'S_BRANCH', kind: 'quest', repeatable: true, start: 'b1', nodes: {
                b1: { type: 'branch', when: { kind: 'flag', key: 'story.seen.S_HISTORY' }, then: 'yes', else: 'no' },
                yes: { type: 'scene', cues: [{ cue: 'popup', textKey: 'story.br.yes' }], next: 'end' },
                no: { type: 'scene', cues: [{ cue: 'popup', textKey: 'story.br.no' }], next: 'end' },
                end: { type: 'end' } } },
            // 打斷：必中斷、高優先
            { id: 'S_INT_HIGH', kind: 'system', interrupt: true, priority: 100, repeatable: true, start: 'c1', nodes: {
                c1: { type: 'choice', options: [{ id: 'OK', next: 'end' }] }, end: { type: 'end' } } },
            { id: 'S_INT_LOW', kind: 'system', interrupt: true, priority: 10, repeatable: true, start: 'c1', nodes: {
                c1: { type: 'choice', options: [{ id: 'OK', next: 'end' }] }, end: { type: 'end' } } },
            { id: 'S_NORMAL', kind: 'growth', priority: 50, repeatable: true, start: 'c1', nodes: {
                c1: { type: 'choice', options: [{ id: 'OK', next: 'end' }] }, end: { type: 'end' } } },
            // 宿主帶入選項
            { id: 'S_HOST', kind: 'system', repeatable: true, start: 'c1', nodes: {
                c1: { type: 'choice', hostOptions: true, next: 'end' }, end: { type: 'end' } } },
            // 兩段選擇
            { id: 'S_TWO', kind: 'growth', repeatable: true, start: 'c1', nodes: {
                c1: { type: 'choice', options: [{ id: 'A', next: 'c2' }] },
                c2: { type: 'choice', options: [{ id: 'B', next: 'e' }] },
                e: { type: 'effects', effects: [{ kind: 'reward', ref: 'BUNDLE_KIND' }], next: 'end' },
                end: { type: 'end' } } },
            // 後果失敗：獎勵套件不存在
            { id: 'S_BADREWARD', kind: 'growth', repeatable: true, start: 'c1', nodes: {
                c1: { type: 'choice', options: [{ id: 'GO', next: 'e' }] },
                e: { type: 'effects', effects: [{ kind: 'flag', set: 'should.not.persist' }, { kind: 'reward', ref: 'BUNDLE_NOPE' }], next: 'end' },
                end: { type: 'end' } } },
            // 宿主自訂效果
            { id: 'S_QUEST', kind: 'quest', repeatable: true, start: 'e', nodes: {
                e: { type: 'effects', effects: [{ kind: 'questSpawn', questId: 'Q_NEW' }], next: 'end' }, end: { type: 'end' } } },
            // 壞圖：指向不存在的節點，會被丟掉
            { id: 'S_BROKEN', start: 'n1', nodes: { n1: { type: 'scene', cues: [{ cue: 'popup' }], next: 'missing' } } },
        ],
    });
}

function rig(config: StoryConfigV1 = testStories()) {
    const bundle = createLocalApi(new PlayerSaveService(new MemoryStorageAdapter()), { now: () => 5_000 });
    const wallet = new FakeWallet();
    const reward = new MemoryReward();
    const story = new MemoryStory();
    bundle.setWallet(wallet);
    bundle.setRewardAuthority(reward);
    bundle.setRewardConfig(normalizeRewardConfig({
        bundles: [{ id: 'BUNDLE_KIND', sources: ['story'], effects: [{ kind: 'currency', id: 'bronze', amount: 30 }] }],
    }));
    bundle.setStoryAuthority(story);
    bundle.setStoryConfig(config);
    return { api: bundle.api, bundle, wallet, reward, story };
}

type Rig = ReturnType<typeof rig>;

function ok<T>(res: ApiResult<T>): T {
    if (isApiFail(res)) throw new Error(`${res.errorCode} ${res.message}`);
    return res.result;
}

function errorOf(res: ApiResult<unknown>): string {
    return isApiFail(res) ? res.errorCode : 'OK';
}

const trigger = (r: Rig, storyId: string, refId?: string, extra: Record<string, unknown> = {}) =>
    r.api.cmd<StoryTriggerResult>('story.trigger', { storyId, ...(refId !== undefined ? { refId } : {}), ...extra });
const choose = (r: Rig, storyId: string, refId: string | undefined, choiceId: string, optionId: string) =>
    r.api.cmd<StoryChooseResult>('story.choose', { storyId, ...(refId !== undefined ? { refId } : {}), choiceId, optionId });

export function createStoryBaseSuite(): TestSuite {
    const suite = new TestSuite('StoryBase (劇情 base MVP：事件定義、選項、條件、打斷佇列、story.trigger／choose／seen PROG-2-9208)');

    suite.test('設定正規化：壞圖整份丟掉、重複 id 只留第一個、非物件回空設定；popup 文字 key 可查', () => {
        assert.equals(0, normalizeStoryConfig(null).stories.length);
        const cfg = testStories();
        assert.isTrue(cfg.stories.some((s) => s.id === 'S_BIRTHDAY'));
        assert.isFalse(cfg.stories.some((s) => s.id === 'S_BROKEN'), '指向不存在節點的劇本不能留');
        const dup = normalizeStoryConfig({ stories: [
            { id: 'D', start: 'e', nodes: { e: { type: 'end' } } },
            { id: 'D', kind: 'other', start: 'e', nodes: { e: { type: 'end' } } },
        ] });
        assert.equals(1, dup.stories.length);
        assert.equals('system', dup.stories[0].kind);
        assert.equals('story.h.line1', storyPopupOf(cfg, 'S_HISTORY')?.textKey ?? '');
        assert.equals(null, storyPopupOf(cfg, 'S_INT_HIGH'), '沒有 popup 的劇本回 null');
    });

    suite.test('無選項劇本：trigger 當場完成、回演出指令、寫已看；不可重看者第二次 E341', async () => {
        const r = rig();
        const res = ok(await trigger(r, 'S_HISTORY'));
        assert.equals('completed', res.status);
        assert.equals(2, res.cues.length, '演出指令原樣帶回（含尚無播放器的 bgm，介面可擴充）');
        assert.equals(null, res.choice);
        const seen = ok(await r.api.query<StorySeenResult>('story.seen', { storyId: 'S_HISTORY' }));
        assert.isTrue(seen.seen);
        assert.equals(1, seen.count);
        assert.equals(5_000, seen.at);
        assert.equals('E341', errorOf(await trigger(r, 'S_HISTORY', 'other')));
        const replay = ok(await trigger(r, 'S_HISTORY'));
        assert.isTrue(replay.replayed, '同實例重送回原狀態而不是報錯');
    });

    suite.test('選項：selectedOptionId 就是送出的選項 id；後果走 reward.claim 入帳、旗標寫入；同選擇重送回原結果不重領', async () => {
        const r = rig();
        const t = ok(await trigger(r, 'S_BIRTHDAY', 'y1'));
        assert.equals('active', t.status);
        assert.equals('c1', t.choice?.choiceId ?? '');
        assert.equals('kind,strict', (t.choice?.options ?? []).map((o) => o.id).join(','), '條件不成立的選項不列出');
        const res = ok(await choose(r, 'S_BIRTHDAY', 'y1', 'c1', 'kind'));
        assert.equals('kind', res.selectedOptionId);
        assert.isTrue(res.completed);
        assert.equals(30, r.wallet.balance('bronze'), '銅錢經 reward.claim 入帳');
        assert.equals('reward,flag', res.effects.map((e) => e.kind).join(','));
        const flags = ok(await r.api.query<{ flags: Record<string, boolean> }>('story.flags', {}));
        assert.isTrue(flags.flags['child.trait.gentle']);
        const again = ok(await choose(r, 'S_BIRTHDAY', 'y1', 'c1', 'kind'));
        assert.isTrue(again.replayed);
        assert.equals(30, r.wallet.balance('bronze'), '重送不重複入帳');
        assert.equals('E344', errorOf(await choose(r, 'S_BIRTHDAY', 'y1', 'c1', 'strict')), '已做過的選擇不能改選');
        const seen = ok(await r.api.query<StorySeenResult>('story.seen', { storyId: 'S_BIRTHDAY' }));
        assert.equals('kind', seen.lastChoice ?? '');
    });

    suite.test('選項驗證：不存在或條件不符 E343、沒先觸發 E342、劇本不存在 E340；條件成立後選項才出現', async () => {
        const r = rig();
        assert.equals('E342', errorOf(await choose(r, 'S_BIRTHDAY', 'y1', 'c1', 'kind')));
        assert.equals('E340', errorOf(await trigger(r, 'S_NOPE')));
        ok(await trigger(r, 'S_BIRTHDAY', 'y1'));
        assert.equals('E343', errorOf(await choose(r, 'S_BIRTHDAY', 'y1', 'c1', 'nope')));
        assert.equals('E343', errorOf(await choose(r, 'S_BIRTHDAY', 'y1', 'c1', 'secret')), '條件不符的選項不可選');
        assert.equals('E342', errorOf(await choose(r, 'S_BIRTHDAY', 'y1', 'zzz', 'kind')), '不是目前停住的選擇節點');
        r.story.storyMeta = { ...r.story.storyMeta, flags: { ...r.story.storyMeta.flags, 'story.unlocked.secret': true } };
        const pending = ok(await r.api.query<StoryPendingResult>('story.pending', {}));
        assert.equals('kind,strict,secret', pending.queue[0].choice?.options.map((o) => o.id).join(',') ?? '');
        assert.equals('secret', ok(await choose(r, 'S_BIRTHDAY', 'y1', 'c1', 'secret')).selectedOptionId);
    });

    suite.test('觸發條件：不符 E341；旗標成立後可觸發；branch 依已看紀錄走不同支線；available 列出可觸發者', async () => {
        const r = rig();
        assert.equals('E341', errorOf(await trigger(r, 'S_GATED')));
        let avail = ok(await r.api.query<{ stories: StoryAvailableEntry[] }>('story.available', {}));
        assert.isFalse(avail.stories.some((s) => s.storyId === 'S_GATED'));
        const no = ok(await trigger(r, 'S_BRANCH', 'a'));
        assert.equals('story.br.no', String(no.cues[0].textKey));
        ok(await trigger(r, 'S_HISTORY'));
        const yes = ok(await trigger(r, 'S_BRANCH', 'b'));
        assert.equals('story.br.yes', String(yes.cues[0].textKey));
        ok(await trigger(r, 'S_BIRTHDAY', 'y1'));
        ok(await choose(r, 'S_BIRTHDAY', 'y1', 'c1', 'kind'));
        avail = ok(await r.api.query<{ stories: StoryAvailableEntry[] }>('story.available', {}));
        assert.isTrue(avail.stories.some((s) => s.storyId === 'S_GATED'), '旗標成立後可觸發');
        assert.isFalse(avail.stories.some((s) => s.storyId === 'S_HISTORY'), '看過且不可重看者不列');
        ok(await trigger(r, 'S_GATED'));
    });

    suite.test('單一優先序打斷佇列：必中斷先、高優先先；非頭作答 E345；頭處理完輪到下一個；story.interrupt 事件送出', async () => {
        const r = rig();
        const events: string[] = [];
        r.api.subscribe('story.interrupt', (e) => { events.push(JSON.stringify(e.data)); });
        const normal = ok(await trigger(r, 'S_NORMAL', 'n'));
        assert.equals('active', normal.status);
        const low = ok(await trigger(r, 'S_INT_LOW', 'l'));
        assert.equals('active', low.status, '必中斷劇本插到非中斷之前');
        const high = ok(await trigger(r, 'S_INT_HIGH', 'h'));
        assert.equals('active', high.status);
        assert.equals(2, events.length);
        const pending = ok(await r.api.query<StoryPendingResult>('story.pending', {}));
        assert.equals('S_INT_HIGH,S_INT_LOW,S_NORMAL', pending.queue.map((q) => q.storyId).join(','));
        assert.equals('E345', errorOf(await choose(r, 'S_NORMAL', 'n', 'c1', 'OK')), '非頭不可作答');
        assert.equals('E345', errorOf(await choose(r, 'S_INT_LOW', 'l', 'c1', 'OK')));
        ok(await choose(r, 'S_INT_HIGH', 'h', 'c1', 'OK'));
        ok(await choose(r, 'S_INT_LOW', 'l', 'c1', 'OK'));
        ok(await choose(r, 'S_NORMAL', 'n', 'c1', 'OK'));
        assert.equals(0, ok(await r.api.query<StoryPendingResult>('story.pending', {})).queue.length);
    });

    suite.test('同優先依觸發先後；同實例 trigger 兩次不重複入佇列；orderedQueue 不改原陣列', async () => {
        const r = rig();
        ok(await trigger(r, 'S_INT_LOW', 'first'));
        ok(await trigger(r, 'S_INT_LOW', 'second'));
        const again = ok(await trigger(r, 'S_INT_LOW', 'first'));
        assert.isTrue(again.replayed);
        const meta = r.story.storyMeta;
        assert.equals(2, meta.queue.length);
        assert.equals('S_INT_LOW:first,S_INT_LOW:second', orderedQueue(meta.queue).map((q) => q.instanceId).join(','));
        const second = ok(await trigger(r, 'S_INT_LOW', 'second'));
        assert.equals('queued', second.status);
        assert.equals(1, second.queuePosition);
    });

    suite.test('多段選擇：停在第二段時 next 帶下一個選擇；最後一段才完成並結算後果；宿主選項由 trigger 帶入', async () => {
        const r = rig();
        ok(await trigger(r, 'S_TWO', 'x'));
        const first = ok(await choose(r, 'S_TWO', 'x', 'c1', 'A'));
        assert.isFalse(first.completed);
        assert.equals('c2', first.next?.choice?.choiceId ?? '');
        assert.equals(0, r.wallet.balance('bronze'), '還沒走完不結算');
        const last = ok(await choose(r, 'S_TWO', 'x', 'c2', 'B'));
        assert.isTrue(last.completed);
        assert.equals(30, r.wallet.balance('bronze'));

        const host = ok(await trigger(r, 'S_HOST', 'h1', { options: ['T_A', 'T_B', 'T_C'] }));
        assert.equals('T_A,T_B,T_C', host.choice?.options.map((o) => o.id).join(',') ?? '');
        assert.equals('E343', errorOf(await choose(r, 'S_HOST', 'h1', 'c1', 'T_Z')));
        assert.equals('T_B', ok(await choose(r, 'S_HOST', 'h1', 'c1', 'T_B')).selectedOptionId);
    });

    suite.test('整筆失敗不留半套：後果裡獎勵套件不存在回 E347，旗標沒寫、仍在佇列可再選；未知效果種類 E346；宿主效果 handler 可掛', async () => {
        const r = rig();
        ok(await trigger(r, 'S_BADREWARD', 'z'));
        assert.equals('E347', errorOf(await choose(r, 'S_BADREWARD', 'z', 'c1', 'GO')));
        const flags = ok(await r.api.query<{ flags: Record<string, boolean> }>('story.flags', {}));
        assert.isFalse('should.not.persist' in flags.flags);
        assert.equals(1, r.story.storyMeta.queue.length, '失敗後劇本仍在佇列');
        assert.equals('E346', errorOf(await trigger(r, 'S_QUEST', 'q')));
        const spawned: string[] = [];
        r.bundle.registerStoryEffect('questSpawn', (effect) => { spawned.push(String(effect.questId)); return { detail: { questId: effect.questId } }; });
        const res = ok(await trigger(r, 'S_QUEST', 'q'));
        assert.equals('completed', res.status);
        assert.equals('Q_NEW', spawned.join(','));
    });

    suite.test('權威欄位：trigger／choose 夾帶 effects、flags、next 一律 E103；錯誤碼落在 E34x；權威端未綁定 E348', async () => {
        const r = rig();
        assert.equals('E103', errorOf(await trigger(r, 'S_HISTORY', undefined, { effects: [] })));
        ok(await trigger(r, 'S_NORMAL', 'n'));
        assert.equals('E103', errorOf(await r.api.cmd('story.choose', { storyId: 'S_NORMAL', refId: 'n', choiceId: 'c1', optionId: 'OK', next: 'end' })));
        assert.equals('E103', errorOf(await r.api.cmd('story.choose', { storyId: 'S_NORMAL', refId: 'n', choiceId: 'c1', optionId: 'OK', flags: { a: true } })));
        const bare = createLocalApi(new PlayerSaveService(new MemoryStorageAdapter()));
        bare.setStoryConfig(testStories());
        assert.equals('E348', errorOf(await bare.api.cmd('story.trigger', { storyId: 'S_HISTORY' })));
    });

    suite.test('中繼資料：正規化壞資料、空白不寫進存檔、佇列與已看往返', () => {
        assert.isTrue(isEmptyStoryMeta(emptyStoryMeta()));
        assert.isTrue(isEmptyStoryMeta(normalizeStoryMeta('garbage')));
        const meta = normalizeStoryMeta({
            seq: 3, flags: { a: true, b: 'x' }, seen: { S: { at: 9, count: 2, choice: 'k' }, T: 5 },
            queue: [{ instanceId: 'S:1', storyId: 'S', refId: '1', nodeId: 'c1', seq: 2, priority: 5, interrupt: true, cues: [{ cue: 'popup' }, { bad: 1 }], hostOptions: ['x', 1], choices: { c0: 'a', c9: 7 } }, { nope: true }],
            done: [{ instanceId: 'S:0', storyId: 'S', choices: {}, result: { ok: true } }, { instanceId: 'bad' }],
        });
        assert.isFalse(isEmptyStoryMeta(meta));
        assert.equals('a', Object.keys(meta.flags).join(','));
        assert.equals('S', Object.keys(meta.seen).join(','));
        assert.equals(1, meta.queue.length);
        assert.equals(1, meta.queue[0].cues.length);
        assert.equals('x', meta.queue[0].hostOptions.join(','));
        assert.equals('c0', Object.keys(meta.queue[0].choices).join(','));
        assert.equals(1, meta.done.length);
    });

    suite.test('GameSession 整合：storyMeta 隨存檔往返（等待選擇的打斷重開後仍在、可作答）；沒用過劇情就不寫欄位', async () => {
        const adapter = new MemoryStorageAdapter();
        const store = new PlayerSaveService(adapter);
        const make = () => {
            const session = new GameSession();
            session.setRosterStore(new InMemoryRosterStore([]));
            session.setSaveService(store);
            const bundle = createLocalApi(store, { now: () => 7_000 });
            bundle.setStoryAuthority(session.storyAuthority());
            bundle.setStoryConfig(testStories());
            return { session, api: bundle.api };
        };
        const a = make();
        await a.session.load();
        await a.session.save();
        const clean = await store.load();
        assert.isFalse(clean !== null && 'storyMeta' in clean, '沒用過劇情就不寫 storyMeta，舊檔形狀不變');
        ok(await a.api.cmd<StoryTriggerResult>('story.trigger', { storyId: 'S_INT_HIGH', refId: 'turn12' }));
        ok(await a.api.cmd<StoryTriggerResult>('story.trigger', { storyId: 'S_HISTORY' }));
        await a.session.save();
        const b = make();
        await b.session.load();
        const pending = ok(await b.api.query<StoryPendingResult>('story.pending', {}));
        assert.equals(1, pending.queue.length, '重開後等待選擇的打斷還在（重進後重新彈出）');
        assert.equals('S_INT_HIGH', pending.queue[0].storyId);
        assert.isTrue(ok(await b.api.query<StorySeenResult>('story.seen', { storyId: 'S_HISTORY' })).seen, '已看紀錄還在');
        assert.equals('OK', ok(await b.api.cmd<StoryChooseResult>('story.choose', { storyId: 'S_INT_HIGH', refId: 'turn12', choiceId: 'c1', optionId: 'OK' })).selectedOptionId);
    });

    suite.test('演出播放器：照順序播 cue、缺 handler 的 cue 記 log 略過不阻擋；popup 選項回傳選項 id；單一佇列依優先序', async () => {
        const shown: string[] = [];
        const sink: PopupSink = {
            showPopup: async (p) => { shown.push(`${p.textKey}:${p.options.map((o) => o.id).join('/')}`); return p.options.length > 0 ? p.options[1 % p.options.length].id : null; },
        };
        const player = new StoryPlayer(sink);
        const view = (id: string, withChoice: boolean): StoryPlayView => ({
            storyId: id, instanceId: `${id}:`, skippable: true,
            cues: [{ cue: 'portrait', who: 'child' }, { cue: 'popup', textKey: `k.${id}` }],
            choice: withChoice ? { choiceId: 'c1', options: [{ id: 'a', textKey: null }, { id: 'b', textKey: null }] } : null,
        });
        assert.equals('b', await player.play(view('S1', true)));
        assert.equals('k.S1:a/b', shown[0]);
        assert.isTrue(player.log.some((l) => l.indexOf('portrait') >= 0), '缺 handler 的 cue 記 log');
        assert.equals(null, await player.play(view('S2', false)));
        // 佇列：第一筆立刻開播，其後依必中斷、優先序、先進先出
        shown.length = 0;
        const order: string[] = [];
        const jobs = [
            player.enqueue(view('FIRST', false), 1).then(() => order.push('FIRST')),
            player.enqueue(view('LOW', false), 1).then(() => order.push('LOW')),
            player.enqueue(view('HIGH', false), 9).then(() => order.push('HIGH')),
            player.enqueue(view('INT', false), 0, { interrupt: true }).then(() => order.push('INT')),
        ];
        await Promise.all(jobs);
        assert.equals('FIRST,INT,HIGH,LOW', order.join(','));
    });

    suite.test('學府遷移：打斷與結業文案改讀 story-config.json；選項 id 與引擎常數一致；畫面文字與遷移前相同；資料缺漏回空字串', () => {
        const raw = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'assets', 'resources', 'data', 'story-config.json'), 'utf8')) as unknown;
        const cfg = normalizeStoryConfig(raw);
        const optionIds = (storyId: string): string => {
            const story = cfg.stories.find((s) => s.id === storyId);
            const node = story ? Object.values(story.nodes).find((n) => n.type === 'choice') : undefined;
            return node && node.type === 'choice' ? node.options.map((o) => o.id).join(',') : '';
        };
        assert.equals(ACADEMY_MIDTERM_POLICIES.join(','), optionIds('STORY_ACADEMY_MIDTERM'), '期中方針選項 id 即引擎 selectedOptionId');
        assert.equals(ACADEMY_RESONANCE_WITNESS, optionIds('STORY_ACADEMY_RESONANCE'));
        assert.equals(ACADEMY_GRADUATION_CONFIRM, optionIds('STORY_ACADEMY_GRADUATION'));
        const coming = cfg.stories.find((s) => s.id === 'STORY_ACADEMY_COMING_OF_AGE');
        assert.isTrue(coming !== undefined && Object.values(coming.nodes).some((n) => n.type === 'choice' && n.hostOptions), '弱冠禮選項由訓練引擎帶入');
        assert.isTrue(cfg.stories.filter((s) => s.id.indexOf('STORY_ACADEMY_') === 0 && s.interrupt).length === 4, '四種打斷皆為必中斷');

        const identity = (key: string): string => key;
        try {
            configureAcademyStories(DEFAULT_STORY_CONFIG);
            assert.equals('', interruptKindText(identity, 'GRADUATION'), '資料未載入不以模板句硬補');
            assert.equals(null, academyGraduatedTextKey());
            configureAcademyStories(cfg);
            assert.equals('ui.academy.flow.int.kind.GRADUATION', academyInterruptTextKeys('GRADUATION')?.titleKey ?? '');
            assert.equals('ui.academy.flow.int.title', academyInterruptTextKeys('MIDTERM')?.textKey ?? '');
            assert.equals('ui.academy.flow.graduated', academyGraduatedTextKey() ?? '');
            // 遷移前後同樣的 zh-TW 文字（i18n key 沒動）
            assert.equals('結業確認', interruptKindText(identity, 'GRADUATION'));
            assert.equals('期中考評', interruptKindText(identity, 'MIDTERM'));
            assert.equals('弱冠禮', interruptKindText(identity, 'COMING_OF_AGE'));
            assert.equals('重大共鳴', interruptKindText(identity, 'RESONANCE'));
        } finally {
            configureAcademyStories(DEFAULT_STORY_CONFIG);
        }
    });

    return suite;
}
