/**
 * DuelSim.ts — Q 頭切磋回合模擬＋後果結算（QACT-01 4.2、QLIFE-01 6.4.1，PROG-2-10231）
 *
 * 純函式、確定性亂數（mulberry32，同 seed 同過程）。不寫傷勢、不寫友誼、不存檔。
 * 規則重點：
 *  - 每回合雙方各出手一次（先手逐回合交替）；單擊 = base(dmgMin～dmgMax) x (自己武力 / 對手武力)^0.5。
 *  - 暴擊 10% x1.5；閃避率 = 對手（武力+智力）高於自己的差值 / dodgeDiffFull x dodgeCap，最多 dodgeCap。
 *  - friendly：任一方血量 <= 30% 即「點到為止」收手 = draw，無後果。
 *  - serious／deathmatch：打到 0 或 12 回合上限（看剩餘血量比，相同為 draw）。
 *  - 切磋永不致死：最重 = 重傷；宿敵死鬥輸方 = captured，仍不陣亡；主角不受傷。
 * Unity 對照：相當於一個無 MonoBehaviour 的 DuelSimulator 靜態類別。
 */
import duelJson from '../../../../resources/data/life-duel.json';
import { createLifeRng } from '../LifeClock';
import type {
    DuelConfig, DuelEvent, DuelFighter, DuelInjuryLevel, DuelInjuryResult, DuelInput, DuelMode,
    DuelOutcomeTier, DuelResult, DuelSide,
} from './DuelTypes';

export const DEFAULT_DUEL_CONFIG: DuelConfig = duelJson as unknown as DuelConfig;

function hpMaxOf(f: DuelFighter, cfg: DuelConfig): number {
    return Math.round(cfg.hpBase * (f.highRank ? cfg.hpHighRankMul : 1));
}

function dodgeChance(atk: DuelFighter, def: DuelFighter, cfg: DuelConfig): number {
    const diff = def.force + def.intellect - (atk.force + atk.intellect);
    if (diff <= 0) return 0;
    return Math.min(cfg.dodgeCap, (diff / cfg.dodgeDiffFull) * cfg.dodgeCap);
}

/** 冪等鍵：呼叫端把 DuelResult 送伺服器時用（QLIFE-01 6.4.1）。 */
export function duelIdempotencyKey(seed: number, quarter: number): string {
    return `duel:${seed >>> 0}:${Math.floor(quarter)}`;
}

function lossTierOf(loser: DuelFighter): DuelOutcomeTier {
    const hurt: DuelInjuryLevel = loser.injury ?? 'none';
    if (hurt === 'severe') return 'severeInjury';
    // 連輸才進重傷：輕傷尚未痊癒時再落敗，或連續兩場落敗；同人當季最多升級一次重傷
    const upgrade = hurt === 'light' || loser.lostLastDuel === true;
    if (upgrade && !loser.severeUpgradedThisQuarter) return 'severeInjury';
    return 'lightInjury';
}

export interface DuelLossOutcome {
    tier: DuelOutcomeTier;
    injury: DuelInjuryResult | null;
    capturedId: string | null;
    stunned: boolean;
}

/** 輸方後果分級：只依輸方目前傷勢與模式算，不寫入任何狀態。主角不受傷、不被擒（只演出暈）。 */
export function classifyLoss(loser: DuelFighter, mode: DuelMode): DuelLossOutcome {
    if (loser.isProtagonist) return { tier: 'draw', injury: null, capturedId: null, stunned: true };
    if (mode === 'deathmatch') return { tier: 'captured', injury: null, capturedId: loser.id, stunned: false };
    const tier = lossTierOf(loser);
    return { tier, injury: { targetId: loser.id, level: tier === 'severeInjury' ? 'severe' : 'light' }, capturedId: null, stunned: false };
}

export function simulateDuel(input: DuelInput, cfg: DuelConfig = DEFAULT_DUEL_CONFIG): DuelResult {
    const rng = createLifeRng(input.seed);
    const fighters: Record<DuelSide, DuelFighter> = { a: input.a, b: input.b };
    const hpMax = { a: hpMaxOf(input.a, cfg), b: hpMaxOf(input.b, cfg) };
    const hp = { a: hpMax.a, b: hpMax.b };
    const events: DuelEvent[] = [];
    const push = (e: Omit<DuelEvent, 'hpA' | 'hpB'>): void => { events.push({ ...e, hpA: hp.a, hpB: hp.b }); };
    const stopHp = { a: hpMax.a * cfg.friendlyStopRatio, b: hpMax.b * cfg.friendlyStopRatio };
    const firstSide: DuelSide = rng() < 0.5 ? 'a' : 'b';

    let rounds = 0;
    let ko = false;
    let stopped = false;

    outer:
    for (let r = 1; r <= cfg.roundLimit; r++) {
        rounds = r;
        const order: DuelSide[] = (r % 2 === 1) === (firstSide === 'a') ? ['a', 'b'] : ['b', 'a'];
        for (const atkSide of order) {
            const defSide: DuelSide = atkSide === 'a' ? 'b' : 'a';
            const atk = fighters[atkSide];
            const def = fighters[defSide];
            // 每次出手固定抽 3 個亂數，讓同種子在不同模式下前段過程一致
            const rDodge = rng();
            const rBase = rng();
            const rCrit = rng();
            if (rDodge < dodgeChance(atk, def, cfg)) {
                push({ round: r, kind: 'dodge', attacker: atkSide, defender: defSide, damage: 0 });
                continue;
            }
            const base = cfg.dmgMin + rBase * (cfg.dmgMax - cfg.dmgMin);
            const crit = rCrit < cfg.critChance;
            const dmg = Math.max(1, Math.round(base * Math.sqrt(atk.force / Math.max(1, def.force)) * (crit ? cfg.critMul : 1)));
            hp[defSide] = Math.max(0, hp[defSide] - dmg);
            push({ round: r, kind: crit ? 'crit' : 'hit', attacker: atkSide, defender: defSide, damage: dmg });
            if (hp[defSide] <= 0) {
                ko = true;
                push({ round: r, kind: 'ko', attacker: atkSide, defender: defSide, damage: 0 });
                break outer;
            }
            if (input.mode === 'friendly' && hp[defSide] <= stopHp[defSide]) {
                stopped = true;
                push({ round: r, kind: 'stop', attacker: null, defender: null, damage: 0 });
                break outer;
            }
        }
    }

    let winner: DuelSide | null = null;
    if (ko) {
        winner = hp.a <= 0 ? 'b' : 'a';
    } else if (!stopped) {
        push({ round: rounds, kind: 'limit', attacker: null, defender: null, damage: 0 });
        const ra = hp.a / hpMax.a;
        const rb = hp.b / hpMax.b;
        winner = ra === rb ? null : ra > rb ? 'a' : 'b';
    }

    // 點到為止收手或回合上限同血量 = draw，無後果
    if (stopped || winner === null) {
        return {
            winner: null, rounds, hpLeft: { ...hp }, hpMax, ko: false, outcomeTier: 'draw',
            injury: null, capturedId: null, protagonistStunned: false, events,
        };
    }
    const res = classifyLoss(fighters[winner === 'a' ? 'b' : 'a'], input.mode);
    return {
        winner, rounds, hpLeft: { ...hp }, hpMax, ko, outcomeTier: res.tier,
        injury: res.injury, capturedId: res.capturedId, protagonistStunned: res.stunned, events,
    };
}
