// @spec-source → 劇情（演出）系統 Base 框架規格書 (doc_spec_1188) §4 規則 1／2、§11 伺服器 API；共用框架總綱 (doc_spec_1182) §5.4 冪等、§5.5 權威、§12 STY-M；PROG-2-9208
/**
 * StoryCommands — 劇情命令（story.trigger／choose 與 available／pending／seen／flags 查詢）在本機 adapter 的處理器。
 *
 * 劇本走到哪、後果怎麼算都在這層：玩法只送「觸發哪份劇本（＋實例去重鍵）、選了哪個選項」。
 * 流程：trigger 把劇本從起點走到第一個「要玩家選」的 choice 節點（沿途 scene 的演出指令累積進回應、
 * effects 先結算、branch 依條件分支），遇到 end 就當場完成（寫已看）；停在 choice 的劇本進打斷佇列保存，
 * 重開遊戲後 story.pending 還能把它找回來重新彈出（規格 §11.6「先存後顯示、重開自愈」）。
 * choose 驗選項合法、結算後果再往下走；選項後果的獎懲全交 reward.claim（grantKey 去重），旗標寫進 StoryMeta，
 * 其他種類由宿主 registerEffect 掛 handler。整筆成功才把新的 meta 寫回，失敗不留下半套狀態。
 * 純邏輯，不 import cc。
 */
import type {
    StoryAvailableEntry, StoryChooseResult, StoryCueView, StoryEffectResult, StoryPendingResult, StorySeenResult,
    StoryStepView, StoryTriggerResult,
} from '../../../shared/api/ApiCommands';
import { ApiError } from '../../../shared/api/ApiErrors';
import { ConditionError, createConditionEvaluator, type Condition, type ConditionFacts } from '../../../shared/foundation/Condition';
import {
    findStory, type StoryChoiceNode, type StoryConfigV1, type StoryDef, type StoryEffectDef, type StoryOptionDef,
} from '../../../shared/story/StoryConfig';
import {
    flagValue, instanceIdOf, orderedQueue, STORY_DONE_LIMIT,
    type StoryInstance, type StoryMeta,
} from '../../../shared/story/StoryRules';
import type { HandlerOutcome, LocalApiAdapter } from './LocalApiAdapter';

/** 權威端的劇情狀態存放 port：單機由 GameSession 實作（存檔欄位 storyMeta）；連線時由伺服器取代 */
export interface StoryAuthority {
    meta(): StoryMeta;
    setMeta(meta: StoryMeta): void;
}

export interface StoryEffectEnv {
    storyId: string;
    instanceId: string;
    nodeId: string;
    /** 呼叫其他命令層（reward.claim…）；不得繞過它直接改數值 */
    invoke: LocalApiAdapter['invoke'];
}

export interface StoryEffectOutcome {
    detail?: Record<string, unknown>;
    events?: Array<{ evt: string; data?: unknown }>;
}

/** 宿主自訂效果種類（任務生成、技能習得、物品…）：不認識的種類由這裡接，框架不改 */
export type StoryEffectHandler = (effect: StoryEffectDef, env: StoryEffectEnv) => Promise<StoryEffectOutcome | void> | StoryEffectOutcome | void;

export interface StoryPorts {
    authority: StoryAuthority | null;
    config: StoryConfigV1;
    /** 條件評估用的事實（數值、持有物、官職階位）；旗標與已看紀錄由劇情自己補，這裡不必給 */
    facts?: () => ConditionFacts;
    handlers?: Readonly<Record<string, StoryEffectHandler>>;
}

const TRIGGER_ARGS = ['storyId', 'refId', 'options'];
const CHOOSE_ARGS = ['storyId', 'refId', 'choiceId', 'optionId'];
/** 單次走訪的節點數上限，防資料寫出無窮迴圈 */
const MAX_STEPS = 64;

function requireText(value: unknown, field: string): string {
    if (typeof value !== 'string' || value.length === 0) throw new ApiError('INVALID_SCHEMA', `${field} 不可為空`);
    return value;
}

/** 只收意圖欄位；多帶的一律當作想夾帶結果（規格 §11.3：effects／flags／next → E103） */
function rejectExtra(args: Record<string, unknown>, allowed: readonly string[]): void {
    const extra = Object.keys(args).find((k) => allowed.indexOf(k) < 0);
    if (extra) throw new ApiError('FORBIDDEN_FIELD', `命令不得帶欄位 ${extra}`);
}

function refIdOf(value: unknown): string {
    if (value === undefined) return '';
    if (typeof value !== 'string') throw new ApiError('INVALID_SCHEMA', 'refId 必須是字串');
    return value;
}

export function registerStoryCommands(adapter: LocalApiAdapter, getPorts: () => StoryPorts): void {
    const authorityOf = (): StoryAuthority => {
        const authority = getPorts().authority;
        if (!authority) throw new ApiError('STORY_UNAVAILABLE', '劇情系統尚未就緒');
        return authority;
    };

    const storyOf = (storyId: string): StoryDef => {
        const story = findStory(getPorts().config, storyId);
        if (!story) throw new ApiError('STORY_NOT_FOUND', `找不到劇本 ${storyId}`);
        return story;
    };

    /** 條件評估：旗標與已看紀錄取自傳入的 meta（走訪中旗標會變，所以每次用當下的 meta）；設定錯誤視為不成立並記 log */
    const evaluate = (condition: Condition | null, meta: StoryMeta): boolean => {
        if (condition === null) return true;
        const base = getPorts().facts ? getPorts().facts!() : {};
        const facts: ConditionFacts = { ...base, getFlag: (key) => flagValue(meta, key) };
        try {
            return createConditionEvaluator().evaluate(condition, facts);
        } catch (error) {
            if (error instanceof ConditionError) {
                console.warn(`[Story] 條件設定錯誤，視為不成立：${error.message}`);
                return false;
            }
            throw error;
        }
    };

    /** 選擇節點可選的選項（條件不成立的選項不列出；hostOptions 用宿主帶入的 id） */
    const optionsOf = (node: StoryChoiceNode, hostOptions: readonly string[], meta: StoryMeta): Array<{ id: string; textKey: string | null; next: string }> => {
        if (node.hostOptions) return hostOptions.map((id) => ({ id, textKey: null, next: node.hostNext as string }));
        return node.options.filter((o: StoryOptionDef) => evaluate(o.condition, meta)).map((o) => ({ id: o.id, textKey: o.textKey, next: o.next }));
    };

    const stepView = (story: StoryDef, instance: StoryInstance, meta: StoryMeta): StoryStepView => {
        const node = story.nodes[instance.nodeId];
        const choice = node && node.type === 'choice'
            ? { choiceId: instance.nodeId, options: optionsOf(node, instance.hostOptions, meta).map((o) => ({ id: o.id, textKey: o.textKey })) }
            : null;
        return {
            storyId: story.id, instanceId: instance.instanceId, cues: instance.cues.map((c) => ({ ...c })),
            choice, skippable: story.skippable,
        };
    };

    interface Walk {
        meta: StoryMeta;
        cues: StoryCueView[];
        effects: StoryEffectResult[];
        events: Array<{ evt: string; data?: unknown }>;
        /** 停在哪個 choice 節點；null＝走到 end */
        stopAt: string | null;
    }

    /** 套用單一效果：reward 走 reward.claim、flag 寫 meta、其餘交宿主 handler */
    const applyEffect = async (
        effect: StoryEffectDef, env: StoryEffectEnv, walk: Walk, index: number,
    ): Promise<void> => {
        if (effect.kind === 'reward') {
            const grantKey = `story:${env.instanceId}:${env.nodeId}:${index}`;
            const out = await env.invoke('reward.claim', {
                bundleId: String(effect.ref), grantKey, source: { kind: 'story', ref: env.storyId },
            });
            const res = out.result as { grantId: string; replayed: boolean };
            walk.effects.push({ kind: 'reward', nodeId: env.nodeId, detail: { bundleId: effect.ref, grantId: res.grantId, settled: true } });
            if (out.events) walk.events.push(...out.events);
            return;
        }
        if (effect.kind === 'flag') {
            const key = String(effect.set);
            const value = effect.value !== false;
            walk.meta = { ...walk.meta, flags: { ...walk.meta.flags, [key]: value } };
            walk.effects.push({ kind: 'flag', nodeId: env.nodeId, detail: { key, value } });
            walk.events.push({ evt: 'story.flag', data: { key, value } });
            return;
        }
        const handler = (getPorts().handlers ?? {})[effect.kind];
        if (!handler) throw new ApiError('STORY_EFFECT_UNSUPPORTED', `沒有 ${effect.kind} 效果的 handler`);
        const out = (await handler(effect, env)) ?? {};
        walk.effects.push({ kind: effect.kind, nodeId: env.nodeId, detail: out.detail ?? {} });
        if (out.events) walk.events.push(...out.events);
    };

    /** 從某節點往下走到下一個 choice 或 end；effects 節點會先結算（失敗整筆丟 E347） */
    const walkFrom = async (story: StoryDef, instance: StoryInstance, fromNode: string, meta: StoryMeta): Promise<Walk> => {
        const walk: Walk = { meta, cues: [], effects: [], events: [], stopAt: null };
        let nodeId = fromNode;
        for (let step = 0; step < MAX_STEPS; step++) {
            const node = story.nodes[nodeId];
            switch (node.type) {
            case 'scene':
                walk.cues.push(...node.cues.map((c) => ({ ...c })));
                nodeId = node.next;
                break;
            case 'branch':
                nodeId = evaluate(node.when, walk.meta) ? node.then : node.else;
                break;
            case 'effects': {
                const env: StoryEffectEnv = {
                    storyId: story.id, instanceId: instance.instanceId, nodeId, invoke: (name, args) => adapter.invoke(name, args),
                };
                try {
                    for (let i = 0; i < node.effects.length; i++) await applyEffect(node.effects[i], env, walk, i);
                } catch (error) {
                    if (error instanceof ApiError && error.def.code === 'E346') throw error;
                    const reason = error instanceof ApiError ? `${error.def.code} ${error.message}` : (error instanceof Error ? error.message : String(error));
                    throw new ApiError('STORY_EFFECT_FAILED', `劇情後果結算失敗，整筆不生效：${reason}`);
                }
                nodeId = node.next;
                break;
            }
            case 'choice':
                walk.stopAt = nodeId;
                return walk;
            default:
                return walk;
            }
        }
        throw new ApiError('STORY_EFFECT_FAILED', `劇本 ${story.id} 走訪超過 ${MAX_STEPS} 步，疑似迴圈`);
    };

    /** 完成：寫已看、搬出佇列、記入已完成實例（冪等） */
    const finish = (meta: StoryMeta, story: StoryDef, instance: StoryInstance, nowMs: number, result: Record<string, unknown>): StoryMeta => {
        const lastChoice = Object.values(instance.choices).pop() ?? null;
        const prev = meta.seen[story.id];
        const done = [...meta.done, { instanceId: instance.instanceId, storyId: story.id, choices: { ...instance.choices }, result }].slice(-STORY_DONE_LIMIT);
        return {
            ...meta,
            queue: meta.queue.filter((q) => q.instanceId !== instance.instanceId),
            seen: { ...meta.seen, [story.id]: { at: nowMs, count: (prev?.count ?? 0) + 1, choice: lastChoice } },
            done,
        };
    };

    adapter.register('story.trigger', async (args, ctx) => {
        rejectExtra(args, TRIGGER_ARGS);
        const storyId = requireText(args.storyId, 'storyId');
        const refId = refIdOf(args.refId);
        const story = storyOf(storyId);
        const hostOptions = args.options === undefined ? [] : args.options;
        if (!Array.isArray(hostOptions) || hostOptions.some((o) => typeof o !== 'string' || o.length === 0)) {
            throw new ApiError('INVALID_SCHEMA', 'options 必須是非空字串陣列');
        }
        const instanceId = instanceIdOf(storyId, refId);
        const meta = authorityOf().meta();

        const queued = meta.queue.find((q) => q.instanceId === instanceId);
        const doneRec = meta.done.find((d) => d.instanceId === instanceId);
        if (queued || doneRec) {
            // 同實例重送：回原狀態，不再走一遍
            const order = orderedQueue(meta.queue);
            if (queued) {
                const position = order.findIndex((q) => q.instanceId === instanceId);
                const view = stepView(story, queued, meta);
                const result: StoryTriggerResult = { ...view, status: position === 0 ? 'active' : 'queued', queuePosition: position, replayed: true };
                return { result };
            }
            const view = (doneRec!.result.trigger ?? { storyId, instanceId, cues: [], choice: null, skippable: story.skippable }) as StoryStepView;
            return { result: { ...view, status: 'completed', queuePosition: -1, replayed: true } as StoryTriggerResult };
        }
        if (!story.repeatable && meta.seen[storyId]) throw new ApiError('STORY_NOT_TRIGGERABLE', `劇本 ${storyId} 已看過且不可重看`);
        if (!evaluate(story.trigger.when, meta)) throw new ApiError('STORY_NOT_TRIGGERABLE', `劇本 ${storyId} 觸發條件不符`);

        const seq = meta.seq + 1;
        const instance: StoryInstance = {
            instanceId, storyId, refId, seq, priority: story.priority, interrupt: story.interrupt,
            nodeId: story.start, hostOptions: [...hostOptions] as string[], cues: [], choices: {},
        };
        const walk = await walkFrom(story, instance, story.start, { ...meta, seq });
        instance.cues = walk.cues;
        const events = [...walk.events];
        if (walk.stopAt === null) {
            // 無需選擇：當場完成
            const view: StoryStepView = { storyId, instanceId, cues: walk.cues, choice: null, skippable: story.skippable };
            const next = finish(walk.meta, story, instance, ctx.nowMs, { trigger: view, completed: true });
            authorityOf().setMeta(next);
            events.push({ evt: 'story.completed', data: { storyId, instanceId } });
            const result: StoryTriggerResult = { ...view, status: 'completed', queuePosition: -1, replayed: false };
            return { result, events };
        }
        instance.nodeId = walk.stopAt;
        const withQueue: StoryMeta = { ...walk.meta, queue: [...walk.meta.queue, instance] };
        authorityOf().setMeta(withQueue);
        const order = orderedQueue(withQueue.queue);
        const position = order.findIndex((q) => q.instanceId === instanceId);
        if (story.interrupt) events.push({ evt: 'story.interrupt', data: { storyId, instanceId, active: position === 0 } });
        events.push({ evt: 'story.available', data: { storyId, instanceId } });
        const result: StoryTriggerResult = {
            ...stepView(story, instance, withQueue), status: position === 0 ? 'active' : 'queued', queuePosition: position, replayed: false,
        };
        return { result, events };
    });

    adapter.register('story.choose', async (args, ctx) => {
        rejectExtra(args, CHOOSE_ARGS);
        const storyId = requireText(args.storyId, 'storyId');
        const choiceId = requireText(args.choiceId, 'choiceId');
        const optionId = requireText(args.optionId, 'optionId');
        const refId = refIdOf(args.refId);
        const story = storyOf(storyId);
        const instanceId = instanceIdOf(storyId, refId);
        const meta = authorityOf().meta();

        const doneRec = meta.done.find((d) => d.instanceId === instanceId);
        if (doneRec) {
            // 已完成：同一個選擇回原結果（冪等），不同的選擇是 E344
            if (doneRec.choices[choiceId] === optionId) {
                return { result: { ...(doneRec.result.choose as StoryChooseResult ?? {}), replayed: true } };
            }
            throw new ApiError('STORY_CHOICE_ALREADY_MADE', `劇本 ${storyId} 的選擇 ${choiceId} 已做過`);
        }
        const instance = meta.queue.find((q) => q.instanceId === instanceId);
        if (!instance) throw new ApiError('STORY_NOT_STARTED', `劇本 ${storyId}（${refId}）尚未觸發或已不在佇列`);
        if (instance.choices[choiceId] !== undefined) {
            if (instance.choices[choiceId] === optionId) {
                // 進行中重送同一選擇：回目前下一段（等於原結果）
                const result: StoryChooseResult = {
                    storyId, instanceId, choiceId, selectedOptionId: optionId, completed: false,
                    next: stepView(story, instance, meta), effects: [], replayed: true,
                };
                return { result };
            }
            throw new ApiError('STORY_CHOICE_ALREADY_MADE', `劇本 ${storyId} 的選擇 ${choiceId} 已做過`);
        }
        if (instance.nodeId !== choiceId) throw new ApiError('STORY_NOT_STARTED', `劇本目前停在 ${instance.nodeId}，不是 ${choiceId}`);
        const head = orderedQueue(meta.queue)[0];
        if (head.instanceId !== instanceId) {
            throw new ApiError('STORY_QUEUE_CONFLICT', `需先處理 ${head.storyId}（${head.instanceId}）`);
        }
        const node = story.nodes[choiceId];
        if (!node || node.type !== 'choice') throw new ApiError('STORY_INVALID_OPTION', `${choiceId} 不是選擇節點`);
        const option = optionsOf(node, instance.hostOptions, meta).find((o) => o.id === optionId);
        if (!option) throw new ApiError('STORY_INVALID_OPTION', `選項 ${optionId} 不存在或目前不可選`);

        const choices = { ...instance.choices, [choiceId]: optionId };
        const progressed: StoryInstance = { ...instance, choices };
        const walk = await walkFrom(story, progressed, option.next, meta);
        const events = [...walk.events];
        if (walk.stopAt === null) {
            const view: StoryStepView = { storyId, instanceId, cues: walk.cues, choice: null, skippable: story.skippable };
            const result: StoryChooseResult = {
                storyId, instanceId, choiceId, selectedOptionId: optionId, completed: true,
                next: walk.cues.length > 0 ? view : null, effects: walk.effects, replayed: false,
            };
            const next = finish(walk.meta, story, progressed, ctx.nowMs, { completed: true, choose: result });
            authorityOf().setMeta(next);
            events.push({ evt: 'story.completed', data: { storyId, instanceId, selectedOptionId: optionId } });
            return { result, events };
        }
        const advanced: StoryInstance = { ...progressed, nodeId: walk.stopAt, cues: walk.cues };
        const withQueue: StoryMeta = { ...walk.meta, queue: walk.meta.queue.map((q) => (q.instanceId === instanceId ? advanced : q)) };
        authorityOf().setMeta(withQueue);
        const result: StoryChooseResult = {
            storyId, instanceId, choiceId, selectedOptionId: optionId, completed: false,
            next: stepView(story, advanced, withQueue), effects: walk.effects, replayed: false,
        };
        return { result, events };
    });

    adapter.register('story.available', () => {
        const meta = authorityOf().meta();
        const entries: StoryAvailableEntry[] = getPorts().config.stories
            .filter((s) => (s.repeatable || !meta.seen[s.id]) && evaluate(s.trigger.when, meta))
            .sort((a, b) => (a.interrupt !== b.interrupt ? (a.interrupt ? -1 : 1) : b.priority - a.priority))
            .map((s) => ({ storyId: s.id, kind: s.kind, priority: s.priority, interrupt: s.interrupt }));
        return { result: { stories: entries } };
    });

    adapter.register('story.pending', () => {
        const meta = authorityOf().meta();
        const queue: StoryPendingResult['queue'] = [];
        for (const instance of orderedQueue(meta.queue)) {
            const story = findStory(getPorts().config, instance.storyId);
            if (!story) continue;
            queue.push({ ...stepView(story, instance, meta), priority: instance.priority, interrupt: instance.interrupt });
        }
        return { result: { queue } };
    });

    adapter.register('story.seen', (args) => {
        const storyId = requireText(args.storyId, 'storyId');
        const rec = authorityOf().meta().seen[storyId];
        const result: StorySeenResult = { storyId, seen: rec !== undefined, count: rec?.count ?? 0, lastChoice: rec?.choice ?? null, at: rec?.at ?? 0 };
        return { result };
    });

    adapter.register('story.flags', () => ({ result: { flags: { ...authorityOf().meta().flags } } }));
}
