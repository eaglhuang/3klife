import { ActionClip, UnitAction, UnitPresentationConfig } from './UnitPresentationCore';

/** 資源存於私有素材包；遊戲端只保存載入路徑與共用動畫映射。 */
export interface UnitSpineConfig extends UnitPresentationConfig {
  path: string;
  labelToFoot: number;
  /** 骨架原點到雙腳腳底中點，骨架單位、y 向上。 */
  footOffset: { x: number; y: number };
  mirrorSkin?: string;
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
const soldierCache = new Map<boolean, UnitSpineConfig>();
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
export function soldierSpineConfig(isArcher: boolean): UnitSpineConfig {
  const cached = soldierCache.get(isArcher);
  if (cached) return cached;
  const name = isArcher ? 'soldier_bow_red' : 'soldier_spear_blue';
  const config: UnitSpineConfig = { path: `spine/soldiers/${name}/${name}`, displayScale: 0.18, labelToFoot: 110, footOffset: { x: 4, y: 0 },
    walkGroundSpeed: 100, speedMultiplier: 2, mirrorSkin: isArcher ? undefined : 'hand_mirror',
    clips: clips('soldier', isArcher ? 1.2 : 1) };
  soldierCache.set(isArcher, config);
  return config;
}
