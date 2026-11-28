/**
 * DuelPlayback.ts — Q 頭切磋的「時間軸」與逐幀取樣（QACT-01 4.1、4.3、4.4，PROG-2-10231）
 *
 * 引擎中立：不 import Cocos。把 DuelResult.events 排成「蓄力 -> 衝撞 -> 命中停格 -> 擊退」的節拍，
 * 再用 sampleDuel(timeline, t) 算出任意時刻兩顆頭的位移／旋轉／縮放／白閃／武器角、血條與跳字。
 * 全程程式即時算，不用逐幀圖、不每顆頭一份 tween；套用端（cocos/DuelStageView）每幀呼叫一次取樣即可。
 * 單位：長度＝頭高 H（y 向上為正、x 為「朝對手」方向為正）；角度＝度；時間＝秒。
 * Unity 對照：相當於 Timeline 的 PlayableDirector 取樣結果（只有數值，不碰 Transform）。
 */
import type { DuelEvent, DuelPlaybackConfig, DuelResult, DuelSide } from '../../../core/life/duel/DuelTypes';

export type DuelFloatKind = 'hit' | 'crit' | 'dodge';
export type DuelPose = 'idle' | 'win' | 'stun';

export interface DuelBeat {
    start: number;
    end: number;
    attacker: DuelSide;
    defender: DuelSide;
    /** 擊中（或被閃開）的時間點 */
    tHit: number;
    kind: DuelFloatKind;
    damage: number;
    /** 命中前後的雙方血量比（0～1） */
    ratioBefore: { a: number; b: number };
    ratioAfter: { a: number; b: number };
}

export interface DuelTimeline {
    beats: DuelBeat[];
    /** 最後一擊結束時間（之後進勝負演出） */
    fightEnd: number;
    total: number;
    result: DuelResult;
    cfg: DuelPlaybackConfig;
}

/** 單顆頭每幀的取樣值（單一物件重複使用） */
export interface DuelHeadFrame {
    x: number;
    y: number;
    rot: number;
    scaleX: number;
    scaleY: number;
    /** 白閃 0～1（套用端把 Sprite.color 提亮，不用 shader） */
    flash: number;
    /** 武器繞掛點的角度（度） */
    weaponDeg: number;
    pose: DuelPose;
}

export interface DuelFloatItem {
    side: DuelSide;
    kind: DuelFloatKind;
    damage: number;
    /** 0～1 的飄動進度 */
    age: number;
    /** 往上飄的高度（H） */
    rise: number;
    /** 縮放：先放大 floatPopScale 再縮回 1 */
    scale: number;
}

export interface DuelFrame {
    a: DuelHeadFrame;
    b: DuelHeadFrame;
    /** 場景震動振幅（像素） */
    shakePx: number;
    /** 前條（立刻扣）與後條（0.4 秒追上）的血量比 */
    hp: { aFront: number; aBack: number; bFront: number; bBack: number };
    floats: DuelFloatItem[];
    done: boolean;
}

function easeOut(u: number): number {
    const v = Math.min(1, Math.max(0, u));
    return 1 - (1 - v) * (1 - v);
}

function smooth(u: number): number {
    const v = Math.min(1, Math.max(0, u));
    return v * v * (3 - 2 * v);
}

/** 擊中前的準備秒數（蓄力＋衝撞） */
function leadSec(cfg: DuelPlaybackConfig): number {
    return cfg.chargeSec + cfg.rushSec;
}

export function buildDuelTimeline(result: DuelResult, cfg: DuelPlaybackConfig, speed = 1): DuelTimeline {
    const k = speed > 0 ? 1 / speed : 1;
    const beats: DuelBeat[] = [];
    let t = 0;
    let before = { a: 1, b: 1 };
    const swings: DuelEvent[] = result.events.filter((e) => e.kind === 'hit' || e.kind === 'crit' || e.kind === 'dodge');
    for (const e of swings) {
        const lead = leadSec(cfg) * k;
        const hold = cfg.hitstopSec * k;
        const tail = Math.max(cfg.knockbackSec, cfg.shakeSec) * k;
        const after = { a: e.hpA / result.hpMax.a, b: e.hpB / result.hpMax.b };
        beats.push({
            start: t,
            end: t + lead + hold + tail,
            attacker: e.attacker as DuelSide,
            defender: e.defender as DuelSide,
            tHit: t + lead,
            kind: e.kind === 'dodge' ? 'dodge' : e.kind === 'crit' ? 'crit' : 'hit',
            damage: e.damage,
            ratioBefore: before,
            ratioAfter: after,
        });
        before = after;
        t += lead + hold + tail;
    }
    return { beats, fightEnd: t, total: t + cfg.endPoseSec * k, result, cfg };
}

export function createDuelFrame(): DuelFrame {
    const head = (): DuelHeadFrame => ({ x: 0, y: 0, rot: 0, scaleX: 1, scaleY: 1, flash: 0, weaponDeg: 0, pose: 'idle' });
    return { a: head(), b: head(), shakePx: 0, hp: { aFront: 1, aBack: 1, bFront: 1, bBack: 1 }, floats: [], done: false };
}

function resetHead(h: DuelHeadFrame, cfg: DuelPlaybackConfig): void {
    h.x = 0; h.y = 0; h.rot = 0; h.scaleX = 1; h.scaleY = 1; h.flash = 0; h.weaponDeg = cfg.weaponReadyDeg; h.pose = 'idle';
}

/** 取樣：t 為時間軸秒數（已含速度，呼叫端把 dt 累加即可）。 */
export function sampleDuel(tl: DuelTimeline, t: number, out: DuelFrame, speed = 1): DuelFrame {
    const cfg = tl.cfg;
    const k = speed > 0 ? 1 / speed : 1;
    resetHead(out.a, cfg);
    resetHead(out.b, cfg);
    out.shakePx = 0;
    out.floats.length = 0;
    out.done = t >= tl.total;
    const travel = cfg.standoffH - 1;
    const heads: Record<DuelSide, DuelHeadFrame> = { a: out.a, b: out.b };

    // 血條：前條立刻扣、後條追上
    let ra = 1, rb = 1, backA = 1, backB = 1;
    for (const beat of tl.beats) {
        if (t < beat.tHit) break;
        ra = beat.ratioAfter.a;
        rb = beat.ratioAfter.b;
        const w = Math.min(1, (t - beat.tHit) / (cfg.hpBarFollowSec * k));
        backA = beat.ratioBefore.a + (beat.ratioAfter.a - beat.ratioBefore.a) * w;
        backB = beat.ratioBefore.b + (beat.ratioAfter.b - beat.ratioBefore.b) * w;
    }
    out.hp.aFront = ra; out.hp.bFront = rb; out.hp.aBack = Math.max(ra, backA); out.hp.bBack = Math.max(rb, backB);

    for (const beat of tl.beats) {
        const floatLife = cfg.floatSec * k;
        if (t >= beat.tHit && t < beat.tHit + floatLife) {
            const age = (t - beat.tHit) / floatLife;
            const pop = age < 0.2 ? 1 + (cfg.floatPopScale - 1) * (age / 0.2) : cfg.floatPopScale - (cfg.floatPopScale - 1) * Math.min(1, (age - 0.2) / 0.3);
            out.floats.push({ side: beat.defender, kind: beat.kind, damage: beat.damage, age, rise: cfg.floatRiseH * easeOut(age), scale: pop });
        }
        if (t < beat.start || t >= beat.end) continue;
        const atk = heads[beat.attacker];
        const def = heads[beat.defender];
        const hold = cfg.hitstopSec * k;
        const charge = cfg.chargeSec * k;
        const rush = cfg.rushSec * k;
        const dt = t - beat.start;
        const ready = cfg.weaponReadyDeg;
        const swing = cfg.weaponSwingDeg;
        if (dt < charge) {
            const u = dt / charge;
            atk.x = -cfg.chargePullH * easeOut(u);
            atk.scaleX = 1 + 0.1 * u; atk.scaleY = 1 - 0.1 * u;
            atk.weaponDeg = ready;
        } else if (dt < charge + rush) {
            const u = (dt - charge) / rush;
            atk.x = -cfg.chargePullH + (travel + cfg.chargePullH) * smooth(u);
            atk.scaleX = 0.92; atk.scaleY = 1.1;
            atk.weaponDeg = ready + (swing - ready) * u;
        } else {
            const since = dt - charge - rush;
            const knock = cfg.knockbackSec * k;
            const u = Math.min(1, Math.max(0, (since - hold) / knock));
            const inHold = since < hold;
            atk.x = inHold ? travel : travel * (1 - smooth(u));
            atk.weaponDeg = inHold ? swing : swing + (ready - swing) * smooth(u);
            if (beat.kind === 'dodge') {
                // 閃避：被打方側跳（y 跳起），攻擊方撲空、不停格不白閃
                const hu = Math.min(1, since / (hold + knock));
                def.y = 0.5 * Math.sin(Math.PI * hu);
                def.x = -0.3 * Math.sin(Math.PI * hu);
            } else if (inHold) {
                def.flash = 1;
                atk.flash = 0.3;
                def.scaleX = 0.9; def.scaleY = 1.1;
            } else {
                const ku = u;
                // 被打方往後飛 0.7 H 再彈回
                def.x = -cfg.knockbackH * Math.sin(Math.PI * ku);
                def.rot = (beat.defender === 'a' ? -1 : 1) * cfg.knockbackRotDeg * Math.sin(Math.PI * ku);
                def.flash = Math.max(0, 1 - ku * 2);
                const shakeU = (since - hold) / (cfg.shakeSec * k);
                if (shakeU >= 0 && shakeU < 1) out.shakePx = cfg.shakePx * (1 - shakeU);
            }
        }
    }

    // 勝負演出
    if (t >= tl.fightEnd) {
        const eu = Math.min(1, (t - tl.fightEnd) / Math.max(0.0001, cfg.endPoseSec * k));
        const w = tl.result.winner;
        if (w) {
            const loser: DuelSide = w === 'a' ? 'b' : 'a';
            heads[w].pose = 'win';
            heads[w].y = 0.5 * Math.abs(Math.sin(eu * Math.PI * 2));
            heads[loser].pose = 'stun';
            heads[loser].rot = 12 * Math.sin(eu * Math.PI * 6) * (1 - eu * 0.5);
            heads[loser].scaleX = 0.95;
        }
    }
    return out;
}
