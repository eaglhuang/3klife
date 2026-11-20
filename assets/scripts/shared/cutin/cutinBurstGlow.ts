// @spec-source → Issue #2139（奧義漫畫分鏡 cut-in）；PROG-2-9419（收尾爆光柔化）
/**
 * cutinBurstGlow — 奧義 cut-in 收尾「爆光」的繪製層次（純函式，不碰 cc）。
 *
 * 舊做法是一個硬邊、平塗的實心圓，起始幾乎不透明，畫面上看起來像素材沒載入。
 * 改成：多層同心圓由外往內疊（每層同一個小透明度，疊越多越亮）→ 邊緣淡、中心亮的柔光；
 * 外圈再加一道較亮的衝擊波環，保留「爆開」的漫畫感。
 *
 * 透明度、縮放、顏色的時間軸仍由 cutinCore 決定（burstAlpha / burstProgress / burstColor），
 * 這裡只決定「一張爆光圖」怎麼畫；整體淡出靠節點的 UIOpacity。
 *
 * Unity 對照：等於把一張 radial gradient 貼圖改用程式畫出來，避免多一張資源。
 */

/** 一層要畫的東西：fill 是實心圓，ring 是空心環 */
export interface BurstGlowLayer {
  kind: 'fill' | 'ring';
  /** 半徑（與 baseRadius 同單位） */
  radius: number;
  /** 0~1，這一層自己的透明度（疊加前） */
  alpha: number;
  /** 往白色提亮的比例 0~1（0 = 原色） */
  lighten: number;
  /** ring 才有：線寬 */
  lineWidth?: number;
}

/** 柔光的層數：越多越平滑；8 層實機看得出一圈圈階梯，24 層看不出。只在換色時重畫一次，成本很低 */
export const BURST_GLOW_STEPS = 24;
/** 每層柔光的透明度；24 層疊到中心約 0.86，邊緣只有這一層的 0.08 */
export const BURST_GLOW_STEP_ALPHA = 0.08;
/** 柔光最內層的半徑比例（中心亮核大小） */
export const BURST_GLOW_CORE_RATIO = 0.18;
/** 衝擊波環：位置（半徑比例）、線寬（半徑比例）、透明度、提亮 */
export const BURST_RING_RADIUS_RATIO = 0.94;
export const BURST_RING_WIDTH_RATIO = 0.035;
export const BURST_RING_ALPHA = 0.85;
export const BURST_RING_LIGHTEN = 0.55;

/**
 * 依外半徑算出所有層（由外到內、先柔光後環），呼叫端照順序畫即可。
 * baseRadius <= 0 或非數字時回傳空陣列。
 */
export function burstGlowLayers(baseRadius: number): BurstGlowLayer[] {
  if (!Number.isFinite(baseRadius) || baseRadius <= 0) return [];
  const layers: BurstGlowLayer[] = [];
  for (let i = 0; i < BURST_GLOW_STEPS; i++) {
    const t = i / Math.max(1, BURST_GLOW_STEPS - 1);
    const ratio = 1 - t * (1 - BURST_GLOW_CORE_RATIO);
    layers.push({
      kind: 'fill',
      radius: baseRadius * ratio,
      alpha: BURST_GLOW_STEP_ALPHA,
      // 越往中心越接近白，像真的光源
      lighten: t * 0.6,
    });
  }
  layers.push({
    kind: 'ring',
    radius: baseRadius * BURST_RING_RADIUS_RATIO,
    alpha: BURST_RING_ALPHA,
    lighten: BURST_RING_LIGHTEN,
    lineWidth: Math.max(1, baseRadius * BURST_RING_WIDTH_RATIO),
  });
  return layers;
}

/** 疊加後某半徑位置的不透明度（只算柔光層，給測試與調參用） */
export function burstGlowOpacityAt(baseRadius: number, radius: number): number {
  let transparent = 1;
  for (const layer of burstGlowLayers(baseRadius)) {
    if (layer.kind !== 'fill' || radius > layer.radius) continue;
    transparent *= 1 - layer.alpha;
  }
  return 1 - transparent;
}

/** 0~255 的顏色分量往白色提亮 */
export function lightenChannel(value: number, lighten: number): number {
  const k = Math.max(0, Math.min(1, lighten));
  const v = Math.max(0, Math.min(255, value));
  return Math.round(v + (255 - v) * k);
}
