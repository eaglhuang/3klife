// @spec-source → docs/agent-briefs/tasks/PROG/PROG-2-9733.md（buff 格靜態光圈＋部隊吃到 buff 腳下特效）
/**
 * TileBuffVfxMath — buff 格特效的純計算（不碰 cc，單元測試可直接跑）。
 *
 * 1. 疊層分級：倍數 → 第幾級（光圈圈數、刻度數、亮度），3 倍與 5 倍必須落在不同級。
 * 2. 腳下特效時間軸：吃到 buff 當下開始循環，持續 durationSec，最後 fadeOutSec 淡出；回傳 0～1 的整體透明度。
 * 3. 腳下特效插槽表：同一部隊重複吃到只重啟不疊加；插槽滿了回收最舊的；時間到自動釋放（供 View 層節點池重用）。
 *
 * Unity 對照：Tier 查表是 ScriptableObject 取值；插槽表是 ParticleSystem 池的「誰在用哪一個」登記簿。
 */

export interface TileBuffTier { minFactor: number }

/** 倍數落在第幾級（0 起算）：取 minFactor 不超過倍數的最後一級 */
export function tileBuffTierIndex(tiers: readonly TileBuffTier[], factor: number): number {
  const f = Number.isFinite(factor) ? factor : 1;
  let idx = 0;
  for (let i = 0; i < tiers.length; i++) if (f >= tiers[i].minFactor) idx = i;
  return idx;
}

/** 由倍數文字（「×3」「÷5」「×2.3」）取出倍數；讀不出來回 1 */
export function tileBuffFactorFromText(amountText: string): number {
  const n = parseFloat(amountText.slice(1));
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/**
 * 腳下特效整體透明度：開頭 fadeInSec 淡入、結尾 fadeOutSec 淡出、中間 1；超過 durationSec 回 0。
 */
export function pickupEnvelope(t: number, durationSec: number, fadeInSec: number, fadeOutSec: number): number {
  if (!Number.isFinite(t) || t < 0 || t >= durationSec) return 0;
  const fin = fadeInSec > 0 ? Math.min(1, t / fadeInSec) : 1;
  const fout = fadeOutSec > 0 ? Math.min(1, (durationSec - t) / fadeOutSec) : 1;
  return Math.min(fin, fout);
}

export interface PickupSlot { index: number; key: string; elapsed: number; busy: boolean }

/** 腳下特效插槽登記簿；View 層用 index 對應節點池 */
export class PickupSlotTable {
  public readonly slots: PickupSlot[];
  /** 統計（QA 讀取）：累計開始次數、累計到期回收次數 */
  public started = 0;
  public expired = 0;

  constructor(capacity: number, private readonly durationSec: number) {
    this.slots = Array.from({ length: capacity }, (_, index) => ({ index, key: '', elapsed: 0, busy: false }));
  }

  /** 開始（或重啟）某部隊的特效；回傳插槽。同一 key 已在播就重啟同一槽；滿了回收播最久的 */
  public start(key: string): PickupSlot {
    let slot = this.slots.find(s => s.busy && s.key === key);
    if (!slot) slot = this.slots.find(s => !s.busy);
    if (!slot) slot = this.slots.reduce((a, b) => (b.elapsed > a.elapsed ? b : a));
    slot.key = key;
    slot.elapsed = 0;
    slot.busy = true;
    this.started++;
    return slot;
  }

  /** 推進時間；回傳本次到期而釋放的插槽（呼叫端據此隱藏節點） */
  public step(dt: number, out: PickupSlot[] = []): PickupSlot[] {
    out.length = 0;
    const d = Number.isFinite(dt) && dt > 0 ? dt : 0;
    for (const s of this.slots) {
      if (!s.busy) continue;
      s.elapsed += d;
      if (s.elapsed >= this.durationSec) { s.busy = false; this.expired++; out.push(s); }
    }
    return out;
  }

  public activeCount(): number {
    let n = 0;
    for (const s of this.slots) if (s.busy) n++;
    return n;
  }

  public releaseAll(): void {
    for (const s of this.slots) s.busy = false;
  }
}
