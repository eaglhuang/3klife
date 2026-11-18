// @spec-source → 武將心智提案 §2.6 主動行為與頻率控制（PROG-2-9150 MIND-2）；使用者 2026-11-17 裁決：主動請求活躍（全隊每季 ≤6、同將同類冷卻 1 季）
/**
 * 武將主動請求的挑選與回應規則，純 TS，不依賴 cc。
 * 流程：每位武將先依「學習規則」列出有真實理由的候選（求封、請戰、雪恥、請罪、抱怨冷落、進言），
 * 用 NpcUtilityAI 五因子打分，再用同一季 seed 決定是否提出，最後套全隊上限與每將上限。
 * 所有隨機來自 mindHash(seed, 武將|種類)，與走訪順序無關，同存檔同季必得同結果。
 */
import { personalityTypeOf, personalityVector, type PersonalityVector } from './MindRules';
import { scoreInitiative, type NpcInitiativeKind } from '../systems/NpcUtilityAI';
import { mindHash } from './MindBarks';
import { bondsOf, latestEventWithTag, learnedTags } from './MindLearning';
import { citeOf, replyText, requestText, type AdviseVariant, type MindSlots } from './MindLineTemplates';
import {
    MIND_CONFIG,
    type MindContext,
    type MindEvent,
    type MindEventInput,
    type MindLedger,
    type MindMood,
    type MindRequest,
    type MindRequestKind,
} from './MindTypes';

/** 重大事件：求封、請戰 */
export function isMajorKind(kind: MindRequestKind): boolean {
    return kind === 'ASK_PROMOTE' || kind === 'ASK_BATTLE';
}

/** 提出後多久才能再提同類：冷卻 N 季＝隔 N 季後下一季才可再提；被駁回再乘倍數 */
export function nextAllowedAfterIssue(season: number): number {
    return season + 1 + MIND_CONFIG.request.sameKindCooldownSeasons;
}

export function nextAllowedAfterDenied(season: number): number {
    return season + 1 + MIND_CONFIG.request.sameKindCooldownSeasons * MIND_CONFIG.request.deniedCooldownFactor;
}

/** 重大請求（求封、請戰）獲准後，同類隔更久才會再提，避免剛答應又來要 */
export function nextAllowedAfterGrantedMajor(season: number): number {
    return season + 1 + MIND_CONFIG.request.sameKindCooldownSeasons * 3;
}

export interface RequestPlanInput {
    season: number;
    /** 這一季的單一種子（由外部亂數抽一次）；所有取捨由它與武將／種類雜湊決定 */
    seed: number;
    generalIds: readonly string[];
    events: Readonly<Record<string, readonly MindEvent[]>>;
    ledger: Readonly<Record<string, MindLedger>>;
    cooldowns: Readonly<Record<string, Readonly<Record<string, number>>>>;
    /** 目前信箱內未回應的請求 */
    pending: readonly MindRequest[];
    /** 本季已經提出的請求數（同季重複結算時扣掉名額） */
    issuedThisSeason: number;
    contextOf: (generalId: string) => MindContext;
    moodOf: (generalId: string, ctx: MindContext) => MindMood;
}

interface Candidate {
    generalId: string;
    kind: MindRequestKind;
    score: number;
    chance: number;
    roll: number;
    major: boolean;
    text: string;
    reasonCodes: string[];
    ref?: MindRequest['ref'];
}

function lastWithLabel(events: readonly MindEvent[], predicate: (e: MindEvent) => boolean): MindEvent | undefined {
    let best: MindEvent | undefined;
    for (const e of events) {
        if (!e.label || !predicate(e)) continue;
        if (!best || e.season >= best.season) best = e;
    }
    return best;
}

const WORK_KINDS: ReadonlySet<string> = new Set(['TASK_DONE', 'BATTLE_RESULT', 'DUEL']);

function slotsFor(name: string, extra: Record<string, string>): MindSlots {
    return { name, ...extra };
}

function seasonLabelOf(ctx: Readonly<MindContext>): ((season: number) => string) | undefined {
    return ctx.seasonLabel;
}

/** 求封走賜封、請戰走斬將／單挑；系統沒指定缺項時由性格決定：好戰者請戰、其餘求封 */
function majorKindOf(ctx: Readonly<MindContext>, vector: Readonly<PersonalityVector>): 'ASK_PROMOTE' | 'ASK_BATTLE' {
    const b = ctx.fame?.bottleneck;
    if (b === 'BESTOW') return 'ASK_PROMOTE';
    if (b === 'KILL' || b === 'DUEL') return 'ASK_BATTLE';
    return vector.bold + vector.whim * 0.3 > vector.warm + vector.prudent * 0.5 ? 'ASK_BATTLE' : 'ASK_PROMOTE';
}

/**
 * 列出所有武將本季的請求，已套提出機率、每將上限、全隊上限。
 * 回傳順序：重大優先，再依分數；同分用 seed 雜湊打破。
 */
export function planRequests(input: Readonly<RequestPlanInput>): MindRequest[] {
    const { season } = input;
    const candidates: Candidate[] = [];
    const pendingKey = new Set(input.pending.map(r => `${r.generalId}|${r.kind}`));
    const ids = [...input.generalIds].sort();
    for (const generalId of ids) {
        const ctx = input.contextOf(generalId);
        const general = ctx.general ?? { id: generalId };
        const name = ctx.nameOf?.(generalId) ?? general.name ?? generalId;
        const type = personalityTypeOf(ctx.general);
        const vector = personalityVector(general);
        const events = input.events[generalId] ?? [];
        const ledger = input.ledger[generalId];
        const mood = input.moodOf(generalId, ctx);
        const seasonLabel = seasonLabelOf(ctx);
        const add = (kind: MindRequestKind, urgency: number, build: () => { text: string; reasonCodes: string[]; ref?: MindRequest['ref'] }): void => {
            if (pendingKey.has(`${generalId}|${kind}`)) return;
            const nextAllowed = input.cooldowns[generalId]?.[kind];
            const score = scoreInitiative({
                kind: kind as NpcInitiativeKind, urgency, axes: vector, loyalty: ctx.loyalty, loyaltyLocked: ctx.loyaltyLocked,
                mood, nextAllowedSeason: nextAllowed, season,
            });
            if (score <= 0) return;
            const r = MIND_CONFIG.request;
            const chance = Math.min(r.chanceMax, r.chanceBase + r.chancePerScore * score);
            const roll = mindHash(input.seed, `${generalId}|${kind}`) / 0x100000000;
            if (roll >= chance) return;
            const built = build();
            candidates.push({ generalId, kind, score, chance, roll, major: isMajorKind(kind), ...built });
        };

        // 1. 求封／請戰：名聲已逼近下一階門檻
        const fame = ctx.fame;
        if (fame && fame.nextFame !== null && fame.nextFame > 0 && fame.fame >= fame.nextFame * MIND_CONFIG.request.fameAskRatio) {
            const kind = majorKindOf(ctx, vector);
            const won = lastWithLabel(events, e => WORK_KINDS.has(e.kind) && e.outcome === 'SUCCESS');
            const grudge = kind === 'ASK_BATTLE' ? ledger?.grudges[ledger.grudges.length - 1] : undefined;
            const duelLoss = grudge ? lastWithLabel(events, e => e.kind === 'DUEL' && e.outcome === 'FAIL' && e.partnerId === grudge) : undefined;
            const refEvent = duelLoss ?? won;
            const urgency = 1 + Math.max(0, fame.fame / fame.nextFame - MIND_CONFIG.request.fameAskRatio) * 3;
            add(kind, urgency, () => ({
                text: requestText(kind, type, slotsFor(name, {
                    cite: citeOf(refEvent?.label ?? '歷來功績', refEvent?.season, seasonLabel),
                    fame: String(fame.fame), next: String(fame.nextFame),
                    title: fame.nextTitle ?? '更高將階',
                    opponent: grudge ? (ctx.nameOf?.(grudge) ?? grudge) : '',
                }), input.seed, { grudge: Boolean(grudge && duelLoss) }),
                reasonCodes: [kind === 'ASK_BATTLE' ? 'FAME_NEAR_NEED_BATTLE' : 'FAME_NEAR_NEED_BESTOW', ...(grudge && duelLoss ? ['GRUDGE'] : [])],
                ref: { ...(refEvent?.label ? { label: refEvent.label, season: refEvent.season, eventId: refEvent.id } : {}), ...(grudge && duelLoss ? { partnerId: grudge } : {}) },
            }));
        }

        // 2. 雪恥（只有傾向雪恥的人才會）與謹慎者的進言
        const learned = learnedTags(ledger, events, type, vector);
        const redeem = learned.find(t => t.stance === 'REDEEM' && ledger?.redeemTag !== t.tag);
        if (redeem && redeem.label) {
            add('REDEEM', 1 + 0.25 * (redeem.streak - 2), () => ({
                text: requestText('REDEEM', type, slotsFor(name, { cite: citeOf(redeem.label, redeem.season, seasonLabel), n: String(redeem.streak) }), input.seed),
                reasonCodes: ['STREAK_LOSS', `TAG:${redeem.tag}`],
                ref: { label: redeem.label, season: redeem.season, ...(redeem.eventId ? { eventId: redeem.eventId } : {}) },
            }));
        }

        // 3. 請罪：忠厚型、上一季剛失手
        if (vector.warm >= 0.5) {
            const failed = lastWithLabel(events, e => e.kind === 'TASK_DONE' && e.outcome === 'FAIL' && e.valence <= -2 && season - e.season <= 1);
            if (failed) {
                add('APOLOGIZE', 1, () => ({
                    text: requestText('APOLOGIZE', type, slotsFor(name, { cite: citeOf(failed.label, failed.season, seasonLabel) }), input.seed),
                    reasonCodes: ['FAIL_SELF_BLAME', ...(failed.reason ? [failed.reason] : [])],
                    ref: { label: failed.label, season: failed.season, eventId: failed.id },
                }));
            }
        }

        // 4. 抱怨冷落
        const idle = ledger?.idleSeasons ?? 0;
        if (idle >= MIND_CONFIG.idleThresholdSeasons) {
            const lastJob = lastWithLabel(events, e => WORK_KINDS.has(e.kind));
            add('COMPLAIN_IDLE', 1 + Math.min(1, 0.2 * (idle - MIND_CONFIG.idleThresholdSeasons)), () => ({
                text: requestText('COMPLAIN_IDLE', type, slotsFor(name, { cite: citeOf(lastJob?.label, lastJob?.season, seasonLabel), n: String(idle) }), input.seed),
                reasonCodes: ['IDLE_SEASONS'],
                ref: lastJob ? { label: lastJob.label, season: lastJob.season, eventId: lastJob.id } : {},
            }));
        }

        // 5. 進言：謀略型才會（prudent 夠高），內容依最近經歷挑一款
        if (vector.prudent >= 0.4) {
            let variant: AdviseVariant | null = null;
            let cite = '';
            let n = 0;
            let ref: MindRequest['ref'] | undefined;
            let partnerName = '';
            const caution = learned.find(t => t.stance === 'CAUTIOUS' && t.label);
            const bond = bondsOf(ledger).find(b => ctx.nameOf?.(b.partnerId));
            const winning = Object.entries(ledger?.byTag ?? {}).find(([, s]) => s.win >= 3 && s.streakLoss === 0 && season - s.lastSeason <= 1);
            if (caution) {
                variant = 'CAUTION'; n = caution.streak; cite = citeOf(caution.label, caution.season, seasonLabel);
                ref = { label: caution.label, season: caution.season };
            } else if (idle >= MIND_CONFIG.idleThresholdSeasons) {
                const lastJob = lastWithLabel(events, e => WORK_KINDS.has(e.kind));
                variant = 'IDLE'; cite = citeOf(lastJob?.label, lastJob?.season, seasonLabel);
                ref = lastJob ? { label: lastJob.label, season: lastJob.season } : {};
            } else if (winning) {
                const e = latestEventWithTag(events, winning[0]);
                if (e) { variant = 'WINNING'; cite = citeOf(e.label, e.season, seasonLabel); ref = { label: e.label, season: e.season }; }
            } else if (bond) {
                const e = lastWithLabel(events, ev => WORK_KINDS.has(ev.kind) && ev.partnerId === bond.partnerId);
                variant = 'BOND'; n = bond.together; partnerName = ctx.nameOf?.(bond.partnerId) ?? '';
                cite = citeOf(e?.label, e?.season, seasonLabel); ref = { ...(e ? { label: e.label, season: e.season } : {}), partnerId: bond.partnerId };
            }
            if (variant) {
                const v = variant;
                add('ADVISE', 1, () => ({
                    text: requestText('ADVISE', type, slotsFor(name, { cite, n: String(n), partner: partnerName }), input.seed, { advise: v }),
                    reasonCodes: [`ADVISE_${v}`],
                    ...(ref ? { ref } : {}),
                }));
            }
        }
    }

    // 排序：重大優先 → 分數 → 雜湊打破同分
    candidates.sort((a, b) => Number(b.major) - Number(a.major) || b.score - a.score
        || mindHash(input.seed, `${a.generalId}|${a.kind}|tie`) - mindHash(input.seed, `${b.generalId}|${b.kind}|tie`));

    const teamRoom = Math.max(0, MIND_CONFIG.request.maxPerSeasonTeam - input.issuedThisSeason);
    const perGeneral = new Map<string, number>();
    const majorByGeneral = new Set<string>();
    let pendingCount = input.pending.length;
    const picked: MindRequest[] = [];
    for (const c of candidates) {
        if (picked.length >= teamRoom) break;
        if ((perGeneral.get(c.generalId) ?? 0) >= MIND_CONFIG.request.maxPerGeneralPerSeason) continue;
        if (c.major && majorByGeneral.has(c.generalId)) continue;
        if (!c.major && pendingCount >= MIND_CONFIG.request.pendingSoftCap) continue;
        perGeneral.set(c.generalId, (perGeneral.get(c.generalId) ?? 0) + 1);
        if (c.major) majorByGeneral.add(c.generalId);
        pendingCount += 1;
        picked.push({
            id: `mind-req:${season}:${c.generalId}:${c.kind}`,
            generalId: c.generalId,
            kind: c.kind,
            season,
            expiresSeason: season + MIND_CONFIG.request.expireAfterSeasons,
            status: 'PENDING',
            major: c.major,
            text: c.text,
            reasonCodes: c.reasonCodes,
            ...(c.ref ? { ref: c.ref } : {}),
            read: false,
        });
    }
    return picked;
}

/** 抗命信：只是一封信，不改任何任務規則；呼叫端自己決定要不要真的換人 */
export function buildDefyLetter(args: {
    generalId: string; name: string; season: number; seed: number; type: Parameters<typeof requestText>[1];
    refEvent?: MindEvent; seasonLabel?: (season: number) => string;
}): MindRequest {
    const cite = citeOf(args.refEvent?.label, args.refEvent?.season, args.seasonLabel);
    return {
        id: `mind-req:${args.season}:${args.generalId}:DEFY_LETTER`,
        generalId: args.generalId,
        kind: 'DEFY_LETTER',
        season: args.season,
        expiresSeason: args.season + MIND_CONFIG.request.expireAfterSeasons,
        status: 'PENDING',
        major: true,
        text: requestText('DEFY_LETTER', args.type, { name: args.name, cite }, args.seed),
        reasonCodes: ['DEFY_LOW_LOYALTY_INSULTED'],
        ref: args.refEvent ? { label: args.refEvent.label, season: args.refEvent.season, eventId: args.refEvent.id } : {},
        read: false,
    };
}

export interface RequestEffects {
    /** 要寫進心智的事件（冪等 id 已定） */
    events: MindEventInput[];
    reply: string;
    status: 'GRANTED' | 'DENIED' | 'ACKED';
    /** 被駁回時，同類冷卻改長 */
    denied: boolean;
    /** 雪恥獲准：之後同類成功加倍 */
    redeemTag?: string;
    /** 交給呼叫端的遊戲效果提示（目前遊戲只有名聲自動晉階，沒有賜封流程，所以只回提示） */
    hook?: 'PROMOTE_GRANTED' | 'BATTLE_GRANTED' | 'REDEEM_GRANTED';
}

/** 玩家答應或拒絕後，該寫哪些心智事件、武將怎麼回應。ADVISE 駁回只算「知道了」不傷感情；抗命信只能「知道了」。 */
export function effectsOfResolution(request: Readonly<MindRequest>, accept: boolean, season: number, ctx: Readonly<MindContext>, seed: number): RequestEffects {
    const type = personalityTypeOf(ctx.general);
    const name = ctx.nameOf?.(request.generalId) ?? ctx.general?.name ?? request.generalId;
    const cite = citeOf(request.ref?.label, request.ref?.season, ctx.seasonLabel);
    const slots: MindSlots = { name, cite };
    const base = { generalId: request.generalId, season };
    const rid = (suffix: string): string => `${request.id}:${suffix}`;
    const tagCode = request.reasonCodes.find(c => c.startsWith('TAG:'));
    const events: MindEventInput[] = [];
    let status: RequestEffects['status'] = accept ? 'GRANTED' : 'DENIED';
    let denied = !accept;
    let hook: RequestEffects['hook'];
    let redeemTag: string | undefined;
    switch (request.kind) {
        case 'ASK_PROMOTE':
            if (accept) {
                events.push({ ...base, kind: 'REQUEST_GRANTED', label: '賜封', tags: ['req:promote'], id: rid('grant') });
                events.push({ ...base, kind: 'PROMOTED', label: '賜封', tags: ['req:promote'], id: rid('promoted') });
                hook = 'PROMOTE_GRANTED';
            } else events.push({ ...base, kind: 'REQUEST_DENIED', label: '求封', tags: ['req:promote'], id: rid('deny') });
            break;
        case 'ASK_BATTLE':
            events.push(accept
                ? { ...base, kind: 'REQUEST_GRANTED', label: '請戰', tags: ['req:battle'], id: rid('grant') }
                : { ...base, kind: 'REQUEST_DENIED', label: '請戰', tags: ['req:battle'], id: rid('deny') });
            if (accept) hook = 'BATTLE_GRANTED';
            break;
        case 'REDEEM':
            events.push(accept
                ? { ...base, kind: 'REQUEST_GRANTED', label: '雪恥', tags: ['req:redeem'], id: rid('grant') }
                : { ...base, kind: 'REQUEST_DENIED', label: '雪恥', tags: ['req:redeem'], id: rid('deny') });
            if (accept && tagCode) { redeemTag = tagCode.slice(4); hook = 'REDEEM_GRANTED'; }
            break;
        case 'APOLOGIZE':
            // 寬慰＝稱讚；責備＝被罵（只傷心情，不扣忠誠與資源）
            events.push(accept
                ? { ...base, kind: 'PRAISED', label: '寬慰', tags: ['req:apologize'], id: rid('praise') }
                : { ...base, kind: 'SCOLDED', label: '責備', tags: ['req:apologize'], id: rid('scold') });
            denied = false;
            break;
        case 'COMPLAIN_IDLE':
            events.push(accept
                ? { ...base, kind: 'PRAISED', label: '安撫', tags: ['req:complain'], id: rid('praise') }
                : { ...base, kind: 'PASSED_OVER', label: '不理', tags: ['req:complain'], id: rid('ignore') });
            denied = !accept;
            break;
        case 'ADVISE':
            if (accept) events.push({ ...base, kind: 'REQUEST_GRANTED', label: '進言', tags: ['req:advise'], id: rid('grant') });
            else status = 'ACKED';
            denied = false;
            break;
        case 'DEFY_LETTER':
            status = 'ACKED';
            denied = false;
            break;
    }
    return {
        events,
        reply: replyText(request.kind, accept && request.kind !== 'DEFY_LETTER', type, slots, seed),
        status,
        denied,
        ...(redeemTag ? { redeemTag } : {}),
        ...(hook ? { hook } : {}),
    };
}

/** 作廢時對方「被無視」：只有需要回應的請求才算（進言與抗命信不算） */
export function expiryIgnoresPlayer(kind: MindRequestKind): boolean {
    return kind !== 'ADVISE' && kind !== 'DEFY_LETTER';
}
