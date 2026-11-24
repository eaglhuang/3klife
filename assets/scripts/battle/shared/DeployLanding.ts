// @spec-source → docs/agent-briefs/tasks/PROG/PROG-2-9409.md（部署落地手感）
/**
 * DeployLanding — 部署落地演出的純計算（PROG-2-9409）。不碰 cc，單元測試可直接跑。
 *
 * 一名士兵的落地分三段（時間 t 以秒計、從他自己開始落下起算）：
 *   t < 0                      還沒輪到他：不顯示（小隊隊員依序落下，所以隊員的 t 會晚一點才 ≥ 0）
 *   0 ≤ t < dropSec            從上方 dropPx 落下，等加速（像重力），落下途中身體略微拉長
 *   dropSec ≤ t < dropSec+squashSec  落地壓扁再彈回（腳不離地，只改縮放）
 *   之後                        回到正常
 * 落地那一瞬間（t 跨過 dropSec）由呼叫端揚塵、出落地聲。
 *
 * 只改表現，不影響部署規則與回合流程。Unity 對照：Animator 裡的一段 Land 曲線 + Animation Event。
 */
import { TroopType } from '../../core/config/Constants';
import { MOVE_FOOTSTEP_MAX_VOLUME, MoveDustSpec, MoveFootstepSpec } from './MoveFeedback';

export const DEPLOY_LANDING_TUNING = {
  /** 起始高度（疊層本地單位；疊層約 0.6 畫面像素／單位，90 ≈ 畫面 54 像素，約半個士兵高） */
  dropPx: 90,
  /** 下落秒數 */
  dropSec: 0.26,
  /** 落地壓扁回彈秒數 */
  squashSec: 0.18,
  /** 壓扁幅度：最扁時高度剩 1 - squash、寬度變 1 + squash × 0.6 */
  squash: 0.16,
  /** 下落途中最多拉長的比例（高度 1 + stretch） */
  stretch: 0.06,
  /** 小隊隊員一個接一個落下的間隔（秒） */
  memberStaggerSec: 0.07,
} as const;

export type DeployLandingTuning = typeof DEPLOY_LANDING_TUNING;

export interface DeployLandingSample {
  /** 是否該顯示（還沒輪到落下的隊員先藏起來） */
  visible: boolean;
  /** 往上的位移（疊層本地單位，0 = 站在地上） */
  dy: number;
  scaleX: number;
  scaleY: number;
}

const RESTING: DeployLandingSample = { visible: true, dy: 0, scaleX: 1, scaleY: 1 };

/** 取樣一名士兵在 t 秒時的落地姿態。t 不是有限數字時視為已落地，不讓壞值把單位藏起來。 */
export function sampleDeployLanding(t: number, tuning: DeployLandingTuning = DEPLOY_LANDING_TUNING): DeployLandingSample {
  if (!Number.isFinite(t)) return { ...RESTING };
  if (t < 0) return { visible: false, dy: tuning.dropPx, scaleX: 1, scaleY: 1 };
  if (t < tuning.dropSec) {
    const u = t / tuning.dropSec;
    return { visible: true, dy: tuning.dropPx * (1 - u * u), scaleX: 1 - tuning.stretch * 0.5 * u, scaleY: 1 + tuning.stretch * u };
  }
  const v = (t - tuning.dropSec) / tuning.squashSec;
  if (v < 1) {
    const k = Math.sin(Math.PI * v);
    return { visible: true, dy: 0, scaleX: 1 + tuning.squash * 0.6 * k, scaleY: 1 - tuning.squash * k };
  }
  return { ...RESTING };
}

/** 第 index 名士兵（0 = 帶頭者）比帶頭者晚多久開始落下。 */
export function memberDeployDelay(index: number, tuning: DeployLandingTuning = DEPLOY_LANDING_TUNING): number {
  return Math.max(0, index) * tuning.memberStaggerSec;
}

/** 整隊 members 人全部落地並回彈完成需要的秒數。 */
export function deployLandingTotalSec(members: number, tuning: DeployLandingTuning = DEPLOY_LANDING_TUNING): number {
  return memberDeployDelay(Math.max(1, members) - 1, tuning) + tuning.dropSec + tuning.squashSec;
}

/** 這一幀（prev → now，皆為該士兵自己的 t）是否剛好落地。 */
export function landingCrossed(prev: number, now: number, tuning: DeployLandingTuning = DEPLOY_LANDING_TUNING): boolean {
  return prev < tuning.dropSec && now >= tuning.dropSec;
}

/**
 * 落地揚塵：一圈往兩側吹開的塵團（實機 11/19：只在腳下出一團、往身後飄，藍色地格上幾乎看不到）。
 * 每團粒子數同走路一步、粒子放大 1.6 倍；沒有塵（水軍、河流格）就照樣不出。
 */
export function deployLandingDust(walk: MoveDustSpec): MoveDustSpec {
  if (walk.kind === 'none') return { ...walk };
  return { ...walk, scale: walk.scale * 1.6 };
}

/**
 * 落地塵團的位置與吹開方向：dx 是相對腳點的水平偏移（疊層本地單位），
 * driftFacing 是傳給揚塵器的「面向」（塵往面向的反側飄），左邊的團往左吹、右邊的團往右吹。
 */
export const DEPLOY_LANDING_PUFFS: ReadonlyArray<{ dx: number; driftFacing: 1 | -1 }> = [
  { dx: -26, driftFacing: 1 }, { dx: -10, driftFacing: 1 }, { dx: 10, driftFacing: -1 }, { dx: 26, driftFacing: -1 },
];

/**
 * 騎術落下特效（data/riding-tiers.json 的 tiers[].deployDrop，PROG-2-9953）：
 * fx 'dust_ring' → 騎兵落地時腳下外圍再加一圈塵團（比基本塵團更寬）；其他 fx 目前沒有素材，不出。
 * sfx 'horse_snort' 目前沒有鼻息素材，由騎兵落地蹄聲代替（deployLandingThud 已是騎兵雙蹄）。
 */
export interface RiderDeployDrop { fx?: string; sfx?: string; }
export const DUST_RING_PUFFS: ReadonlyArray<{ dx: number; driftFacing: 1 | -1 }> = [
  { dx: -46, driftFacing: 1 }, { dx: -34, driftFacing: 1 }, { dx: 34, driftFacing: -1 }, { dx: 46, driftFacing: -1 },
];
/** 依騎術落下設定取要額外放的塵圈位置；騎兵以外或沒有 dust_ring 就回空陣列。 */
export function riderDeployRingPuffs(troopType: TroopType | string | null | undefined, drop: RiderDeployDrop | null | undefined): ReadonlyArray<{ dx: number; driftFacing: 1 | -1 }> {
  return troopType === TroopType.Cavalry && drop?.fx === 'dust_ring' ? DUST_RING_PUFFS : [];
}

/**
 * 落地聲：沿用該兵種的腳步聲（騎兵兩聲蹄響），音量約 1.6 倍但不超過腳步音量上限。
 * 目前沒有專用落地聲；之後有了只改這裡的 cue。
 */
export function deployLandingThud(footstep: MoveFootstepSpec, troopType?: TroopType | string | null): MoveFootstepSpec {
  const beats = troopType === TroopType.Cavalry ? Math.max(2, footstep.beats) : footstep.beats;
  return { ...footstep, beats, volume: Math.min(MOVE_FOOTSTEP_MAX_VOLUME, footstep.volume * 1.6) };
}
