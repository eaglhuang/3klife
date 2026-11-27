// @spec-source → 新手第一年樂趣四功能規格書 doc_spec_1347 §2 FUN-01 幼兒親子互動；PROG-2-10177
/**
 * FunToddlerBarkView — 點未滿 5 歲孩子頭像：一句童言童語＋小動作＋每季一次的親子好感（View 層）。
 *
 * 共用 AvatarTalkBubble 那一個泡泡節點（全場只有一個、重複使用）；小動作用頭像節點自己的補間，播完還原，不另開節點。
 * 選句與狀態在 core/fun/FunToddlerBark（純邏輯）；獎勵走 reward.claim（grantKey = fun01.{childId}.{seasonNo}）。
 */
import { Node, Vec3, tween, Tween } from 'cc';
import { services } from '../../core/managers/ServiceLoader';
import { claimFunReward } from '../../core/fun/FunReward';
import {
    isToddlerAge, normalizeToddlerPool, pickToddlerBark, TODDLER_POOL_JSON,
    type ToddlerAction, type ToddlerBarkResult, type ToddlerPool,
} from '../../core/fun/FunToddlerBark';
import { popupVoiceOf } from '../../core/systems/PopupSpeakerLine';
import { showAvatarBubbleText } from '../core/AvatarTalkBubble';
import { UCUFLogger, LogCategory } from '../../core/utils/UCUFLogger';

let _pool: ToddlerPool | null | undefined;
let _poolLoading: Promise<ToddlerPool | null> | null = null;

/** 頭像節點的原始縮放／角度（小動作播完還原用；連點時不讓基準被補間中途值污染） */
const _base = new WeakMap<Node, { scale: Vec3; angle: number }>();

function ensurePool(): Promise<ToddlerPool | null> {
    if (_pool !== undefined) return Promise.resolve(_pool);
    if (_poolLoading) return _poolLoading;
    _poolLoading = services().resource.loadJson(TODDLER_POOL_JSON)
        .then((raw: unknown) => { _pool = normalizeToddlerPool(raw); return _pool; })
        .catch(() => { _pool = null; return null; })
        .finally(() => { _poolLoading = null; });
    return _poolLoading;
}

/** 小動作補間：彈跳／轉圈／吐泡泡／揮手／舉拳；播完還原（規格 §2.3），只動頭像自己的縮放與角度 */
export function playToddlerAction(node: Node, action: ToddlerAction): void {
    if (action === 'none' || !node.isValid) return;
    let base = _base.get(node);
    if (!base) {
        base = { scale: node.scale.clone(), angle: node.angle };
        _base.set(node, base);
    }
    Tween.stopAllByTarget(node);
    node.setScale(base.scale);
    node.angle = base.angle;
    const s = base.scale;
    const grow = (k: number): Vec3 => new Vec3(s.x * k, s.y * k, s.z);
    switch (action) {
        case 'bounce':
            tween(node).to(0.12, { scale: grow(1.18) }).to(0.12, { scale: s }).to(0.1, { scale: grow(1.1) }).to(0.1, { scale: s }).start();
            break;
        case 'spin':
            tween(node).to(0.45, { angle: base.angle + 360 }).call(() => { node.angle = base!.angle; }).start();
            break;
        case 'bubble':
            tween(node).to(0.18, { scale: grow(1.12) }).to(0.18, { scale: grow(0.95) }).to(0.18, { scale: s }).start();
            break;
        case 'wave':
            tween(node).to(0.1, { angle: base.angle + 10 }).to(0.1, { angle: base.angle - 10 }).to(0.1, { angle: base.angle + 10 }).to(0.1, { angle: base.angle }).start();
            break;
        case 'fist':
            tween(node).to(0.1, { scale: grow(0.92) }).to(0.1, { scale: grow(1.2) }).to(0.15, { scale: s }).start();
            break;
        default:
            break;
    }
}

/**
 * 點頭像時呼叫：該武將是未滿 5 歲孩子就接手（回 true，之後非同步出氣泡），否則回 false 走一般點頭像說話。
 * 孩子的語氣童語化，不該走成人台詞快取；所以只要年紀不到就一律接手。
 */
export function tryToddlerBarkTap(anchor: Node, generalId: string): boolean {
    const s = services();
    const general = s.session.roster.find((g) => g.id === generalId);
    if (!general || !isToddlerAge(general.age)) return false;
    void runToddlerBark(anchor, generalId);
    return true;
}

async function runToddlerBark(anchor: Node, generalId: string): Promise<ToddlerBarkResult | null> {
    const s = services();
    const pool = await ensurePool();
    const general = s.session.roster.find((g) => g.id === generalId);
    if (!pool || !general || !anchor.isValid) return null;
    const lead = s.session.leadGeneralId ? s.session.roster.find((g) => g.id === s.session.leadGeneralId) : undefined;
    const honorKey = popupVoiceOf(lead).gender === '女' ? 'fun.honor.mother' : 'fun.honor.father';
    const seasonNo = s.session.gameTime.totalSeasonsElapsed;
    const picked = pickToddlerBark({
        pool,
        state: s.session.funState(),
        child: { id: generalId, gender: general.gender, age: general.age ?? 0 },
        seasonNo,
        seed: s.session.magistrateUid ?? '',
        translate: (key) => s.i18n.t(key),
        honor: s.i18n.t(honorKey),
    });
    if (!picked) return null;
    s.session.setFunState(picked.state);
    showAvatarBubbleText(anchor, picked.result.text, picked.result.bubbleSeconds);
    playToddlerAction(anchor, picked.result.action);
    UCUFLogger.info(LogCategory.UI, `[FUN-01] ${generalId} season=${seasonNo} template=${picked.result.templateId} → ${picked.result.text.slice(0, 24)}`);
    // 每孩子每季第一次點擊入帳；重送由 grantKey 去重，所以每次點都可以安全再送一次（上次失敗就補上）
    const outcome = await claimFunReward(s.api, { bundleId: picked.result.bundleId, grantKey: picked.result.grantKey, sourceKind: 'fun01', sourceRef: generalId });
    if (outcome.ok && !outcome.replayed && outcome.applied > 0) {
        s.event.emit('SHOW_TOAST', { message: s.i18n.t('fun.bond.float', String(outcome.applied)), duration: 2 });
    }
    return picked.result;
}
