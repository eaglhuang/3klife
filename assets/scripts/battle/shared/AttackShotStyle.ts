// PROG-2-9400：普攻畫面層特效（貼圖小 Sprite）的外觀設定與每一刻的姿態。純資料與純函式、不依賴引擎，供單元測試。
// 一種風格可以有多個「閃光」（例如騎兵：腳下塵土＋命中衝擊），各自指定貼圖、位置、延遲。
import { AttackStyle } from './AttackStyle';
import { ATTACK_SLASH_SHOT } from './AttackSlashShot';

export interface AttackShotSpec {
  /** 快取鍵，同貼圖同裁切要同鍵。 */
  key: string;
  /** vfx_core bundle 內的貼圖路徑。 */
  texturePath: string;
  /** 只取貼圖一部分（像素，左上為原點）；不設就是整張。 */
  rect?: { x: number; y: number; w: number; h: number };
  /** 貼圖內容的方向（度，0 為右）；有 orient 時會轉到對準攻擊方向。 */
  artDeg: number;
  /** true：朝攻擊方向旋轉；false：不轉（圓形、星芒）。 */
  orient: boolean;
  width: number;
  height: number;
  durationSec: number;
  /** 延遲出現（秒），例如弓箭要等箭飛到才爆。 */
  delaySec: number;
  startScale: number;
  endScale: number;
  /** 整段演出繞中心轉過的角度（度）。 */
  sweepDeg: number;
  /** 出現位置：攻擊者(0)到目標(1)之間的比例；不設就用呼叫端給的預設比例（刀光用）。 */
  anchor?: number;
  /** 沿攻擊方向從出現點再往前滑行的距離（畫面像素），做出突刺的穿刺感。 */
  slidePx: number;
  /** 前段全亮的比例，之後淡出。 */
  holdFrac: number;
  color: { r: number; g: number; b: number };
}

/** 弓兵放箭後，箭矢飛到目標才爆的延遲（與 ATTACK_ARROW_SHOT.flightSec 一致，測試會檢查）。 */
export const ARROW_HIT_DELAY_SEC = 0.35;

const WHITE = { r: 255, g: 255, b: 255 };

/** 劈砍：弧形刀光（沿用 PROG-2-9367 的月牙）。 */
const SLASH_SHOT: AttackShotSpec = {
  key: 'slash', texturePath: ATTACK_SLASH_SHOT.texturePath, artDeg: ATTACK_SLASH_SHOT.artBulgeDeg, orient: true,
  width: ATTACK_SLASH_SHOT.size, height: ATTACK_SLASH_SHOT.size, durationSec: ATTACK_SLASH_SHOT.durationSec, delaySec: 0,
  startScale: ATTACK_SLASH_SHOT.startScale, endScale: ATTACK_SLASH_SHOT.endScale, sweepDeg: ATTACK_SLASH_SHOT.sweepDeg,
  slidePx: 0, holdFrac: 0.35, color: ATTACK_SLASH_SHOT.color,
};

/** 突刺：一道細長的直線刺光（貼圖長軸為垂直），沿攻擊方向往前竄一小段。 */
const THRUST_SHOT: AttackShotSpec = {
  key: 'thrust', texturePath: 'textures/impact/tex_impact_flying', artDeg: 90, orient: true,
  width: 26, height: 170, durationSec: 0.2, delaySec: 0, startScale: 0.6, endScale: 1.1, sweepDeg: 0,
  anchor: 0.7, slidePx: 46, holdFrac: 0.4, color: WHITE,
};

/** 盾擊：短促的衝擊圈，由小迅速擴大。 */
const BASH_SHOT: AttackShotSpec = {
  key: 'bash', texturePath: 'textures/impact/tex_impact_ring', artDeg: 0, orient: false,
  width: 120, height: 120, durationSec: 0.22, delaySec: 0, startScale: 0.35, endScale: 1.35, sweepDeg: 0,
  anchor: 0.85, slidePx: 0, holdFrac: 0.3, color: WHITE,
};

/** 箭矢命中點的小爆（星芒），等箭飛到才出現。 */
const BOW_HIT_SHOT: AttackShotSpec = {
  key: 'bow-hit', texturePath: 'textures/impact/tex_impact_sparkle', artDeg: 0, orient: false,
  width: 72, height: 72, durationSec: 0.2, delaySec: ARROW_HIT_DELAY_SEC, startScale: 0.5, endScale: 1.3, sweepDeg: 0,
  anchor: 1, slidePx: 0, holdFrac: 0.3, color: WHITE,
};

/** 衝撞：衝出點的塵土（取煙團圖集左上一團）。 */
const CHARGE_DUST_SHOT: AttackShotSpec = {
  key: 'charge-dust', texturePath: 'textures/cfxr/cfxr_smoke_cloud_x4', rect: { x: 0, y: 0, w: 256, h: 256 }, artDeg: 0, orient: false,
  width: 110, height: 110, durationSec: 0.36, delaySec: 0, startScale: 0.5, endScale: 1.5, sweepDeg: 0,
  anchor: 0, slidePx: 0, holdFrac: 0.2, color: { r: 214, g: 196, b: 160 },
};

/** 衝撞：命中點的衝擊（星芒，比弓箭大），略晚於衝出。 */
const CHARGE_IMPACT_SHOT: AttackShotSpec = {
  key: 'charge-impact', texturePath: 'textures/impact/tex_impact_sparkle', artDeg: 0, orient: false,
  width: 120, height: 120, durationSec: 0.24, delaySec: 0.12, startScale: 0.6, endScale: 1.5, sweepDeg: 0,
  anchor: 1, slidePx: 0, holdFrac: 0.3, color: { r: 255, g: 230, b: 170 },
};

/** 各風格的畫面層特效清單；arrow 的箭矢本體由 ArrowShotView 負責，這裡只放命中小爆。generic 沿用刀光。 */
export const ATTACK_SHOTS: Readonly<Record<AttackStyle, readonly AttackShotSpec[]>> = {
  thrust: [THRUST_SHOT],
  shield: [BASH_SHOT],
  slash: [SLASH_SHOT],
  bow: [BOW_HIT_SHOT],
  charge: [CHARGE_DUST_SHOT, CHARGE_IMPACT_SHOT],
  generic: [SLASH_SHOT],
};

export interface ShotPose { angle: number; scale: number; opacity: number; /** 已滑行距離（畫面像素） */ slide: number; visible: boolean }

/**
 * 閃光在經過時間 elapsed（秒，含延遲）時的姿態。
 * @param dirDeg 攻擊者指向目標的方向（度）
 */
export function shotPoseAt(spec: AttackShotSpec, elapsedSec: number, dirDeg: number): ShotPose {
  const local = (Number.isFinite(elapsedSec) ? elapsedSec : spec.delaySec + spec.durationSec) - spec.delaySec;
  if (local < 0) return { angle: 0, scale: spec.startScale, opacity: 0, slide: 0, visible: false };
  const p = Math.min(1, Math.max(0, local / spec.durationSec));
  const eased = 1 - (1 - p) * (1 - p); // 先快後慢
  const fadeStart = spec.holdFrac;
  return {
    angle: spec.orient ? dirDeg - spec.artDeg + (eased - 0.5) * spec.sweepDeg : 0,
    scale: spec.startScale + (spec.endScale - spec.startScale) * eased,
    opacity: p < fadeStart ? 255 : Math.round(255 * Math.max(0, 1 - (p - fadeStart) / (1 - fadeStart))),
    slide: spec.slidePx * eased,
    visible: p < 1,
  };
}

/** 整個特效清單的總時長（含延遲），用來判斷何時可回收。 */
export function shotTotalSec(spec: AttackShotSpec): number { return spec.delaySec + spec.durationSec; }
