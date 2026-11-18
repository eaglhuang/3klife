// PROG-2-9406：戰場移動手感（揚塵＋腳步聲）。純函式、不依賴引擎，供單元測試。
// 只決定「表現層」該播什麼；誰移動、移幾格由戰場核心規則決定，這裡完全不碰。
import { TerrainType, TroopType } from '../../shared/CommonEnums';
import type { BattleAudioCue } from './BattleAudio';

export interface MoveFootstepSpec {
  /** 音效邏輯鍵（實體 clip 由 BattleAudio 的 BATTLE_AUDIO_CLIP_MAP 決定；之後有專用蹄聲、重甲聲，新增 cue 後只改這張表） */
  cue: BattleAudioCue;
  /** 單拍音量（使用者裁決：整體小聲，上限 0.4） */
  volume: number;
  /** 一次移動連播幾拍 */
  beats: number;
  /** 拍與拍的間隔（毫秒）；beats=1 時無作用 */
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
 * 目前只有一個 footstep clip，用「拍數＋間隔＋音量」區分兵種；以下參數皆為推測，未實機聽過。
 * 水軍借 unit-dodge（對應 wave clip）當划水聲，同樣是推測。
 */
export const MOVE_FOOTSTEP_TABLE: Record<TroopType, MoveFootstepSpec> = {
  [TroopType.Infantry]: { cue: 'unit-move', volume: 0.22, beats: 2, intervalMs: 220, pitch: 1.0 },
  [TroopType.Pikeman]: { cue: 'unit-move', volume: 0.22, beats: 2, intervalMs: 240, pitch: 1.0 },
  // 重甲盾兵：1 拍、音量略大、音高偏低，聽起來較沉
  [TroopType.Shield]: { cue: 'unit-move', volume: 0.3, beats: 1, intervalMs: 0, pitch: 0.92 },
  [TroopType.Archer]: { cue: 'unit-move', volume: 0.16, beats: 2, intervalMs: 200, pitch: 1.05 },
  // 騎兵：蹄聲 4 連拍、間隔短、音高偏高
  [TroopType.Cavalry]: { cue: 'unit-move', volume: 0.28, beats: 4, intervalMs: 105, pitch: 1.08 },
  [TroopType.Engineer]: { cue: 'unit-move', volume: 0.25, beats: 2, intervalMs: 280, pitch: 0.95 },
  [TroopType.Medic]: { cue: 'unit-move', volume: 0.16, beats: 2, intervalMs: 210, pitch: 1.05 },
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
  /** 單團大小倍率（1 = 中等基準） */
  scale: number;
  /** 一次移動生出幾團 */
  puffCount: number;
}

const DUST_NONE: MoveDustSpec = { kind: 'none', scale: 0, puffCount: 0 };

/** 各兵種揚塵：基準為「中等」，騎兵較大、輕裝較小。 */
const DUST_TABLE: Record<TroopType, MoveDustSpec> = {
  [TroopType.Infantry]: { kind: 'dust', scale: 1.0, puffCount: 2 },
  [TroopType.Pikeman]: { kind: 'dust', scale: 1.0, puffCount: 2 },
  [TroopType.Shield]: { kind: 'dust', scale: 1.1, puffCount: 2 },
  [TroopType.Archer]: { kind: 'dust', scale: 0.85, puffCount: 2 },
  [TroopType.Cavalry]: { kind: 'dust', scale: 1.35, puffCount: 3 },
  [TroopType.Engineer]: { kind: 'dust', scale: 1.1, puffCount: 2 },
  [TroopType.Medic]: { kind: 'dust', scale: 0.85, puffCount: 2 },
  // 水軍在水上，不出塵
  [TroopType.Navy]: DUST_NONE,
};

/**
 * 依兵種與腳下地形取揚塵設定。
 * 河流格不出塵（水面無塵；河流漂移另有專屬演出）；沙漠較大、森林較小（草地壓塵）。
 */
export function moveDustFor(troopType: TroopType | string | null | undefined, terrain?: TerrainType | string | null): MoveDustSpec {
  const base = DUST_TABLE[troopType as TroopType] ?? DUST_TABLE[TroopType.Infantry];
  if (base.kind === 'none' || terrain === TerrainType.River) return { ...DUST_NONE };
  let scale = base.scale;
  if (terrain === TerrainType.Desert) scale *= 1.25;
  else if (terrain === TerrainType.Forest) scale *= 0.8;
  return { kind: 'dust', scale, puffCount: base.puffCount };
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
