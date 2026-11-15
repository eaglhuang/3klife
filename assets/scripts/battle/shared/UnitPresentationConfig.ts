import { ActionClip, UnitAction, UnitPresentationConfig } from './UnitPresentationCore';

/** 資源存於私有素材包；遊戲端只保存載入路徑與共用動畫映射。 */
export interface UnitSpineConfig extends UnitPresentationConfig {
  path: string;
  labelToFoot: number;
  /** 骨架原點到雙腳腳底中點，骨架單位、y 向上。 */
  footOffset: { x: number; y: number };
  mirrorSkin?: string;
  /**
   * 小隊其餘隊員的站位（畫面像素，x 為面向的後方、y 向上）與動作時間差（0～1）。
   * 不設就是單人。隊員共用帶頭者的骨架與圖集。
   */
  squad?: ReadonlyArray<{ x: number; y: number; phase: number }>;
}
/** 小兵一隊最多 3 人：帶頭者在前，兩名隊員在後方上下錯開。站位以 0.18 顯示縮放（人寬約 58 像素）、格寬約 144 像素抓：要看得出是三個人，又不能站出自己的格子。 */
export const SOLDIER_SQUAD_SLOTS: ReadonlyArray<{ x: number; y: number; phase: number }> = [
  { x: 36, y: 17, phase: 0.35 },
  { x: 42, y: -15, phase: 0.7 },
];
/** 依兵力比例決定小隊顯示人數：滿編 3 人，掉到 2/3 以下剩 2 人，1/3 以下剩 1 人，讓玩家不看數字也知道這隊快沒了。 */
export function squadMemberCount(currentHp: number, maxHp: number, squadSize = SOLDIER_SQUAD_SLOTS.length + 1): number {
  if (!(maxHp > 0) || !(currentHp > 0)) return 1;
  return Math.max(1, Math.min(squadSize, Math.ceil(currentHp / maxHp * squadSize)));
}
const clip = (name: string, duration: number, loop = false): ActionClip => ({ name, duration, loop });
function clips(tier: 'general' | 'soldier', attackDuration: number): Record<UnitAction, ActionClip> {
  return {
    idle: clip('idle', tier === 'general' ? 2 : 1.6, true),
    move: clip('dash_in', tier === 'general' ? 1.2 : 0.8, true),
    retreat: clip('retreat', tier === 'general' ? 1.2 : 0.8, true),
    attack: clip('duel_attack', attackDuration), hit: clip('hit', 0.9),
    dodge: clip('dodge', 0.6), fall: clip('fall', 1.8),
  };
}
const generals: Record<string, { name: string; footX: number }> = {
  zhao_yun: { name: 'zhao_v2', footX: 4.5 }, zhang_fei: { name: 'char2', footX: 15 },
  guan_yu: { name: 'guan_yu', footX: 9 }, lu_bu: { name: 'lu_bu', footX: 9 },
};
const generalCache = new Map<string, UnitSpineConfig>();
const soldierCache = new Map<string, UnitSpineConfig>();
export function generalSpineConfig(id: string, templateId?: string | null): UnitSpineConfig | null {
  const template = templateId?.toLowerCase().replace(/-/g, '_');
  const key = template && generals[template] ? template : id.toLowerCase().replace(/-/g, '_');
  const art = generals[key];
  if (!art) return null;
  let config = generalCache.get(key);
  if (!config) {
    config = { path: `spine/generals/${key}/${art.name}`, displayScale: 0.22, labelToFoot: 230, footOffset: { x: art.footX, y: 0 },
      walkGroundSpeed: 93.33, speedMultiplier: 2, mirrorSkin: 'hand_mirror', clips: clips('general', 1.6) };
    generalCache.set(key, config);
  }
  return config;
}
/**
 * 小兵依兵種（弓／其餘）與陣營選素材：我方藍、敵方紅，戰場上一眼分得出敵我。
 * 紅槍兵與藍弓兵由原圖集換色產生（見 tools_node/battle-chibi/），骨架與動作和原版共用。
 */
export function soldierSpineConfig(isArcher: boolean, isEnemy = false): UnitSpineConfig {
  const name = `soldier_${isArcher ? 'bow' : 'spear'}_${isEnemy ? 'red' : 'blue'}`;
  const cached = soldierCache.get(name);
  if (cached) return cached;
  const config: UnitSpineConfig = { path: `spine/soldiers/${name}/${name}`, displayScale: 0.18, labelToFoot: 110, footOffset: { x: 4, y: 0 },
    walkGroundSpeed: 100, speedMultiplier: 2, mirrorSkin: isArcher ? undefined : 'hand_mirror', squad: SOLDIER_SQUAD_SLOTS,
    clips: clips('soldier', isArcher ? 1.2 : 1) };
  soldierCache.set(name, config);
  return config;
}
