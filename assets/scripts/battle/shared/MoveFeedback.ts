// PROG-2-9406／9407：戰場移動手感（揚塵粒子＋腳步聲）。純函式、不依賴引擎，供單元測試。
// 只決定「表現層」該播什麼；誰移動、移幾格由戰場核心規則決定，這裡完全不碰。
import { TerrainType, TroopType } from '../../shared/CommonEnums';
import type { BattleAudioCue } from './BattleAudio';

export interface MoveFootstepSpec {
  /** 音效邏輯鍵（實體 clip 由 BattleAudio 的 BATTLE_AUDIO_CLIP_MAP 決定；之後有專用蹄聲、重甲聲，新增 cue 後只改這張表） */
  cue: BattleAudioCue;
  /** 單拍音量（使用者裁決：整體小聲，上限 0.4） */
  volume: number;
  /** 每次落腳連播幾聲（步兵 1 聲；騎兵蹄聲每次落腳 2 聲）。落腳本身由 walk 步態決定（每 0.4 動畫秒一次），不在這張表 */
  beats: number;
  /** 同一次落腳內聲與聲的間隔（毫秒）；beats=1 時無作用 */
  intervalMs: number;
  /**
   * 音高倍率（1 = 原音；重甲偏低、騎兵偏高，約 ±5～10%）。
   * 目前引擎不支援：AudioSystem.playSfx 底層用 AudioSource.playOneShot(clip, volume)，沒有 pitch／playbackRate；
   * 為避免改動音效管理器公開介面，欄位僅保留給之後，播放流程暫不使用。
   */
  pitch: number;
}

/** 音量上限（供測試與呼叫端夾限） */
export const MOVE_FOOTSTEP_MAX_VOLUME = 0.4;

/**
 * 兵種 → 腳步音效資料表（仿 BATTLE_AUDIO_CLIP_MAP）。
 * 落腳拍點由 walk 步態決定（見 FOOTFALL_INTERVAL_SEC），聲音與揚塵共用同一個拍點（moveBeatFor）；
 * 目前只有一個 footstep clip，用「每拍聲數＋間隔＋音量」區分兵種；以下參數皆為推測，未實機聽過。
 * 水軍借 unit-dodge（對應 wave clip）當划水聲，同樣是推測。
 */
export const MOVE_FOOTSTEP_TABLE: Record<TroopType, MoveFootstepSpec> = {
  [TroopType.Infantry]: { cue: 'unit-move', volume: 0.22, beats: 1, intervalMs: 0, pitch: 1.0 },
  [TroopType.Pikeman]: { cue: 'unit-move', volume: 0.22, beats: 1, intervalMs: 0, pitch: 1.0 },
  // 重甲盾兵：1 拍、音量略大、音高偏低，聽起來較沉
  [TroopType.Shield]: { cue: 'unit-move', volume: 0.3, beats: 1, intervalMs: 0, pitch: 0.92 },
  [TroopType.Archer]: { cue: 'unit-move', volume: 0.16, beats: 1, intervalMs: 0, pitch: 1.05 },
  // 騎兵：每次落腳兩聲蹄聲（前後蹄）、間隔 90 毫秒（小於最短步距 0.25 秒）、音高偏高
  [TroopType.Cavalry]: { cue: 'unit-move', volume: 0.28, beats: 2, intervalMs: 90, pitch: 1.08 },
  [TroopType.Engineer]: { cue: 'unit-move', volume: 0.25, beats: 1, intervalMs: 0, pitch: 0.95 },
  [TroopType.Medic]: { cue: 'unit-move', volume: 0.16, beats: 1, intervalMs: 0, pitch: 1.05 },
  [TroopType.Navy]: { cue: 'unit-dodge', volume: 0.2, beats: 1, intervalMs: 0, pitch: 1.0 },
};

const FALLBACK_FOOTSTEP: MoveFootstepSpec = MOVE_FOOTSTEP_TABLE[TroopType.Infantry];

/** 依兵種取腳步聲設定；未知兵種退回步兵。回傳複本，呼叫端改動不影響表。 */
export function moveFootstepFor(troopType: TroopType | string | null | undefined): MoveFootstepSpec {
  const spec = MOVE_FOOTSTEP_TABLE[troopType as TroopType] ?? FALLBACK_FOOTSTEP;
  return { ...spec };
}

export type MoveDustKind = 'dust' | 'none';

export interface MoveDustSpec {
  kind: MoveDustKind;
  /** 單顆塵粒大小倍率（1 = 中等基準） */
  scale: number;
  /** 帶頭者每次落腳揚起的塵粒數下限（含） */
  particleMin: number;
  /** 帶頭者每次落腳揚起的塵粒數上限（含） */
  particleMax: number;
}

const DUST_NONE: MoveDustSpec = { kind: 'none', scale: 0, particleMin: 0, particleMax: 0 };

/** 各兵種揚塵：基準為「中等」（每次落腳 4～7 顆），騎兵較大較多（7～10 顆）、輕裝較小。 */
const DUST_TABLE: Record<TroopType, MoveDustSpec> = {
  [TroopType.Infantry]: { kind: 'dust', scale: 1.0, particleMin: 4, particleMax: 7 },
  [TroopType.Pikeman]: { kind: 'dust', scale: 1.0, particleMin: 4, particleMax: 7 },
  [TroopType.Shield]: { kind: 'dust', scale: 1.1, particleMin: 5, particleMax: 7 },
  [TroopType.Archer]: { kind: 'dust', scale: 0.85, particleMin: 4, particleMax: 6 },
  [TroopType.Cavalry]: { kind: 'dust', scale: 1.35, particleMin: 7, particleMax: 10 },
  [TroopType.Engineer]: { kind: 'dust', scale: 1.1, particleMin: 4, particleMax: 7 },
  [TroopType.Medic]: { kind: 'dust', scale: 0.85, particleMin: 4, particleMax: 6 },
  // 水軍在水上，不出塵
  [TroopType.Navy]: DUST_NONE,
};

/**
 * 依兵種與腳下地形取揚塵設定。
 * 河流格不出塵（水面無塵；河流漂移另有專屬演出）；沙漠塵粒較大較多（×1.25）、森林較小較少（×0.8，草地壓塵）。
 */
export function moveDustFor(troopType: TroopType | string | null | undefined, terrain?: TerrainType | string | null): MoveDustSpec {
  const base = DUST_TABLE[troopType as TroopType] ?? DUST_TABLE[TroopType.Infantry];
  if (base.kind === 'none' || terrain === TerrainType.River) return { ...DUST_NONE };
  const factor = terrain === TerrainType.Desert ? 1.25 : terrain === TerrainType.Forest ? 0.8 : 1;
  return {
    kind: 'dust',
    scale: base.scale * factor,
    particleMin: Math.max(2, Math.round(base.particleMin * factor)),
    particleMax: Math.max(3, Math.round(base.particleMax * factor)),
  };
}

/** 走路一步（落腳到下一次落腳）的動畫秒數：walk 一個週期 0.8 秒、左右腳各一步，落腳在 0.4 與 0.8 秒。 */
export const FOOTFALL_INTERVAL_SEC = 0.4;

/**
 * 走路手感可調參數（PROG-2-9407，總PM 11/18 定案）。
 * - maxAnimationSpeed：步態倍率上限 2.2（2.5 腿會抖得像快轉）。
 * - bobPx：整隊依落腳上下起伏的幅度（畫面像素），落腳瞬間最低、兩步之間最高。
 * 根本解是素材：小兵 walk 與 dash_in 關鍵影格相同、步幅太小，位移比步伐快；換成真正的 walk clip 後可調回。
 */
export const MOVE_GAIT_TUNING = { maxAnimationSpeed: 2.2, bobPx: 3.5 } as const;

/** 依步態時鐘算上下起伏位移：落腳時 0，兩次落腳中間到頂 bobPx。offset 給小隊隊員錯開相位。 */
export function stepBobOffset(clock: number, offset = 0, bobPx: number = MOVE_GAIT_TUNING.bobPx, interval = FOOTFALL_INTERVAL_SEC): number {
  if (!Number.isFinite(clock) || clock < 0 || !(interval > 0) || bobPx === 0) return 0;
  const t = (clock + offset) % interval;
  return bobPx * Math.sin(Math.PI * (t / interval));
}
/** 小隊隊員每次落腳的塵粒數是帶頭者的這個比例（至少 2 顆）：三人同時揚塵量太大，也吃粒子池。 */
export const SQUAD_MEMBER_DUST_RATIO = 0.5;

/**
 * 這一幀跨過幾次落腳（純函式）。
 * @param prevClock 上一幀的步態時鐘（動畫秒，隨 animationSpeed 前進；從 move 動作開始歸零）
 * @param animationSpeed 這一幀的動畫倍率
 * @param dt 這一幀的真實秒數
 * @param offset 這位隊員的相位偏移（動畫秒）；帶頭者為 0，隊員 = 相位 × walk 週期，才會和骨架錯開的腳步對得上
 * @param interval 兩次落腳間隔（動畫秒）；預設小兵 walk 一步，騎兵 trot 由兵種設定傳入（PROG-2-9408）
 */
export function dustBeatsFor(prevClock: number, animationSpeed: number, dt: number, offset = 0, interval = FOOTFALL_INTERVAL_SEC): number {
  if (!(animationSpeed > 0) || !(dt > 0) || !(prevClock >= 0) || !(interval > 0)) return 0;
  const next = prevClock + animationSpeed * dt;
  return Math.floor((next + offset) / interval) - Math.floor((prevClock + offset) / interval);
}

/** 帶頭者這次落腳要揚幾顆；隊員（isLeader=false）取比例並至少 2 顆。rand 為 [0,1) 亂數，由呼叫端注入以利測試。 */
export function dustCountFor(spec: MoveDustSpec, isLeader: boolean, rand: () => number = Math.random): number {
  if (spec.kind === 'none' || spec.particleMax <= 0) return 0;
  const count = spec.particleMin + Math.floor(rand() * (spec.particleMax - spec.particleMin + 1));
  return isLeader ? count : Math.max(2, Math.round(count * SQUAD_MEMBER_DUST_RATIO));
}

/** 塵粒顏色範圍（土黃）：兩端之間隨機取。 */
export const DUST_COLOR_LIGHT = { r: 196, g: 164, b: 106 } as const;
export const DUST_COLOR_DARK = { r: 170, g: 140, b: 90 } as const;
/** 塵粒起始不透明度（0～1），之後線性淡到 0。 */
export const DUST_START_ALPHA = 1.0;

/**
 * 塵粒參數範圍（畫面像素／秒）。11/25 實跑發現舊值（粒徑 16～24、放大 1.8～2.5 倍）柔邊圓點互相疊成一整塊平的沙色團，
 * 改成較小的顆粒、較少放大、較高的上揚與較寬的散布，讓一顆顆塵粒分得開；疊層根節點縮放約 0.6，螢幕像素約為此值 ×0.6。
 * 11/25 第二輪：正常縮放仍看不見，粒徑與不透明度各放大約 1.3～1.4 倍（粒徑 16～24（再加大一次，實跑正常縮放只見淡淡小塊）、起始不透明度 1.0、壽命拉長），散布同步加寬維持離散。
 */
export const DUST_PARTICLE_RANGES = {
  startSize: [16, 24],
  endScale: [1.3, 1.9],
  rise: [40, 75],
  drift: [15, 45],
  jitterX: 24,
  jitterY: 5,
  lifeSec: [0.7, 1.05],
} as const;

export interface DustParticleParams {
  /** 起始粒徑（畫面像素，6～10 × 塵粒大小倍率） */
  startSize: number;
  /** 結束時放大倍率（1.8～2.5） */
  endScale: number;
  /** 往上飄的距離（像素，15～30） */
  rise: number;
  /** 往身後散開的距離（像素，正值 = 朝行進方向的反側；10～28） */
  drift: number;
  /** 起點水平／垂直抖動（像素），避免每顆都從同一點出發 */
  jitterX: number;
  jitterY: number;
  /** 壽命（秒，0.5～0.8） */
  lifeSec: number;
  color: { r: number; g: number; b: number };
}

/** 擲一顆塵粒的參數（純函式；rand 注入）。 */
export function rollDustParticle(spec: MoveDustSpec, rand: () => number = Math.random): DustParticleParams {
  const between = (lo: number, hi: number): number => lo + (hi - lo) * rand();
  const t = rand();
  const lerp = (a: number, b: number): number => Math.round(a + (b - a) * t);
  const r = DUST_PARTICLE_RANGES;
  return {
    startSize: between(r.startSize[0], r.startSize[1]) * spec.scale,
    endScale: between(r.endScale[0], r.endScale[1]),
    rise: between(r.rise[0], r.rise[1]),
    drift: between(r.drift[0], r.drift[1]),
    jitterX: between(-r.jitterX, r.jitterX),
    jitterY: between(-r.jitterY, r.jitterY),
    lifeSec: between(r.lifeSec[0], r.lifeSec[1]),
    color: { r: lerp(DUST_COLOR_LIGHT.r, DUST_COLOR_DARK.r), g: lerp(DUST_COLOR_LIGHT.g, DUST_COLOR_DARK.g), b: lerp(DUST_COLOR_LIGHT.b, DUST_COLOR_DARK.b) },
  };
}

/** 一次落腳的完整拍點：聲音與揚塵共用，呼叫端每逢落腳取一次、兩邊一起發，不各排各的。 */
export interface MoveBeat {
  footstep: MoveFootstepSpec;
  dust: MoveDustSpec;
}

/** 依兵種與腳下地形取一次落腳要出的聲與塵（聲音不受地形影響，只有塵受影響）。 */
export function moveBeatFor(troopType: TroopType | string | null | undefined, terrain?: TerrainType | string | null): MoveBeat {
  return { footstep: moveFootstepFor(troopType), dust: moveDustFor(troopType, terrain) };
}

/** 腳步聲節流狀態：記錄目前視窗起點與已放行次數。 */
export interface MoveSfxThrottleState {
  windowStartMs: number;
  count: number;
}

/** 節流視窗長度（毫秒）與視窗內最多放行次數：多單位同時移動時避免音量疊爆。 */
export const MOVE_SFX_THROTTLE_WINDOW_MS = 120;
export const MOVE_SFX_THROTTLE_MAX_PER_WINDOW = 3;

export function createMoveSfxThrottleState(): MoveSfxThrottleState {
  return { windowStartMs: Number.NEGATIVE_INFINITY, count: 0 };
}

/**
 * 判斷此刻這一拍能不能播；能播就同時登記一次。超過上限的拍直接合併（丟棄）。
 * 時間戳由呼叫端傳入，方便測試。
 */
export function tryAcquireMoveSfx(
  state: MoveSfxThrottleState,
  nowMs: number,
  windowMs: number = MOVE_SFX_THROTTLE_WINDOW_MS,
  maxPerWindow: number = MOVE_SFX_THROTTLE_MAX_PER_WINDOW,
): boolean {
  if (nowMs - state.windowStartMs >= windowMs) {
    state.windowStartMs = nowMs;
    state.count = 0;
  }
  if (state.count >= maxPerWindow) return false;
  state.count += 1;
  return true;
}
