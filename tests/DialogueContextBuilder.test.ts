/**
 * DialogueContextBuilder.test.ts — 武將台詞 v2 參數推導、請求器快取、友誼事件反應（PROG-2-9964）
 *
 * 鎖住：10 種情緒各自可推出、relationBucket 邊界、缺欄位不送請求、對象不同參數不同、
 * 規則檔與中台情境登錄一致（互動類型／場景／覆寫情境都存在）、本機快取同情境不重複請求、反應節流。
 */
import { assert, TestSuite } from './TestRunner';
import {
    buildDialogueRequest, deriveMood, DialogueEventLog, DIALOGUE_INTERACTION_TYPES, DIALOGUE_MOODS, DIALOGUE_SCENES,
    normalizeDialogueRules, relationBucketOf, worldPhaseOf, type DialogueMood, type DialogueRulesConfig, type DialogueStateSource, type DialogueTarget, type MindMoodName,
} from '../assets/scripts/core/dialogue/DialogueContextBuilder';
import { DialogueRequester } from '../assets/scripts/core/dialogue/DialogueRequester';
import { DialogueReactionHub } from '../assets/scripts/core/dialogue/DialogueReactionHub';
import type { NpcDialogueRequest, NpcDialogueResponse } from '../assets/scripts/core/services/NpcDialogueService';

function loadRules(): DialogueRulesConfig {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs') as typeof import('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path') as typeof import('path');
    const raw = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'assets', 'resources', 'data', 'dialogue-mood-rules.json'), 'utf-8')) as unknown;
    return normalizeDialogueRules(raw) as DialogueRulesConfig;
}

const RULES = loadRules();
const HOLDERS = [{ id: 'wei', territories: 4 }, { id: 'shu', territories: 4 }, { id: 'wu', territories: 3 }, { id: 'player', territories: 1 }];

interface Fake { voice?: { gender?: string; age?: number }; personality?: string; mind?: string; player?: number; pair?: Record<string, number>; holders?: typeof HOLDERS | undefined; recent?: string | null }
function source(f: Fake = {}): DialogueStateSource {
    return {
        voiceOf: () => f.voice,
        personalityOf: () => ('personality' in f ? f.personality : 'Brave'),
        mindMoodOf: () => ('mind' in f ? f.mind : 'NORMAL'),
        friendshipOf: (_id, t: DialogueTarget) => (t.kind === 'player' ? ('player' in f ? f.player : 0) : f.pair?.[t.id]),
        worldHolders: () => ('holders' in f ? f.holders : HOLDERS),
        playerHolderId: () => 'player',
        recentActionOf: () => f.recent ?? null,
    };
}
const moodFor = (mind: MindMoodName, bucket: number, ctx: string, extra: object = {}): DialogueMood => deriveMood({ mindMood: mind, bucket, contextKey: ctx, ...extra }, RULES);

export function createDialogueContextBuilderSuite(): TestSuite {
    const suite = new TestSuite('DialogueContextBuilder (武將台詞 v2 參數推導 PROG-2-9964)');

    suite.test('relationBucket 邊界：≤-60→0、-59～-20→1、-19～19→2、20～59→3、≥60→4', () => {
        const cases: Array<[number, number]> = [[-100, 0], [-61, 0], [-60, 0], [-59, 1], [-20, 1], [-19, 2], [0, 2], [19, 2], [20, 3], [59, 3], [60, 4], [100, 4]];
        for (const [score, want] of cases) assert.equals(want, relationBucketOf(score, RULES), `score ${score}`);
    });

    suite.test('10 種情緒每一種都有可推出的情境（預設矩陣、覆寫表、吃醋）', () => {
        const got: Record<string, DialogueMood> = {
            joy: moodFor('HIGH', 3, 'lobby-idle'),
            anger: moodFor('NORMAL', 0, 'lobby-idle'),
            sorrow: moodFor('LOW', 2, 'daily-chat'),
            fear: moodFor('LOW', 2, 'pre-battle'),
            pride: moodFor('EAGER', 2, 'greeting'),
            calm: moodFor('NORMAL', 2, 'greeting'),
            shy: moodFor('NORMAL', 4, 'praised'),
            jealous: moodFor('NORMAL', 3, 'gift-received', { witness: { witnessBucket: 2 } }),
            grateful: moodFor('NORMAL', 3, 'gift-received'),
            wronged: moodFor('NORMAL', 2, 'rejected'),
        };
        for (const mood of DIALOGUE_MOODS) assert.equals(mood, got[mood], `情緒 ${mood}`);
    });

    suite.test('預設矩陣整張表（4 心情 × 5 bucket）與設計表一致', () => {
        const want: Record<MindMoodName, DialogueMood[]> = {
            EAGER: ['anger', 'pride', 'pride', 'joy', 'joy'], HIGH: ['anger', 'calm', 'joy', 'joy', 'joy'],
            NORMAL: ['anger', 'calm', 'calm', 'calm', 'joy'], LOW: ['anger', 'sorrow', 'sorrow', 'sorrow', 'calm'],
        };
        for (const mm of Object.keys(want) as MindMoodName[]) for (let b = 0; b < 5; b++) assert.equals(want[mm][b], moodFor(mm, b, 'season-change'), `${mm}/${b}`);
    });

    suite.test('情境覆寫與心情修正：誇獎、被拒、戰勝、戰敗、被俘、單挑輸等', () => {
        assert.equals('calm', moodFor('NORMAL', 0, 'praised'));
        assert.equals('grateful', moodFor('LOW', 4, 'praised'));
        assert.equals('pride', moodFor('EAGER', 1, 'praised'));
        assert.equals('sorrow', moodFor('LOW', 2, 'rejected'));
        assert.equals('wronged', moodFor('NORMAL', 3, 'advice-rejected'));
        assert.equals('joy', moodFor('EAGER', 4, 'gift-received'));
        assert.equals('grateful', moodFor('LOW', 4, 'gift-received'));
        assert.equals('joy', moodFor('LOW', 1, 'battle-victory'));
        assert.equals('pride', moodFor('NORMAL', 2, 'battle-victory'));
        assert.equals('anger', moodFor('EAGER', 3, 'battle-defeat'));
        assert.equals('sorrow', moodFor('NORMAL', 3, 'battle-defeat'));
        assert.equals('fear', moodFor('LOW', 0, 'captured'));
        assert.equals('anger', moodFor('NORMAL', 4, 'captured'));
        assert.equals('anger', moodFor('EAGER', 2, 'duel-lost'));
        assert.equals('joy', moodFor('NORMAL', 3, 'sortie-selected'));
        assert.equals('fear', moodFor('LOW', 3, 'siege-defense'));
        assert.equals('pride', moodFor('HIGH', 1, 'pre-battle'));
        assert.equals('grateful', moodFor('LOW', 3, 'comfort'));
        assert.equals('calm', moodFor('LOW', 1, 'comfort'));
    });

    suite.test('吃醋：對玩家好感高才吃醋；對那位武將好感高改為 joy；好感不高不吃醋', () => {
        assert.equals('jealous', moodFor('NORMAL', 4, 'promoted', { witness: { witnessBucket: 1 } }));
        assert.equals('joy', moodFor('NORMAL', 4, 'promoted', { witness: { witnessBucket: 3 } }));
        assert.equals('joy', moodFor('NORMAL', 2, 'promoted', { witness: { witnessBucket: 0 } }));
        assert.equals('jealous', moodFor('NORMAL', 3, 'sortie-selected', { witness: { witnessBucket: 2 } }));
    });

    suite.test('近期友誼事件餘溫：只影響沒有覆寫的日常情境', () => {
        assert.equals('wronged', moodFor('NORMAL', 2, 'lobby-idle', { recentActionId: 'admin_volunteer_rejected' }));
        assert.equals('grateful', moodFor('NORMAL', 2, 'lobby-idle', { recentActionId: 'reward_grant_treasure' }));
        assert.equals('calm', moodFor('NORMAL', 2, 'lobby-idle', { recentActionId: 'no_such_action' }));
        assert.equals('calm', moodFor('NORMAL', 2, 'comfort', { recentActionId: 'admin_volunteer_rejected' }));
    });

    suite.test('worldPhase：一強、三足、大敵當前、亂世、無資料', () => {
        const p = (h: Array<{ id: string; territories: number }>) => worldPhaseOf(h, 'player', RULES);
        assert.equals('unification', p([{ id: 'wei', territories: 7 }, { id: 'shu', territories: 2 }, { id: 'player', territories: 1 }]));
        assert.equals('tripartite', p(HOLDERS));
        assert.equals('crisis', p([{ id: 'wei', territories: 5 }, { id: 'shu', territories: 1 }, { id: 'wu', territories: 1 }, { id: 'lu', territories: 1 }, { id: 'ma', territories: 1 }, { id: 'player', territories: 1 }]));
        assert.equals('chaos', p([{ id: 'a', territories: 2 }, { id: 'b', territories: 2 }, { id: 'c', territories: 2 }, { id: 'd', territories: 2 }, { id: 'e', territories: 2 }, { id: 'player', territories: 2 }]));
        assert.equals(null, p([]));
        assert.equals(null, worldPhaseOf(undefined, 'player', RULES));
    });

    suite.test('完整請求：7 個必填參數全部填齊且型別正確', () => {
        const r = buildDialogueRequest({ generalId: 'zhang-fei', contextKey: 'lobby-idle' }, source({ player: 35, mind: 'HIGH' }), RULES);
        assert.isTrue(r.ok);
        if (!r.ok) return;
        const q = r.request;
        assert.equals(2, q.schemaVersion);
        assert.equals('Brave', q.personality);
        assert.equals('joy', q.mood);
        assert.equals(3, q.relationBucket);
        assert.equals('tripartite', q.worldPhase);
        assert.equals('lobby', q.scene);
        assert.equals('encounter', q.interaction?.type);
        assert.equals('player', q.interaction?.targetKind);
        assert.equals('lobby-idle', q.contextKey);
    });

    suite.test('缺欄位不送請求：缺性格、心情、好感、天下大勢、事件 ID 各自回報', () => {
        const base = { generalId: 'g', contextKey: 'lobby-idle' } as Parameters<typeof buildDialogueRequest>[0];
        const miss = (f: Fake, input = base) => {
            const r = buildDialogueRequest(input, source(f), RULES);
            return r.ok ? ['OK'] : [...r.missing, ...r.invalid.map((x) => `!${x}`)];
        };
        assert.equals('personality', miss({ personality: undefined }).join());
        assert.equals('mood', miss({ mind: undefined }).join());
        assert.equals('relationBucket', miss({ player: undefined }).join());
        assert.equals('worldPhase', miss({ holders: undefined }).join());
        assert.equals('interaction.eventId', miss({}, { generalId: 'g', contextKey: 'event-reaction' }).join());
        assert.equals('interaction.targetId,relationBucket', miss({}, { ...base, target: { kind: 'general', id: '' } }).join());
        assert.equals('personality,mood,relationBucket,worldPhase', miss({ personality: undefined, mind: undefined, player: undefined, holders: undefined }).join());
        assert.equals('scene,!contextKey', miss({}, { generalId: 'g', contextKey: 'nope' }).join());
        assert.equals('!scene', miss({}, { ...base, scene: 'battlefield' }).join());
        assert.equals('!personality', miss({ personality: 'Evil' }).join());
        assert.isFalse(buildDialogueRequest(base, source(), null).ok);
        assert.equals('OK', miss({}, { generalId: 'g', contextKey: 'event-reaction', eventId: 'ev-1' }).join());
    });

    suite.test('同一位武將對不同對象：好感、心情、bucket、快取鍵、interaction 都不同', () => {
        const src = source({ player: 70, mind: 'NORMAL', pair: { 'cao-cao': -80, 'liu-bei': 30 } });
        const toPlayer = buildDialogueRequest({ generalId: 'zhang-fei', contextKey: 'lobby-idle' }, src, RULES);
        const toEnemy = buildDialogueRequest({ generalId: 'zhang-fei', contextKey: 'lobby-idle', target: { kind: 'general', id: 'cao-cao', name: '曹操' } }, src, RULES);
        const toFriend = buildDialogueRequest({ generalId: 'zhang-fei', contextKey: 'lobby-idle', target: { kind: 'general', id: 'liu-bei', name: '劉備' } }, src, RULES);
        assert.isTrue(toPlayer.ok && toEnemy.ok && toFriend.ok);
        if (!toPlayer.ok || !toEnemy.ok || !toFriend.ok) return;
        assert.equals(4, toPlayer.relationBucket);
        assert.equals('joy', toPlayer.mood);
        assert.equals(0, toEnemy.relationBucket);
        assert.equals('anger', toEnemy.mood);
        assert.equals(3, toFriend.relationBucket);
        assert.equals('calm', toFriend.mood);
        assert.equals('cao-cao', toEnemy.request.interaction?.targetId);
        assert.equals('曹操', toEnemy.request.interaction?.targetName);
        assert.equals(3, new Set([toPlayer.cacheKey, toEnemy.cacheKey, toFriend.cacheKey]).size);
    });

    suite.test('規則檔與中台情境登錄一致：互動類型、場景合法，覆寫與反應用到的情境都已登錄', () => {
        const ctxKeys = Object.keys(RULES.contexts);
        assert.equals(52, ctxKeys.length);
        // 任務派出／返回三個觸發點（PROG-2-9966）：都已登錄，且不掛 actionContexts（不然友誼事件會多彈一次台詞）
        for (const k of ['mission-dispatch', 'mission-return', 'mission-return-bad']) {
            assert.isTrue(!!RULES.contexts[k], `${k} 未登錄`);
            assert.isTrue(!Object.values(RULES.actionContexts).includes(k), `${k} 不應掛在友誼事件反應上`);
        }
        for (const k of ctxKeys) {
            const c = RULES.contexts[k];
            assert.isTrue((DIALOGUE_INTERACTION_TYPES as readonly string[]).includes(c.interactionType), `${k} interactionType`);
            assert.isTrue(c.scenes.length > 0 && c.scenes.every((s) => (DIALOGUE_SCENES as readonly string[]).includes(s)), `${k} scenes`);
        }
        for (const row of RULES.contextOverrides) for (const k of row.contexts) assert.isTrue(!!RULES.contexts[k], `覆寫情境 ${k} 未登錄`);
        for (const k of Object.values(RULES.actionContexts)) assert.isTrue(!!RULES.contexts[k], `反應情境 ${k} 未登錄`);
        for (const k of RULES.jealousy.contexts) assert.isTrue(!!RULES.contexts[k], `吃醋情境 ${k} 未登錄`);
    });

    suite.test('事件記錄：窗內取最新、窗外忽略、對象分開記', () => {
        const log = new DialogueEventLog();
        log.record('a', { kind: 'player' }, 'x1', 10);
        log.record('a', { kind: 'player' }, 'x2', 11);
        log.record('a', { kind: 'general', id: 'b' }, 'p1', 11);
        assert.equals('x2', log.latest('a', { kind: 'player' }, 12, 2));
        assert.equals('p1', log.latest('a', { kind: 'general', id: 'b' }, 12, 2));
        assert.equals(null, log.latest('a', { kind: 'player' }, 20, 2));
        assert.equals(null, log.latest('z', { kind: 'player' }, 12, 2));
    });

    return suite;
}

function makeRequester(opts: { fail?: boolean; fallback?: boolean; f?: Fake } = {}) {
    const sent: NpcDialogueRequest[] = [];
    let n = 0;
    const clock = { now: 1000 };
    const requester = new DialogueRequester({
        port: {
            requestDialogue: async (req) => {
                sent.push(req);
                if (opts.fail) throw new Error('down');
                n += 1;
                return { generalId: req.generalId, text: `台詞${n}`, fallbackUsed: !!opts.fallback, evidenceRefs: [], usedKeywords: [], rejectedKeywordKeys: [], generationMode: 'x' } as NpcDialogueResponse;
            },
        },
        source: source(opts.f), rules: () => RULES, nowMs: () => clock.now, saveId: () => 'save-1',
    });
    return { requester, sent, clock };
}

export function createDialogueRequesterSuite(): TestSuite {
    const suite = new TestSuite('DialogueRequester／ReactionHub (本機快取與友誼事件反應 PROG-2-9964)');
    const input = { generalId: 'zhang-fei', contextKey: 'avatar-tap' };

    suite.test('參數不齊：不送請求，回 invalid 並列出缺項', async () => {
        const { requester, sent } = makeRequester({ f: { personality: undefined } });
        const r = await requester.fetch(input);
        assert.equals('invalid', r.kind);
        if (r.kind === 'invalid') assert.equals('personality', r.missing.join());
        assert.equals(0, sent.length);
        assert.equals(null, requester.peek(input));
    });

    suite.test('同情境累積到 linesPerKey 句後不再請求，之後輪流使用快取', async () => {
        const { requester, sent } = makeRequester();
        const n = RULES.cache.linesPerKey;
        for (let i = 0; i < n; i++) assert.equals(false, ((await requester.fetch(input)) as { fromCache: boolean }).fromCache);
        assert.equals(n, sent.length);
        const seen = new Set<string>();
        for (let i = 0; i < n * 2; i++) {
            const r = await requester.fetch(input);
            assert.equals('line', r.kind);
            if (r.kind === 'line') { assert.isTrue(r.fromCache); seen.add(r.text); }
        }
        assert.equals(n, sent.length);
        assert.equals(n, seen.size);
        assert.isTrue(requester.peek(input) !== null);
        assert.equals(2, sent[0].schemaVersion);
        assert.equals('save-1', sent[0].saveId);
    });

    suite.test('不同心情（或對象）是不同快取鍵：不會拿錯心情的句子', async () => {
        const a = makeRequester({ f: { mind: 'HIGH', player: 40 } });
        await a.requester.fetch(input);
        assert.isTrue(a.requester.peek(input) !== null);
        const b = makeRequester({ f: { mind: 'LOW', player: -70 } });
        assert.equals(null, b.requester.peek(input));
    });

    suite.test('中台降級句不入快取；請求失敗後冷卻期內不再重送', async () => {
        const fb = makeRequester({ fallback: true });
        assert.equals('fallback', ((await fb.requester.fetch(input)) as { reason: string }).reason);
        assert.equals(null, fb.requester.peek(input));
        const bad = makeRequester({ fail: true });
        assert.equals('network', ((await bad.requester.fetch(input)) as { reason: string }).reason);
        assert.equals('cooldown', ((await bad.requester.fetch(input)) as { reason: string }).reason);
        assert.equals(1, bad.sent.length);
        bad.clock.now += RULES.cache.failureCooldownMs + 1;
        await bad.requester.fetch(input);
        assert.equals(2, bad.sent.length);
    });

    suite.test('同鍵同時只送一個請求', async () => {
        const { requester, sent } = makeRequester();
        await Promise.all([requester.fetch(input), requester.fetch(input), requester.fetch(input)]);
        assert.equals(1, sent.length);
    });

    suite.test('友誼事件反應：對應情境才請求；未結算／配對事件不反應；節流與一波只反應一次', async () => {
        const { requester, sent, clock } = makeRequester();
        const log = new DialogueEventLog();
        const shown: string[] = [];
        const hub = new DialogueReactionHub({ requester, rules: () => RULES, log, season: () => 5, nowMs: () => clock.now, show: (g, t, c) => shown.push(`${g}:${c}:${t}`) });
        const ev = (actionId: string, extra: object = {}) => ({ generalId: 'zhang-fei', actionId, delta: 5, applied: true, newValue: 10, ...extra });
        assert.equals(false, await hub.onFriendshipApplied(ev('combat_main_commander')));
        assert.equals(false, await hub.onFriendshipApplied(ev('reward_grant_treasure', { applied: false })));
        assert.equals(false, await hub.onFriendshipApplied(ev('reward_grant_treasure', { targetId: 'liu-bei' })));
        assert.equals(0, sent.length);
        assert.equals(true, await hub.onFriendshipApplied(ev('combat_victory_together')));
        assert.equals('camp', sent[0].scene);
        assert.equals('battle_victory', sent[0].interaction?.type);
        assert.equals('zhang-fei:battle-victory:台詞1', shown[0]);
        // 同一波與最小間隔內不再反應
        assert.equals(false, await hub.onFriendshipApplied(ev('reward_grant_treasure')));
        clock.now += RULES.reaction.minIntervalMs + RULES.reaction.burstWindowMs + 1;
        assert.equals(true, await hub.onFriendshipApplied(ev('reward_grant_treasure')));
        assert.equals('gift_received', sent[1].interaction?.type);
        // 事件有記下來，之後閒聊心情有餘溫
        assert.equals('reward_grant_treasure', log.latest('zhang-fei', { kind: 'player' }, 5, 2));
    });

    suite.test('性別／年齡／自稱進請求與快取鍵（女將、老者與男將不共用台詞）', () => {
        const build = (voice?: { gender?: string; age?: number }) => buildDialogueRequest({ generalId: 'g1', contextKey: 'greeting' }, source({ voice }), RULES);
        const male = build({ gender: '男', age: 30 });
        const female = build({ gender: '女', age: 30 });
        const elder = build({ gender: '男', age: 65 });
        const kid = build({ gender: '女', age: 10 });
        const none = build(undefined);
        if (!male.ok || !female.ok || !elder.ok || !kid.ok || !none.ok) { assert.isTrue(false, '應建構成功'); return; }
        assert.equals('M', male.request.gender);
        assert.equals('某', male.request.selfPronoun);
        assert.equals('F', female.request.gender);
        assert.equals(30, female.request.age);
        assert.equals('本姑娘', female.request.selfPronoun);
        assert.equals('老夫', elder.request.selfPronoun);
        assert.equals('我', kid.request.selfPronoun);
        assert.equals('某', none.request.selfPronoun, '缺性別年齡視為男成年');
        assert.equals(undefined, none.request.age);
        assert.equals(4, new Set([male.cacheKey, female.cacheKey, elder.cacheKey, kid.cacheKey]).size, '四種聲線快取鍵各不同');
        assert.equals(male.cacheKey, none.cacheKey, '男成年與缺值同鍵');
    });

    return suite;
}
