// @spec-source → 子嗣五歲抓周揭曉與及冠入學直通學府代際傳承規格書.md (doc_spec_1172)；PROG-2-2204（LOOP-04）
/**
 * LineageMilestones — 子嗣代際傳承里程碑：五歲抓周、十五歲及冠入學、先祖教官推薦（純邏輯，不依賴 cc）。
 *
 * - 抓周（規格 §二-1）：既有的 5 歲開獎（Unveiling）揭曉五維後排入抓周；三選一，兩項屬性 ×1.1（上限 100），
 *   寫入志向與性格偏向。每位子嗣只能抓一次。
 * - 及冠（規格 §二-3）：已開獎的子嗣年齡跨過 15 歲時排入通知，玩家可「送入學府」直接打開培育並選好該子嗣。
 * - 隊列（規格 §三-1）：同季多位子嗣依序逐一處理，不遺漏；存檔保留。
 * - 先祖教官（規格 §二-3）：教官卡來源武將是該子嗣的直系血親（父母、祖父母、曾祖父母）就算先祖，編成時置頂並標記。
 *
 * 暫定（可逆）：
 * - 性格偏向：木劍→剛毅（Brave）、竹簡→沉穩（Wise）、玉珮→仁德（Loyal）。
 * - 初始戰法傾向、少主頭像邊框只記志向，不解鎖戰法、不換邊框。
 * - 及冠通知選「稍後」就移出隊列，之後從大廳「開獎・培育」照常進學府。
 *
 * Unity 對照：像生命週期事件的 ScriptableObject 表，加上換季時呼叫一次的偵測函式。
 */
import type { GeneralPersonalityType } from '../models/GeneralUnit';
import type { MentorCard } from '../models/MentorCard';

export const LINEAGE_TUNING = Object.freeze({
    graspAge: 5,
    comingOfAgeAge: 15,
    graspMultiplier: 1.1,
    statCap: 100,
    ancestorDepth: 3,
});

export type GraspItemId = 'WOODEN_SWORD' | 'BAMBOO_SLIP' | 'JADE_PENDANT';
export type GraspStatKey = 'str' | 'lea' | 'int' | 'pol' | 'cha' | 'luk';

export interface GraspItemDef {
    id: GraspItemId;
    label: string;
    aspiration: string;
    stats: readonly [GraspStatKey, GraspStatKey];
    personality: GeneralPersonalityType;
    note: string;
}

export const GRASP_ITEMS: readonly GraspItemDef[] = Object.freeze([
    { id: 'WOODEN_SWORD', label: '抓木劍', aspiration: '尚武雄豪', stats: ['str', 'lea'], personality: 'Brave', note: '武力、統率 +10%，性格偏剛毅' },
    { id: 'BAMBOO_SLIP', label: '抓竹簡', aspiration: '博學文雅', stats: ['int', 'pol'], personality: 'Wise', note: '智力、政治 +10%，性格偏沉穩' },
    { id: 'JADE_PENDANT', label: '抓玉珮', aspiration: '經世通達', stats: ['cha', 'luk'], personality: 'Loyal', note: '魅力、運氣 +10%，性格偏仁德' },
]);

export function graspItemDef(id: GraspItemId | string | undefined): GraspItemDef | undefined {
    return GRASP_ITEMS.find((item) => item.id === id);
}

export type LineageMilestoneKind = 'grasp' | 'coming-of-age';

export interface LineageMilestone {
    kind: LineageMilestoneKind;
    generalId: string;
    season: number;
}

/** 抓周、及冠會用到的武將欄位 */
export interface LineageGeneral {
    id: string;
    name?: string;
    age?: number;
    status?: string;
    fatherId?: string;
    motherId?: string;
    unveiledSeason?: number;
    fate?: unknown;
    graspItem?: GraspItemId;
    aspiration?: string;
    personality?: { type: GeneralPersonalityType; description?: string };
    stats?: Partial<Record<GraspStatKey, number>>;
    dualLayerStats?: Partial<Record<GraspStatKey, { base?: number; current?: number } & Record<string, unknown>>>;
}

function isDead(general: { status?: string }): boolean {
    return (general.status ?? '').toLowerCase() === 'dead';
}

function boost(value: number): number {
    return Math.min(LINEAGE_TUNING.statCap, Math.round(value * LINEAGE_TUNING.graspMultiplier));
}

/** 套用抓周：兩項屬性（頂層、stats、dualLayerStats 有值者）×1.1，寫入志向與性格偏向；已抓過時原樣回傳 null */
export function applyGraspChoice<T extends LineageGeneral>(general: T, itemId: GraspItemId): T | null {
    const def = graspItemDef(itemId);
    if (!def || general.graspItem) return null;
    const next: T = { ...general, graspItem: def.id, aspiration: def.aspiration, personality: { type: def.personality } };
    const record = next as unknown as Record<string, unknown>;
    const stats = general.stats ? { ...general.stats } : undefined;
    const layers = general.dualLayerStats ? { ...general.dualLayerStats } : undefined;
    for (const key of def.stats) {
        const top = (general as unknown as Record<string, unknown>)[key];
        if (typeof top === 'number') record[key] = boost(top);
        if (stats && typeof stats[key] === 'number') stats[key] = boost(stats[key] as number);
        const layer = layers?.[key];
        if (layers && layer) {
            layers[key] = {
                ...layer,
                ...(typeof layer.base === 'number' ? { base: boost(layer.base) } : {}),
                ...(typeof layer.current === 'number' ? { current: boost(layer.current) } : {}),
            };
        }
    }
    if (stats) next.stats = stats;
    if (layers) next.dualLayerStats = layers;
    return next;
}

/** 這季跨過 15 歲的已開獎子嗣（換季前後名冊比對；陣亡者不算） */
export function comingOfAgeCrossings(before: readonly LineageGeneral[], after: readonly LineageGeneral[]): string[] {
    const previous = new Map(before.map((g) => [g.id, g.age]));
    return after
        .filter((g) => !isDead(g) && (g.unveiledSeason !== undefined || g.fate !== undefined))
        .filter((g) => {
            const was = previous.get(g.id);
            return typeof was === 'number' && typeof g.age === 'number' && was < LINEAGE_TUNING.comingOfAgeAge && g.age >= LINEAGE_TUNING.comingOfAgeAge;
        })
        .map((g) => g.id);
}

/** 加進隊列：同一位同一種只留一筆 */
export function enqueueLineageMilestones(queue: readonly LineageMilestone[], items: readonly LineageMilestone[]): LineageMilestone[] {
    const next = queue.map((m) => ({ ...m }));
    for (const item of items) {
        if (!next.some((m) => m.kind === item.kind && m.generalId === item.generalId)) next.push({ ...item });
    }
    return next;
}

/** 隊首仍有效的里程碑；陣亡、離開名冊、已抓過周的會被略過（由呼叫端丟棄） */
export function isMilestoneValid(milestone: LineageMilestone, roster: readonly LineageGeneral[]): boolean {
    const general = roster.find((g) => g.id === milestone.generalId);
    if (!general || isDead(general)) return false;
    if (milestone.kind === 'grasp') return !general.graspItem;
    return true;
}

export function milestoneTitle(milestone: LineageMilestone, name: string): string {
    return milestone.kind === 'grasp'
        ? `【抓周揭曉】${name}年滿五歲，族長引導抓周`
        : `【及冠入學】${name}年滿十五，已至入學府深造之齡！`;
}

export function milestoneDesc(milestone: LineageMilestone): string {
    return milestone.kind === 'grasp'
        ? '府中鋪開錦席，擺上小木劍、小竹簡、青玉珮三件物件，看看孩子伸手抓向哪一樣。'
        : '少主已長成，學府三十六回合的修業正等著他；家中退役的先祖教官會優先列在導師名單最上方。';
}

/** 直系血親 id（父母、祖父母…到 ancestorDepth 代）；名冊與教官卡快照都會查 */
export function ancestorIdsOf(
    child: Pick<LineageGeneral, 'fatherId' | 'motherId'>, roster: readonly LineageGeneral[], cards: readonly MentorCard[],
): Set<string> {
    const parentsOf = (id: string): string[] => {
        const member = roster.find((g) => g.id === id);
        if (member) return [member.fatherId, member.motherId].filter((p): p is string => typeof p === 'string' && p.length > 0);
        const card = cards.find((c) => c.sourceGeneralId === id);
        const snapshot = card?.generalSnapshot as unknown as Pick<LineageGeneral, 'fatherId' | 'motherId'> | undefined;
        const fromSnapshot = [snapshot?.fatherId, snapshot?.motherId];
        return [...(card?.parentUids ?? []), ...fromSnapshot].filter((p): p is string => typeof p === 'string' && p.length > 0);
    };
    const result = new Set<string>();
    let layer = [child.fatherId, child.motherId].filter((p): p is string => typeof p === 'string' && p.length > 0);
    for (let depth = 0; depth < LINEAGE_TUNING.ancestorDepth && layer.length > 0; depth++) {
        const nextLayer: string[] = [];
        for (const id of layer) {
            if (result.has(id)) continue;
            result.add(id);
            nextLayer.push(...parentsOf(id));
        }
        layer = nextLayer;
    }
    return result;
}

/** 教官卡是不是這位子嗣的先祖 */
export function isAncestorMentor(card: MentorCard, ancestors: ReadonlySet<string>): boolean {
    return ancestors.has(card.sourceGeneralId);
}

/** 先祖教官排前面（保持其餘原順序） */
export function ancestorMentorsFirst(cards: readonly MentorCard[], ancestors: ReadonlySet<string>): MentorCard[] {
    return [...cards.filter((c) => isAncestorMentor(c, ancestors)), ...cards.filter((c) => !isAncestorMentor(c, ancestors))];
}

export function normalizeLineageQueue(value: unknown): LineageMilestone[] {
    if (!Array.isArray(value)) return [];
    const items = value.filter((item): item is LineageMilestone => !!item && typeof item === 'object'
        && ((item as LineageMilestone).kind === 'grasp' || (item as LineageMilestone).kind === 'coming-of-age')
        && typeof (item as LineageMilestone).generalId === 'string' && (item as LineageMilestone).generalId.length > 0)
        .map((item) => ({ kind: item.kind, generalId: item.generalId, season: typeof item.season === 'number' && Number.isFinite(item.season) ? item.season : 0 }));
    return enqueueLineageMilestones([], items);
}

/** 缺導師保護（規格 §三-2）：家中沒有任何可用教官時，學府提供客卿名儒（水鏡先生）；uid 依子嗣區分，避免多場培育互相鎖定 */
export const GUEST_MENTOR_PREFIX = 'mentor-guest-sima-hui';

export function guestScholarMentorCard(childId: string): MentorCard {
    const snapshot = {
        id: 'sima-hui', name: '水鏡先生', faction: 'neutral', gender: '男', age: 60, hp: 1000,
        str: 30, lea: 50, int: 95, pol: 85, cha: 88, luk: 60, careerClass: 'Scholar',
    };
    return {
        uid: `${GUEST_MENTOR_PREFIX}-${childId}`,
        sourceGeneralId: 'sima-hui',
        name: '客卿名儒（水鏡先生）',
        faction: 'neutral',
        retiredAge: 60,
        retiredSeason: 0,
        retiredYear: 0,
        ep_snapshot: 0,
        gene_refs: [],
        parentUids: ['', ''],
        generalSnapshot: snapshot as unknown as MentorCard['generalSnapshot'],
    };
}

export function isGuestMentorCard(card: Pick<MentorCard, 'uid'>): boolean {
    return card.uid.startsWith(GUEST_MENTOR_PREFIX);
}
