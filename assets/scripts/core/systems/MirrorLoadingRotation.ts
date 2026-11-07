/**
 * MirrorLoadingRotation — 命鏡 Loading 輪播名單（血脈命鏡過場載入規格書 §8；BML-05；PROG-2-2069）
 *
 * 規格：場景切換時顯示命鏡 Loading，允許輪播尚未持有的角色。
 * 已持有的武將讀 loading state，未持有的讀 unowned-preview state。
 */

export type MirrorLoadingStateId = 'loading' | 'unowned-preview';

export interface MirrorLoadingCandidate {
    id: string;
    name: string;
}

export interface MirrorLoadingEntry extends MirrorLoadingCandidate {
    owned: boolean;
    stateId: MirrorLoadingStateId;
}

export interface MirrorLoadingRotationRule {
    /** 一次轉場最多輪播幾位 */
    length: number;
    /** 每幾格放一位未持有武將（第 N、2N… 格） */
    unownedEvery: number;
    /** 每位停留秒數 */
    intervalSec: number;
}

/** 暫定值：規格只說「允許輪播未持有角色」，比例與停留秒數未定 */
export const MIRROR_LOADING_ROTATION: MirrorLoadingRotationRule = { length: 6, unownedEvery: 3, intervalSec: 2.5 };

function shuffledUnique<T extends MirrorLoadingCandidate>(list: readonly T[], random: () => number): T[] {
    const seen = new Set<string>();
    const out = list.filter((item) => !seen.has(item.id) && !!seen.add(item.id));
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

function toEntry(candidate: MirrorLoadingCandidate, owned: boolean): MirrorLoadingEntry {
    return { id: candidate.id, name: candidate.name, owned, stateId: owned ? 'loading' : 'unowned-preview' };
}

/**
 * 排出輪播名單：每 unownedEvery 格放一位未持有武將，其餘放已持有武將；
 * 某一邊用完時由另一邊補位，兩邊都用完就提早結束。
 */
export function buildMirrorLoadingRotation(
    owned: readonly MirrorLoadingCandidate[],
    all: readonly MirrorLoadingCandidate[],
    random: () => number = Math.random,
    rule: MirrorLoadingRotationRule = MIRROR_LOADING_ROTATION,
): MirrorLoadingEntry[] {
    const ownedIds = new Set(owned.map((general) => general.id));
    const ownedPool = shuffledUnique(owned, random);
    const unownedPool = shuffledUnique(all.filter((general) => !ownedIds.has(general.id)), random);
    const entries: MirrorLoadingEntry[] = [];
    let ownedIndex = 0;
    let unownedIndex = 0;
    for (let slot = 0; slot < rule.length; slot++) {
        const wantUnowned = (slot + 1) % rule.unownedEvery === 0;
        const useUnowned = unownedIndex < unownedPool.length && (wantUnowned || ownedIndex >= ownedPool.length);
        if (useUnowned) entries.push(toEntry(unownedPool[unownedIndex++], false));
        else if (ownedIndex < ownedPool.length) entries.push(toEntry(ownedPool[ownedIndex++], true));
        else break;
    }
    return entries;
}
