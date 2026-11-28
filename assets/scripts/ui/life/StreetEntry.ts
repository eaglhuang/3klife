// @spec-source → Q版社會總規格書 QSOC-01 第 9.5.1 節（大廳「出去逛逛」入口與首訪任務接線）；PROG-2-10256
/**
 * StreetEntry — 大廳「出去逛逛」入口的純邏輯（不依賴 cc）
 *
 * 職責：
 *  1. 入口鈕狀態：照 StreetOpenGate 判斷開放或上鎖（上鎖給提示字 key）；
 *  2. 用「真實」武將名冊組出生活層名冊（玩家家臣＋他國遊歷訪客）與首訪任務候選（親密度、性別）；
 *  3. 首訪任務完成時走共用獎勵框架 reward.claim 發獎，grantKey 固定、重送不重複入帳；
 *  4. 首訪任務狀態在同一次遊玩內保存（離開大街再進來不重來）。
 * 不負責：畫面（cocos/LifeStreetEntry）、親密度與性別怎麼來（由呼叫端以 RealGeneral 傳入）。
 */
import type { IApiClient } from '../../shared/api/IApiClient';
import { isApiFail } from '../../shared/api/ApiProtocol';
import type { RewardGrantResult } from '../../shared/api/ApiCommands';
import type { LifeRosterEntry } from '../../core/life/types';
import { DEFAULT_STREET_FIRST_VISIT_CONFIG, StreetFirstVisit } from './StreetFirstVisit';
import type { CandidateGender, StreetCandidate, StreetFirstVisitConfig, StreetFirstVisitState } from './StreetFirstVisit';
import { DEFAULT_STREET_OPEN_CONFIG, isStreetOpen } from './StreetOpenGate';
import type { StreetOpenConfig } from './StreetOpenGate';

// ───────────────────────────── 入口鈕狀態 ─────────────────────────────

export interface StreetEntryFacts {
    /** 玩家是否已打完第一場戰鬥（session.firstBattleCleared） */
    firstBattleDone: boolean;
    /** 目前遊戲季序號（第一季＝1） */
    seasonIndex: number;
}

export interface StreetEntryState {
    open: boolean;
    /** 上鎖時顯示的提示字 key（開放時為 null） */
    lockedHintKey: string | null;
}

export const STREET_ENTRY_LOCKED_HINT_KEY = 'life.street_entry.locked_hint';

/**
 * 入口是否開放：開放條件同 StreetOpenGate，但「家臣帶逛」本身就在大街裡進行，
 * 所以入口這一層不要求 tutorialDone（否則永遠進不去）。
 */
export function streetEntryState(facts: StreetEntryFacts, config: StreetOpenConfig = DEFAULT_STREET_OPEN_CONFIG): StreetEntryState {
    const open = isStreetOpen({ ...facts, tutorialDone: true }, config);
    return { open, lockedHintKey: open ? null : STREET_ENTRY_LOCKED_HINT_KEY };
}

// ───────────────────────────── 真實名冊 ─────────────────────────────

/** 從遊戲資料抽出的最小武將資料（GeneralConfig 的子集，方便測試） */
export interface RealGeneral {
    /** 遊戲內武將 id（例如 zhang-fei） */
    id: string;
    name: string;
    /** 性別原文（資料用「女」表示女性，其餘視為男性） */
    gender?: string;
    faction?: string;
}

export interface StreetRoster {
    /** 餵給作息引擎的名冊（id 已轉成底線格式） */
    lifeRoster: LifeRosterEntry[];
    /** 生活層 id → 顯示名 */
    names: Record<string, string>;
    /** 首訪任務候選（id 為生活層 id） */
    candidates: StreetCandidate[];
    /** 生活層 id → 遊戲內武將 id */
    realIdOf: Record<string, string>;
}

export interface StreetRosterInput {
    /** 玩家名冊中在世的家臣 */
    retainers: readonly RealGeneral[];
    /** 他國遊歷武將候補（不在家臣名冊內才會被用） */
    visitors: readonly RealGeneral[];
    /** 與主角的親密度（友誼框架） */
    intimacyOf: (realId: string) => number;
    /** 畫面上最多放幾位（Q 頭池預算） */
    maxActors: number;
    /** 最多放幾位訪客 */
    maxVisitors: number;
}

const FACTIONS = ['shu', 'wei', 'wu', 'neutral'];

/** 遊戲 id（zhang-fei）→ 生活層 id（zhang_fei） */
export function toLifeId(realId: string): string {
    return realId.replace(/-/g, '_');
}

/** 資料檔裡女性的性別字（以字碼 0x5973 組出，避免程式碼內嵌中文顯示字） */
const FEMALE_GENDER = String.fromCharCode(0x5973);

export function genderOf(g: RealGeneral): CandidateGender {
    return g.gender === FEMALE_GENDER ? 'f' : 'm';
}

function factionOf(g: RealGeneral): LifeRosterEntry['faction'] {
    const f = g.faction ?? 'neutral';
    return (FACTIONS.indexOf(f) >= 0 ? f : 'neutral') as LifeRosterEntry['faction'];
}

/** 親密度高者先；同分 id 小者先（結果固定） */
function byIntimacy(intimacyOf: (id: string) => number) {
    return (a: RealGeneral, b: RealGeneral): number => intimacyOf(b.id) - intimacyOf(a.id) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

export function buildStreetRoster(input: StreetRosterInput): StreetRoster {
    const out: StreetRoster = { lifeRoster: [], names: {}, candidates: [], realIdOf: {} };
    const ownedIds = new Set(input.retainers.map((g) => g.id));
    const maxVisitors = Math.max(0, Math.min(input.maxVisitors, input.maxActors));
    const retainerCap = Math.max(0, input.maxActors - maxVisitors);
    const retainers = input.retainers.slice().sort(byIntimacy(input.intimacyOf)).slice(0, retainerCap);
    // 家臣不足時，空出的名額讓給訪客（家臣滿額時剛好剩 maxVisitors 個）
    const visitorCap = Math.max(0, input.maxActors - retainers.length);
    const visitors = input.visitors.filter((g) => !ownedIds.has(g.id)).slice().sort(byIntimacy(input.intimacyOf)).slice(0, visitorCap);
    const push = (g: RealGeneral, kind: 'retainer' | 'visitor'): void => {
        const lifeId = toLifeId(g.id);
        if (out.realIdOf[lifeId]) return;
        out.realIdOf[lifeId] = g.id;
        out.names[lifeId] = g.name;
        out.lifeRoster.push({ id: lifeId, kind, faction: factionOf(g) });
        out.candidates.push({ id: lifeId, kind, intimacy: input.intimacyOf(g.id), gender: genderOf(g) });
    };
    for (const g of retainers) push(g, 'retainer');
    for (const g of visitors) push(g, 'visitor');
    return out;
}

// ───────────────────────────── 發獎 ─────────────────────────────

export const STREET_FIRST_VISIT_REWARD_SOURCE = 'life_street_first_visit';
/** 一個存檔只會有一份首訪獎勵：識別碼固定，重試或重送只會回原結果 */
export const STREET_FIRST_VISIT_GRANT_KEY = 'streetFirstVisit:v1';

export interface StreetRewardOutcome {
    ok: boolean;
    /** 先前已領過（本次沒有新入帳） */
    replayed: boolean;
    silver: number;
}

export async function claimStreetFirstVisitReward(
    api: Pick<IApiClient, 'cmd'>,
    bundleId: string = DEFAULT_STREET_FIRST_VISIT_CONFIG.rewardBundleId,
    grantKey: string = STREET_FIRST_VISIT_GRANT_KEY,
): Promise<StreetRewardOutcome> {
    try {
        const res = await api.cmd<RewardGrantResult>('reward.claim', {
            bundleId,
            grantKey,
            source: { kind: STREET_FIRST_VISIT_REWARD_SOURCE, ref: 'first_visit' },
        });
        if (isApiFail(res)) return { ok: false, replayed: false, silver: 0 };
        if (res.result.replayed) return { ok: true, replayed: true, silver: 0 };
        const silver = res.result.plan.reduce((sum, line) => {
            const applied = line.applied;
            return applied.kind === 'currency' && applied.id === 'silver' && typeof applied.amount === 'number' ? sum + applied.amount : sum;
        }, 0);
        return { ok: true, replayed: false, silver };
    } catch {
        return { ok: false, replayed: false, silver: 0 };
    }
}

// ───────────────────────────── 同次遊玩內保存首訪狀態 ─────────────────────────────

let savedState: StreetFirstVisitState | null = null;
let rewardClaimed = false;

/** 取得首訪任務物件：同次遊玩內離開大街再進來，沿用上次狀態 */
export function openStreetFirstVisit(config: StreetFirstVisitConfig = DEFAULT_STREET_FIRST_VISIT_CONFIG): StreetFirstVisit {
    return new StreetFirstVisit(config, savedState ?? undefined);
}

export function saveStreetFirstVisit(visit: StreetFirstVisit): void {
    const s = visit.state;
    savedState = { phase: s.phase, guideId: s.guideId, targetIds: [...s.targetIds], foundIds: [...s.foundIds] };
}

export function isStreetRewardClaimed(): boolean { return rewardClaimed; }
export function markStreetRewardClaimed(): void { rewardClaimed = true; }

/** 測試用：清掉同次遊玩的保存 */
export function resetStreetFirstVisitMemory(): void {
    savedState = null;
    rewardClaimed = false;
}
