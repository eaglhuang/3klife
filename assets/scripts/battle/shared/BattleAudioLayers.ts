// @spec-source → docs/agent-briefs/tasks/PROG/PROG-2-9729.md（戰鬥音效分層）
/**
 * BattleAudioLayers — 戰鬥音效分層的純邏輯（PROG-2-9729）。不碰 cc，單元測試可直接跑。
 *
 * 1. 受擊分輕擊／重擊／擋下／致命四層，各自對應不同 clip 與隨機音量範圍。
 * 2. 腳步分兵種挑 clip（變調版本預先產生，因為引擎不支援 pitch），間隔加 ±jitter 隨機延遲，音量隨機，
 *    並有總量上限（視窗＋每秒），多隊同走不會更吵。
 * 3. 倒地（die）與暴擊（boom）錯開 staggerMs，致命一擊不再疊 boom。
 * 4. 出手音到命中音的間隔上限（只改音效排程時間，不碰動畫）。
 * 5. clipSource 開關（PROG-2-9732）：'cc0' 用 CC0 外部素材取代金屬擊打／肉體悶擊／單拍馬蹄三個變調代用檔，
 *    'pitched' 維持 9729 的變調代用版；兩版檔案都在，方便對照聽。
 * 6. （PROG-2-10134）小兵出手音依兵種（劈砍／槍刺／箭／盾擊／騎兵衝鋒）、受擊音依攻擊方式（byStyle）分檔；
 *    發聲池（pool）限制同時發聲數、類別每秒上限、受擊優先於出手；preload 清單戰前預載；bgm 戰場背景音樂三段。
 * 所有數值在 data/battle-audio-layers.json；讀不到用這裡的預設。
 */
import { TroopType } from '../../shared/CommonEnums';
import { DEFAULT_SFX_VOICE_POOL, parseSfxVoicePoolConfig, type SfxVoicePoolConfig } from './SfxVoicePool';
import { EXTRA_TACTIC_SFX_CLIPS, TACTIC_VFX_EXTRA_GROUPS } from './TacticVfxExtraGroups';
import { DEFAULT_BATTLE_BGM, parseBattleBgmConfig, type BattleBgmConfig } from './BattleBgm';

export type HitTier = 'light' | 'heavy' | 'block' | 'lethal';
export type Range = readonly [number, number];

/**
 * 戰法額外疊層（PROG-2-10215）：同一次施放在主音之外，再於 delayMs 範圍內隨機偏移疊 count 聲（clips 隨機挑一）。
 * 例：水淹疊 3～5 聲水花、回復疊 2～3 聲閃光風鈴。額外疊層算同一施放群組，不另占發聲池名額。
 */
export interface TacticExtraLayer { clips: string[]; volume: Range; delayMs: Range; count: Range }

/** clipVolumeScale：個別 clip 的音量倍率（借用別層音檔時壓低），沒列＝1。 */
export interface HitTierSpec { clips: string[]; volume: Range; clipVolumeScale?: Record<string, number> }

/** 音檔來源：cc0＝CC0 外部素材（預設）；pitched＝變調代用版。 */
export type AudioClipSource = 'cc0' | 'pitched';

export interface BattleAudioLayersConfig {
  clipSource: AudioClipSource;
  /** 變調代用版 clip 名 → CC0 clip 名；clipSource 為 cc0 時才套用 */
  cc0Clips: Record<string, string>;
  hit: {
    heavyMaxHpRatio: number;
    critIsHeavy: boolean;
    shieldTroopBlocks: boolean;
    tiers: Record<HitTier, HitTierSpec>;
    /** 輕擊音節流（PROG-2-10021）：windowMs 內最多 maxPerWindow 聲，避免群體同幀受擊疊音爆音 */
    lightThrottle: { windowMs: number; maxPerWindow: number };
    /** 輕擊依攻擊方式（slash／thrust／bow／shield／charge）換 clip 與音量（PROG-2-10134）；沒列的方式用 tiers.light */
    byStyle: Record<string, HitTierSpec>;
  };
  footstep: {
    clips: Record<string, string>;
    volumeScale: Range;
    nominalIntervalMs: number;
    intervalJitter: number;
    windowMs: number;
    maxPerWindow: number;
    maxPerSecond: number;
  };
  dieBoom: { staggerMs: number; skipBoomOnLethal: boolean };
  attackSfx: { maxGapToImpactSec: number; immediateStyles: string[] };
  /** 小兵出手音（PROG-2-10134）：以攻擊音效鍵（unit-attack-*）為 key，每鍵多個 clip 輪播、各自音量範圍 */
  attack: { clips: Record<string, string[]>; volume: Record<string, Range> };
  /** 戰法分組音效（PROG-2-10190）：以特效分組（fire／water／wind／heal／haste／morale／stun）為 key，每組多個 clip 輪播、各自音量範圍 */
  tactic: { clips: Record<string, string[]>; volume: Record<string, Range>; layers: Record<string, TacticExtraLayer[]> };
  /** 發聲池（PROG-2-10134）：同時發聲上限、優先級、類別每秒上限、人多降音量 */
  pool: SfxVoicePoolConfig;
  /** 戰前預載清單（PROG-2-10134）：這些 clip 在載入戰場時先解碼／暖機，避免第一次播放延遲 */
  preload: string[];
  /** 戰場背景音樂（PROG-2-10134） */
  bgm: BattleBgmConfig;
}

export const DEFAULT_BATTLE_AUDIO_LAYERS: BattleAudioLayersConfig = {
  clipSource: 'cc0',
  cc0Clips: { hit_block: 'cc0_block_metal_bright', hit_heavy: 'cc0_hit_flesh', footstep_hoof: 'cc0_hoof_single' },
  hit: {
    heavyMaxHpRatio: 0.2,
    critIsHeavy: true,
    shieldTroopBlocks: true,
    tiers: {
      light: { clips: ['hit_light', 'hurt', 'weapon', 'bat'], volume: [0.7, 0.9], clipVolumeScale: { weapon: 0.6, bat: 0.6 } },
      heavy: { clips: ['hit_heavy', 'sfx_hit_body_a', 'sfx_hit_body_b'], volume: [0.9, 1.0] },
      block: { clips: ['hit_block', 'sfx_hit_clash', 'sfx_hit_wood'], volume: [0.8, 1.0], clipVolumeScale: { sfx_hit_wood: 0.8 } },
      lethal: { clips: ['hit_lethal'], volume: [0.95, 1.0] },
    },
    lightThrottle: { windowMs: 60, maxPerWindow: 2 },
    byStyle: {
      slash: { clips: ['sfx_hit_blade'], volume: [0.65, 0.85] },
      thrust: { clips: ['sfx_hit_pierce'], volume: [0.65, 0.85] },
      bow: { clips: ['sfx_hit_arrow'], volume: [0.6, 0.8] },
      shield: { clips: ['sfx_hit_wood', 'sfx_hit_clash'], volume: [0.6, 0.8] },
      charge: { clips: ['sfx_hit_body_a', 'sfx_hit_body_b'], volume: [0.7, 0.9] },
    },
  },
  footstep: {
    clips: {
      infantry: 'footstep', pikeman: 'footstep', shield: 'footstep_heavy', engineer: 'footstep_heavy',
      archer: 'footstep_light', medic: 'footstep_light', cavalry: 'footstep_hoof',
    },
    volumeScale: [0.8, 1.0],
    nominalIntervalMs: 180,
    intervalJitter: 0.2,
    windowMs: 120,
    maxPerWindow: 2,
    maxPerSecond: 6,
  },
  dieBoom: { staggerMs: 80, skipBoomOnLethal: true },
  attackSfx: { maxGapToImpactSec: 0.18, immediateStyles: ['bow', 'charge'] },
  // 出手音比受擊小聲（受擊 0.65～0.9、出手 0.45～0.65），混戰時聽得到「被打中」多於「揮出去」
  attack: {
    clips: {
      'unit-attack-common': ['sfx_atk_blade'],
      'unit-attack-thrust': ['sfx_atk_thrust'],
      'unit-attack-shield': ['sfx_atk_shield'],
      'unit-attack-bow': ['sfx_atk_bow', 'sfx_atk_arrow_whoosh'],
      'unit-attack-primary': ['sfx_atk_charge'],
    },
    volume: {
      'unit-attack-common': [0.5, 0.65], 'unit-attack-thrust': [0.5, 0.65], 'unit-attack-shield': [0.5, 0.65],
      'unit-attack-bow': [0.45, 0.6], 'unit-attack-primary': [0.5, 0.65],
    },
  },
  // 戰法分組音效（PROG-2-10190）：與 TacticVfxGroups 的 7 組一一對應；音量比受擊略小，不蓋過命中聲
  tactic: {
    clips: {
      fire: ['tactic_fire'], water: ['tactic_water'], wind: ['tactic_wind'], heal: ['tactic_heal'],
      haste: ['tactic_haste'], morale: ['tactic_morale'], stun: ['tactic_stun'],
      // 第二批 13 組（PROG-2-10236）：沿用既有音檔，與 battle-audio-layers.json 一致
      ...Object.fromEntries(Object.entries(EXTRA_TACTIC_SFX_CLIPS).map(([k, v]) => [k, [...v]])),
    },
    volume: {
      fire: [0.7, 0.85], water: [0.75, 0.9], wind: [0.65, 0.8], heal: [0.8, 0.95],
      haste: [0.65, 0.8], morale: [0.7, 0.85], stun: [0.7, 0.85],
      ...Object.fromEntries(TACTIC_VFX_EXTRA_GROUPS.map(k => [k, [0.65, 0.8] as Range])),
    },
    // PROG-2-10215：水淹＝水花 3～5 聲連續潑濺、回復＝閃光風鈴 2～3 聲
    layers: {
      water: [{ clips: ['tactic_splash_a', 'tactic_splash_b'], volume: [0.5, 0.75], delayMs: [120, 1500], count: [3, 5] }],
      heal: [{ clips: ['tactic_heal_sparkle'], volume: [0.4, 0.6], delayMs: [300, 1100], count: [2, 3] }],
    },
  },
  pool: DEFAULT_SFX_VOICE_POOL,
  preload: [
    'cc0_hoof_single', 'hoof_gallop', 'footstep_hoof', 'skill1', 'skill7',
    'sfx_atk_blade', 'sfx_atk_thrust', 'sfx_atk_bow', 'sfx_atk_arrow_whoosh', 'sfx_atk_shield', 'sfx_atk_charge',
    'sfx_hit_blade', 'sfx_hit_pierce', 'sfx_hit_arrow', 'sfx_hit_clash', 'sfx_hit_wood', 'sfx_hit_body_a', 'sfx_hit_body_b',
    'hit_light', 'hit_heavy', 'hit_lethal', 'cc0_block_metal_bright', 'cc0_hit_flesh', 'die', 'boom',
    'tactic_fire', 'tactic_water', 'tactic_wind', 'tactic_heal', 'tactic_haste', 'tactic_morale', 'tactic_stun',
    'tactic_splash_a', 'tactic_splash_b', 'tactic_heal_sparkle',
  ],
  bgm: DEFAULT_BATTLE_BGM,
};

function num(v: unknown, fallback: number, min = 0, max = Number.POSITIVE_INFINITY): number {
  return typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : fallback;
}

function range(v: unknown, fallback: Range): Range {
  if (!Array.isArray(v) || v.length !== 2) return fallback;
  const a = num(v[0], NaN, 0, 1);
  const b = num(v[1], NaN, 0, 1);
  if (Number.isNaN(a) || Number.isNaN(b) || a > b) return fallback;
  return [a, b];
}

/** 不限 0～1 的範圍（毫秒、次數用）：[min,max]，min≥0 且 min≤max，否則用預設。 */
function rangeAny(v: unknown, fallback: Range): Range {
  if (!Array.isArray(v) || v.length !== 2) return fallback;
  const a = num(v[0], NaN, 0, 60000);
  const b = num(v[1], NaN, 0, 60000);
  if (Number.isNaN(a) || Number.isNaN(b) || a > b) return fallback;
  return [a, b];
}

function scaleMap(v: unknown, fallback?: Record<string, number>): Record<string, number> | undefined {
  if (!v || typeof v !== 'object') return fallback;
  const out: Record<string, number> = {};
  for (const [k, x] of Object.entries(v as Record<string, unknown>)) if (typeof x === 'number' && x > 0 && x <= 2) out[k] = x;
  return out;
}

function strList(v: unknown, fallback: string[]): string[] {
  if (!Array.isArray(v)) return fallback;
  const list = v.filter((s): s is string => typeof s === 'string' && s.length > 0);
  return list.length > 0 ? list : fallback;
}

/** 讀設定檔內容；欄位缺漏或格式不對就用預設，不丟例外。 */
export function parseBattleAudioLayersConfig(raw: unknown): BattleAudioLayersConfig {
  const d = DEFAULT_BATTLE_AUDIO_LAYERS;
  const root = (raw && typeof raw === 'object' ? raw : {}) as Record<string, any>;
  const hit = (root.hit ?? {}) as Record<string, any>;
  const tiers = {} as Record<HitTier, HitTierSpec>;
  for (const t of ['light', 'heavy', 'block', 'lethal'] as HitTier[]) {
    const src = (hit.tiers?.[t] ?? {}) as Record<string, unknown>;
    tiers[t] = {
      clips: strList(src.clips, d.hit.tiers[t].clips),
      volume: range(src.volume, d.hit.tiers[t].volume),
      clipVolumeScale: scaleMap(src.clipVolumeScale, d.hit.tiers[t].clipVolumeScale),
    };
  }
  const fs = (root.footstep ?? {}) as Record<string, any>;
  const clips: Record<string, string> = { ...d.footstep.clips };
  if (fs.clips && typeof fs.clips === 'object') {
    for (const [k, v] of Object.entries(fs.clips as Record<string, unknown>)) if (typeof v === 'string' && v) clips[k] = v;
  }
  const db = (root.dieBoom ?? {}) as Record<string, unknown>;
  const as = (root.attackSfx ?? {}) as Record<string, unknown>;
  const cc0Clips: Record<string, string> = { ...d.cc0Clips };
  if (root.cc0Clips && typeof root.cc0Clips === 'object') {
    for (const [k, v] of Object.entries(root.cc0Clips as Record<string, unknown>)) if (typeof v === 'string' && v) cc0Clips[k] = v;
  }
  return {
    clipSource: root.clipSource === 'pitched' || root.clipSource === 'cc0' ? root.clipSource : d.clipSource,
    cc0Clips,
    hit: {
      heavyMaxHpRatio: num(hit.heavyMaxHpRatio, d.hit.heavyMaxHpRatio, 0, 1),
      critIsHeavy: typeof hit.critIsHeavy === 'boolean' ? hit.critIsHeavy : d.hit.critIsHeavy,
      shieldTroopBlocks: typeof hit.shieldTroopBlocks === 'boolean' ? hit.shieldTroopBlocks : d.hit.shieldTroopBlocks,
      tiers,
      lightThrottle: {
        windowMs: num((hit.lightThrottle ?? {}).windowMs, d.hit.lightThrottle.windowMs),
        maxPerWindow: num((hit.lightThrottle ?? {}).maxPerWindow, d.hit.lightThrottle.maxPerWindow),
      },
      byStyle: parseByStyle(hit.byStyle, d.hit.byStyle),
    },
    footstep: {
      clips,
      volumeScale: range(fs.volumeScale, d.footstep.volumeScale),
      nominalIntervalMs: num(fs.nominalIntervalMs, d.footstep.nominalIntervalMs),
      intervalJitter: num(fs.intervalJitter, d.footstep.intervalJitter, 0, 1),
      windowMs: num(fs.windowMs, d.footstep.windowMs),
      maxPerWindow: num(fs.maxPerWindow, d.footstep.maxPerWindow),
      maxPerSecond: num(fs.maxPerSecond, d.footstep.maxPerSecond),
    },
    dieBoom: {
      staggerMs: num(db.staggerMs, d.dieBoom.staggerMs),
      skipBoomOnLethal: typeof db.skipBoomOnLethal === 'boolean' ? db.skipBoomOnLethal : d.dieBoom.skipBoomOnLethal,
    },
    attackSfx: {
      maxGapToImpactSec: num(as.maxGapToImpactSec, d.attackSfx.maxGapToImpactSec),
      immediateStyles: strList(as.immediateStyles, d.attackSfx.immediateStyles),
    },
    attack: parseAttack(root.attack, d.attack),
    tactic: parseTactic(root.tactic, d.tactic),
    pool: parseSfxVoicePoolConfig(root.pool),
    preload: strList(root.preload, d.preload),
    bgm: parseBattleBgmConfig(root.bgm),
  };
}

function parseByStyle(v: unknown, fallback: Record<string, HitTierSpec>): Record<string, HitTierSpec> {
  if (!v || typeof v !== 'object') return fallback;
  const out: Record<string, HitTierSpec> = {};
  for (const [style, spec] of Object.entries(v as Record<string, any>)) {
    const clips = strList(spec?.clips, []);
    if (clips.length === 0) continue;
    out[style] = { clips, volume: range(spec?.volume, [0.65, 0.85]), clipVolumeScale: scaleMap(spec?.clipVolumeScale) };
  }
  return Object.keys(out).length > 0 ? out : fallback;
}

function parseTactic(v: unknown, fallback: BattleAudioLayersConfig['tactic']): BattleAudioLayersConfig['tactic'] {
  if (!v || typeof v !== 'object') return fallback;
  const src = v as Record<string, any>;
  const clips: Record<string, string[]> = { ...fallback.clips };
  const volume: Record<string, Range> = { ...fallback.volume };
  if (src.clips && typeof src.clips === 'object') for (const [k, list] of Object.entries(src.clips as Record<string, unknown>)) { const l = strList(list, []); if (l.length) clips[k] = l; }
  if (src.volume && typeof src.volume === 'object') for (const [k, r] of Object.entries(src.volume as Record<string, unknown>)) volume[k] = range(r, volume[k] ?? [0.7, 0.85]);
  const layers: Record<string, TacticExtraLayer[]> = { ...fallback.layers };
  if (src.layers && typeof src.layers === 'object') {
    for (const [k, list] of Object.entries(src.layers as Record<string, unknown>)) {
      if (!Array.isArray(list)) continue;
      const parsed: TacticExtraLayer[] = [];
      for (const it of list as Record<string, any>[]) {
        const c = strList(it?.clips, []);
        if (c.length === 0) continue;
        parsed.push({ clips: c, volume: range(it?.volume, [0.5, 0.7]), delayMs: rangeAny(it?.delayMs, [100, 1000]), count: rangeAny(it?.count, [1, 1]) });
      }
      layers[k] = parsed; // 設成空陣列即關閉該組疊層
    }
  }
  return { clips, volume, layers };
}

function parseAttack(v: unknown, fallback: BattleAudioLayersConfig['attack']): BattleAudioLayersConfig['attack'] {
  if (!v || typeof v !== 'object') return fallback;
  const src = v as Record<string, any>;
  const clips: Record<string, string[]> = { ...fallback.clips };
  const volume: Record<string, Range> = { ...fallback.volume };
  if (src.clips && typeof src.clips === 'object') for (const [k, list] of Object.entries(src.clips as Record<string, unknown>)) { const l = strList(list, []); if (l.length) clips[k] = l; }
  if (src.volume && typeof src.volume === 'object') for (const [k, r] of Object.entries(src.volume as Record<string, unknown>)) volume[k] = range(r, volume[k] ?? [0.5, 0.65]);
  return { clips, volume };
}

/** 在 [min,max] 內取值；rand 為 0~1 亂數（可注入，方便測試）。 */
export function pickInRange(r: Range, rand: () => number = Math.random): number {
  return r[0] + (r[1] - r[0]) * Math.min(1, Math.max(0, rand()));
}

export interface HitTierInput {
  /** 這一下實際傷害與被打者最大生命（用來算重擊門檻） */
  damage: number;
  maxHp: number;
  isCrit: boolean;
  /** 被打者是否倒下 */
  lethal: boolean;
  /** 護盾吸收（被格擋） */
  blocked: boolean;
  /** 被打者兵種 */
  defenderType?: TroopType | string | null;
}

/** 受擊分層：致命 > 擋下（被格擋）> 重擊 > 盾兵吃輕擊（擋下）> 輕擊。 */
export function resolveHitTier(input: HitTierInput, cfg: BattleAudioLayersConfig = DEFAULT_BATTLE_AUDIO_LAYERS): HitTier {
  if (input.lethal) return 'lethal';
  const heavy = (cfg.hit.critIsHeavy && input.isCrit) || (input.maxHp > 0 && input.damage >= input.maxHp * cfg.hit.heavyMaxHpRatio);
  if (input.blocked) return 'block';
  if (heavy) return 'heavy';
  if (cfg.hit.shieldTroopBlocks && input.defenderType === TroopType.Shield) return 'block';
  return 'light';
}

/** 依 clipSource 把邏輯 clip 名換成實際播放的檔名：cc0 版查替換表，pitched 版原樣。 */
export function resolveClipName(clip: string, cfg: BattleAudioLayersConfig = DEFAULT_BATTLE_AUDIO_LAYERS): string {
  return cfg.clipSource === 'cc0' ? (cfg.cc0Clips[clip] ?? clip) : clip;
}

export interface PickedSfx { clip: string; volume: number }

/** 受擊音選檔狀態：各層上一次播的 clip（避免連續兩次相同）＋輕擊最近播放時間戳（節流用）。 */
export interface HitSfxState { lastClip: Record<string, string>; lightRecent: number[] }

export function createHitSfxState(): HitSfxState {
  return { lastClip: {}, lightRecent: [] };
}

/**
 * 依層挑 clip 與隨機音量。給了 state 且池內有 2 個以上 clip 時，不會連續兩次挑到同一個；
 * 池為空（設定被清空）回傳 clip 為空字串，呼叫端應退回舊 cue 不崩。
 */
export function pickHitSfx(tier: HitTier, cfg: BattleAudioLayersConfig = DEFAULT_BATTLE_AUDIO_LAYERS, rand: () => number = Math.random, state?: HitSfxState, attackStyle?: string | null): PickedSfx {
  // PROG-2-10134：輕擊依攻擊方式換檔（刀劈、槍刺、箭、盾、騎兵各一種受擊聲）；輪播狀態獨立記在 'light:<style>'
  const styled = tier === 'light' && attackStyle ? cfg.hit.byStyle[attackStyle] : undefined;
  const spec = styled ?? cfg.hit.tiers[tier];
  const key = styled ? 'light:' + attackStyle : tier;
  const pool = spec?.clips ?? [];
  if (pool.length === 0) return { clip: '', volume: pickInRange(spec?.volume ?? [1, 1], rand) };
  const last = state?.lastClip[key];
  const candidates = pool.length > 1 && last !== undefined ? pool.filter(c => c !== last) : pool;
  const list = candidates.length > 0 ? candidates : pool;
  const raw = list[Math.min(list.length - 1, Math.floor(rand() * list.length))];
  if (state) state.lastClip[key] = raw;
  const scale = spec.clipVolumeScale?.[raw] ?? 1;
  return { clip: resolveClipName(raw, cfg), volume: pickInRange(spec.volume, rand) * scale };
}

/** 小兵出手音選檔（PROG-2-10134）：依攻擊音效鍵挑 clip（多檔輪播、不連續重複）與音量；沒設定回 null（呼叫端退回舊 cue）。 */
export function pickUnitAttackSfx(cueKey: string, cfg: BattleAudioLayersConfig = DEFAULT_BATTLE_AUDIO_LAYERS, rand: () => number = Math.random, state?: HitSfxState): PickedSfx | null {
  const pool = cfg.attack.clips[cueKey];
  if (!pool || pool.length === 0) return null;
  const stateKey = 'attack:' + cueKey;
  const last = state?.lastClip[stateKey];
  const filtered = pool.length > 1 && last !== undefined ? pool.filter(c => c !== last) : pool;
  const list = filtered.length > 0 ? filtered : pool;
  const raw = list[Math.min(list.length - 1, Math.floor(rand() * list.length))];
  if (state) state.lastClip[stateKey] = raw;
  return { clip: resolveClipName(raw, cfg), volume: pickInRange(cfg.attack.volume[cueKey] ?? [0.5, 0.65], rand) };
}

/** 戰法分組音效選檔（PROG-2-10190）：依特效分組挑 clip（多檔輪播、不連續重複）與音量；該組沒設定回 null（不播）。 */
export function pickTacticSfx(group: string, cfg: BattleAudioLayersConfig = DEFAULT_BATTLE_AUDIO_LAYERS, rand: () => number = Math.random, state?: HitSfxState): PickedSfx | null {
  const pool = cfg.tactic.clips[group];
  if (!pool || pool.length === 0) return null;
  const stateKey = 'tactic:' + group;
  const last = state?.lastClip[stateKey];
  const filtered = pool.length > 1 && last !== undefined ? pool.filter(c => c !== last) : pool;
  const list = filtered.length > 0 ? filtered : pool;
  const raw = list[Math.min(list.length - 1, Math.floor(rand() * list.length))];
  if (state) state.lastClip[stateKey] = raw;
  return { clip: resolveClipName(raw, cfg), volume: pickInRange(cfg.tactic.volume[group] ?? [0.7, 0.85], rand) };
}

export interface PickedTacticLayer extends PickedSfx { delayMs: number }

/**
 * 戰法額外疊層排程（PROG-2-10215）：每個疊層設定依 count 範圍取整數聲數，各自在 delayMs 範圍隨機偏移，
 * 同一疊層相鄰兩聲至少隔 minGapMs（避開統一閘門的同 clip 60ms 合併）；結果依延遲排序。該組沒設定回空陣列。
 */
export function pickTacticLayers(group: string, cfg: BattleAudioLayersConfig = DEFAULT_BATTLE_AUDIO_LAYERS, rand: () => number = Math.random, minGapMs = 90): PickedTacticLayer[] {
  const out: PickedTacticLayer[] = [];
  for (const layer of cfg.tactic.layers[group] ?? []) {
    const n = Math.max(0, Math.round(pickInRange(layer.count, rand)));
    const delays: number[] = [];
    for (let i = 0; i < n; i++) delays.push(pickInRange(layer.delayMs, rand));
    delays.sort((a, b) => a - b);
    for (let i = 1; i < delays.length; i++) if (delays[i] - delays[i - 1] < minGapMs) delays[i] = delays[i - 1] + minGapMs;
    for (const d of delays) {
      const clip = layer.clips[Math.min(layer.clips.length - 1, Math.floor(rand() * layer.clips.length))];
      out.push({ clip: resolveClipName(clip, cfg), volume: pickInRange(layer.volume, rand), delayMs: Math.round(d) });
    }
  }
  return out.sort((a, b) => a.delayMs - b.delayMs);
}

/** 輕擊音這一刻能不能播（windowMs 內最多 maxPerWindow 聲）；能播就登記。非輕擊層不節流，永遠 true。 */
export function tryAcquireHitSfx(state: HitSfxState, tier: HitTier, nowMs: number, cfg: BattleAudioLayersConfig = DEFAULT_BATTLE_AUDIO_LAYERS): boolean {
  if (tier !== 'light') return true;
  const t = cfg.hit.lightThrottle;
  state.lightRecent = state.lightRecent.filter(x => nowMs - x < t.windowMs);
  if (state.lightRecent.length >= t.maxPerWindow) return false;
  state.lightRecent.push(nowMs);
  return true;
}

/** 兵種腳步 clip；沒設定回傳 null（呼叫端退回舊 cue，例如水軍划水聲）。 */
export function footstepClipFor(troopType: TroopType | string | null | undefined, cfg: BattleAudioLayersConfig = DEFAULT_BATTLE_AUDIO_LAYERS): string | null {
  const clip = cfg.footstep.clips[troopType as string];
  return clip ? resolveClipName(clip, cfg) : null;
}

/** 腳步音量＝兵種基準音量 × 隨機倍率。 */
export function jitterFootstepVolume(base: number, cfg: BattleAudioLayersConfig = DEFAULT_BATTLE_AUDIO_LAYERS, rand: () => number = Math.random): number {
  return base * pickInRange(cfg.footstep.volumeScale, rand);
}

/**
 * 腳步落腳的延遲（毫秒）：聲音不能比落腳早，所以在 [0, 2×jitter×間隔] 隨機延後，
 * 平均延後 jitter×間隔、波動 ±jitter（預設 ±20%），聽起來不再等距。
 */
export function footstepDelayMs(cfg: BattleAudioLayersConfig = DEFAULT_BATTLE_AUDIO_LAYERS, rand: () => number = Math.random): number {
  const f = cfg.footstep;
  return pickInRange([0, 2 * f.intervalJitter * f.nominalIntervalMs], rand);
}

/** 腳步總量節流狀態：視窗計數＋最近一秒時間戳（所有兵種共用一份）。 */
export interface FootstepCapState { windowStartMs: number; windowCount: number; recent: number[] }

export function createFootstepCapState(): FootstepCapState {
  return { windowStartMs: Number.NEGATIVE_INFINITY, windowCount: 0, recent: [] };
}

/** 這一拍腳步能不能播（視窗上限＋每秒上限，所有兵種合計）；能播就登記。 */
export function tryAcquireFootstep(state: FootstepCapState, nowMs: number, cfg: BattleAudioLayersConfig = DEFAULT_BATTLE_AUDIO_LAYERS): boolean {
  const f = cfg.footstep;
  state.recent = state.recent.filter(t => nowMs - t < 1000);
  if (state.recent.length >= f.maxPerSecond) return false;
  const newWindow = nowMs - state.windowStartMs >= f.windowMs;
  const count = newWindow ? 0 : state.windowCount;
  if (count >= f.maxPerWindow) return false;
  if (newWindow) state.windowStartMs = nowMs;
  state.windowCount = count + 1;
  state.recent.push(nowMs);
  return true;
}

/**
 * 倒地聲與暴擊聲錯開：兩者之一播出後 staggerMs 內，另一個延後到間隔夠為止。
 * 回傳需要延遲的毫秒（0＝現在就播），並登記實際播出時間。
 */
export class DieBoomStagger {
  private lastDieMs = Number.NEGATIVE_INFINITY;
  private lastBoomMs = Number.NEGATIVE_INFINITY;

  constructor(private staggerMs: number = DEFAULT_BATTLE_AUDIO_LAYERS.dieBoom.staggerMs) {}

  public setStaggerMs(ms: number): void { this.staggerMs = ms; }

  public delayFor(kind: 'die' | 'boom', nowMs: number): number {
    const other = kind === 'die' ? this.lastBoomMs : this.lastDieMs;
    const gap = nowMs - other; // 另一個已排在未來時 gap 為負
    const wait = gap < this.staggerMs ? this.staggerMs - gap : 0;
    const at = nowMs + wait;
    if (kind === 'die') this.lastDieMs = at; else this.lastBoomMs = at;
    return Number.isFinite(wait) ? wait : 0;
  }

  public reset(): void { this.lastDieMs = Number.NEGATIVE_INFINITY; this.lastBoomMs = Number.NEGATIVE_INFINITY; }
}

/** 暴擊聲要不要播：致命一擊且設定為跳過時不疊 boom（已有 hit_lethal＋die）。 */
export function shouldPlayCritBoom(lethal: boolean, cfg: BattleAudioLayersConfig = DEFAULT_BATTLE_AUDIO_LAYERS): boolean {
  return !(lethal && cfg.dieBoom.skipBoomOnLethal);
}

/**
 * 出手音的延遲秒數：讓出手音到命中音的間隔不超過 maxGapToImpactSec（出手音改在揮動中段響）。
 * 弓箭（箭矢真的在飛）與騎兵衝撞（本來就短）維持出手當下。只改音效排程，不碰動畫。
 */
export function attackSfxDelaySec(impactSec: number, style: string, cfg: BattleAudioLayersConfig = DEFAULT_BATTLE_AUDIO_LAYERS): number {
  if (cfg.attackSfx.immediateStyles.includes(style)) return 0;
  return Math.max(0, impactSec - cfg.attackSfx.maxGapToImpactSec);
}
