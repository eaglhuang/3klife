// @spec-source → 戰場虎符手牌（PROG-2-0022）、MVP遊戲驗證規格書.md (doc_spec_0045)
/**
 * TallyCardCatalog — 虎符卡片目錄（不依賴 cc）
 *
 * 從 BattleSceneLoader 搬到 core：戰場發牌（battle）與大廳選卡（ui）都要讀同一份目錄，
 * 依 import 邊界只能共用 core / shared。卡片 ID 即 tacticId。
 *
 * Unity 對照：CardDatabase（ScriptableObject），戰鬥場景與選卡場景共用同一個資產。
 */
import { TroopType, TROOP_DEPLOY_COST } from './Constants';
import type {
  BattleSkillTargetMode,
  BattleSkillTiming,
  SkillSourceType,
} from '../../shared/SkillRuntimeContract';
import type { TallyAffinityProfile, TallyCardData } from '../../shared/TallyCardContract';

const TALLY_CARD_ART_RESOURCE_FALLBACK = 'ui/tiger-tally/card-art/troops';
const TALLY_CARD_ART_RESOURCE_BY_TYPE: Record<TroopType, string> = {
  [TroopType.Cavalry]: 'ui/tiger-tally/card-art/troops_cavalry',
  [TroopType.Infantry]: 'ui/tiger-tally/card-art/troops_infantry',
  [TroopType.Shield]: 'ui/tiger-tally/card-art/troops_shield',
  [TroopType.Archer]: 'ui/tiger-tally/card-art/troops_archer',
  [TroopType.Pikeman]: 'ui/tiger-tally/card-art/troops_pikeman',
  [TroopType.Engineer]: 'ui/tiger-tally/card-art/troops_engineer',
  [TroopType.Medic]: 'ui/tiger-tally/card-art/troops_medic',
  [TroopType.Navy]: 'ui/tiger-tally/card-art/troops_navy',
};

function resolveTallyCardArtResource(type: TroopType): string {
  return TALLY_CARD_ART_RESOURCE_BY_TYPE[type] ?? TALLY_CARD_ART_RESOURCE_FALLBACK;
}

/**
 * 根據兵種資料（troops.json + Constants）建立虎符卡片目錄，key = 卡片 ID（tacticId）。
 * Unity 對照：CardDatabase（ScriptableObject）→ Dictionary<string, CardData>
 */
export function buildTallyCardCatalog(): Map<string, TallyCardData> {
  const slots: Array<{
    type: TroopType;
    name: string;
    sub: string;
    rarity: 'normal' | 'rare' | 'epic' | 'legendary' | 'mythic';
    rarityLabel: string;
    stars: string;
    artResource: string;
    traits: string[];
    traitDetails: Array<{ label: string; detail?: string }>;
    abilities: string[];
    abilityDetails: Array<{ name: string; detail?: string }>;
    source: {
      faction: string;
      origin: string;
      sourceType: string;
      obtainHint: string;
    };
    lore: {
      title: string;
      summary: string;
      body: string;
    };
    desc: string;
    /** TRP-13 虎符適性（選填；未填用預設） */
    affinity?: TallyAffinityProfile;
    tacticMeta: {
      tacticId: string;
      battleSkillId: string;
      sourceType: SkillSourceType;
      targetMode: BattleSkillTargetMode;
      timing: BattleSkillTiming;
    };
  }> = [
    {
      type: TroopType.Cavalry,
      name: '虎豹騎',
      sub: '重騎兵',
      rarity: 'normal',
      rarityLabel: 'R',
      stars: '★',
      artResource: resolveTallyCardArtResource(TroopType.Cavalry),
      traits: ['衝鋒', '剋步兵'],
      traitDetails: [
        { label: '衝鋒', detail: '先手突進時提高第一擊輸出。' },
        { label: '剋步兵', detail: '對步兵陣列有額外壓制效果。' },
      ],
      abilities: ['奔襲突破', '鐵騎威懾'],
      abilityDetails: [
        { name: '奔襲突破', detail: '部署後第一輪若未受阻，可獲得額外位移與傷害。' },
        { name: '鐵騎威懾', detail: '逼近敵前排時降低其陣型穩定度。' },
      ],
      source: {
        faction: '魏',
        origin: '曹魏禁軍系重騎',
        sourceType: '名將遺贈虎符',
        obtainHint: '完成魏系名將戰役或高階戰場掉落。',
      },
      lore: {
        title: '曹魏鐵騎之牙',
        summary: '以高速衝鋒與破陣聞名的魏軍精銳重騎。',
        body: '虎豹騎象徵曹魏對精兵速決的信仰，虎符持有者可在戰場上快速投入最具衝擊力的騎兵集群。',
      },
      desc: '機動性最強的精銳鐵騎，能快速突破敵陣。',
      tacticMeta: {
        tacticId: 'tiger-tally-cavalry-shock',
        battleSkillId: 'tiger-charge',
        sourceType: 'tiger-tally' as SkillSourceType,
        targetMode: 'enemy-single' as BattleSkillTargetMode,
        timing: 'active-cast' as BattleSkillTiming,
      },
    },
    {
      type: TroopType.Infantry,
      name: '陷陣營',
      sub: '重步兵',
      rarity: 'rare',
      rarityLabel: 'SR',
      stars: '★★',
      artResource: resolveTallyCardArtResource(TroopType.Infantry),
      traits: ['盾牆', '韌性'],
      traitDetails: [
        { label: '盾牆', detail: '受擊時優先形成正面減傷陣列。' },
        { label: '韌性', detail: '長時間纏戰時維持穩定戰力。' },
      ],
      abilities: ['堅陣不退', '戰線錨定'],
      abilityDetails: [
        { name: '堅陣不退', detail: '被迫迎擊時仍維持防線與反擊效率。' },
        { name: '戰線錨定', detail: '部署於關鍵地塊時提高整排防守穩定度。' },
      ],
      source: {
        faction: '群雄',
        origin: '高順麾下陷陣營',
        sourceType: '名將遺贈虎符',
        obtainHint: '擊敗對應名將後於軍功結算取得。',
      },
      lore: {
        title: '陷陣之鋒',
        summary: '以紀律與裝備完整度著稱的重步方陣。',
        body: '陷陣營的虎符不靠華麗權柄，而靠戰場紀律與持久壓力取勝，是最標準的高階步兵軍令。',
      },
      desc: '堅若磐石的步兵方陣，擅長穩守要地。',
      tacticMeta: {
        tacticId: 'tiger-tally-infantry-wall',
        battleSkillId: 'shield-wall-slam',
        sourceType: 'tiger-tally' as SkillSourceType,
        targetMode: 'enemy-single' as BattleSkillTargetMode,
        timing: 'active-cast' as BattleSkillTiming,
      },
    },
    {
      type: TroopType.Shield,
      name: '大戟士',
      sub: '防禦盾兵',
      rarity: 'legendary',
      rarityLabel: 'UR',
      stars: '★★★★',
      artResource: resolveTallyCardArtResource(TroopType.Shield),
      traits: ['重甲', '剋弓兵'],
      traitDetails: [
        { label: '重甲', detail: '承受遠程與正面斬擊時傷害更低。' },
        { label: '剋弓兵', detail: '面對遠程單位時能有效逼迫其換位。' },
      ],
      abilities: ['盾陣推進', '拒止火力'],
      abilityDetails: [
        { name: '盾陣推進', detail: '維持盾牆形態前進，壓縮敵方射擊空間。' },
        { name: '拒止火力', detail: '抵近後可顯著削弱弓兵輸出節奏。' },
      ],
      source: {
        faction: '魏',
        origin: '重裝近衛步陣',
        sourceType: '軍政工坊鍛造虎符',
        obtainHint: '透過高階軍備鍛造與資源兌換解鎖。',
      },
      lore: {
        title: '重盾拒馬線',
        summary: '以防守與阻滯為核心的重裝大盾兵。',
        body: '大戟士的虎符適合掌控陣線節奏，讓敵軍在正面推進時付出昂貴代價。',
      },
      desc: '以大盾與重甲著稱的防禦核心。',
      tacticMeta: {
        tacticId: 'tiger-tally-shield-line',
        battleSkillId: 'fortress-line',
        sourceType: 'tiger-tally' as SkillSourceType,
        targetMode: 'line' as BattleSkillTargetMode,
        timing: 'active-cast' as BattleSkillTiming,
      },
    },
    {
      type: TroopType.Archer,
      name: '連弩手',
      sub: '遠程弓兵',
      rarity: 'mythic',
      rarityLabel: 'LR',
      stars: '★★★★★',
      artResource: resolveTallyCardArtResource(TroopType.Archer),
      traits: ['穿透', '遠程'],
      traitDetails: [
        { label: '穿透', detail: '集中火力時可持續削減前排耐久。' },
        { label: '遠程', detail: '能在相對安全距離維持穩定輸出。' },
      ],
      abilities: ['弩陣齊射', '壓制掩護'],
      abilityDetails: [
        { name: '弩陣齊射', detail: '短時間內輸出高密度箭雨，迅速壓低血線。' },
        { name: '壓制掩護', detail: '為前排創造安全推進窗口。' },
      ],
      source: {
        faction: '蜀',
        origin: '改良連弩營',
        sourceType: '戰役獎勵虎符',
        obtainHint: '完成蜀系遠征關卡後於結算獲得。',
      },
      lore: {
        title: '連弩連發令',
        summary: '以連續齊射製造壓制區域的高效率遠程兵。',
        body: '連弩手的虎符象徵精密機械與紀律裝填，是在中後排維持輸出節奏的關鍵軍令。',
      },
      desc: '善用強弩齊射的遠程打擊兵種。',
      tacticMeta: {
        tacticId: 'tiger-tally-archer-volley',
        battleSkillId: 'volley-barrage',
        sourceType: 'tiger-tally' as SkillSourceType,
        targetMode: 'area' as BattleSkillTargetMode,
        timing: 'active-cast' as BattleSkillTiming,
      },
    },
  ];

  const TROOP_DEFAULTS: Record<string, { hp: number; attack: number; defense: number; moveRange: number }> = {
    cavalry:  { hp: 100, attack: 40, defense: 20, moveRange: 2 },
    infantry: { hp: 120, attack: 35, defense: 25, moveRange: 1 },
    shield:   { hp: 150, attack: 20, defense: 35, moveRange: 1 },
    archer:   { hp:  80, attack: 30, defense: 15, moveRange: 1 },
  };
  const troopData: Record<string, any> = TROOP_DEFAULTS;

  return new Map(slots.map((s): [string, TallyCardData] => {
    const stats = troopData[s.type as string] || {};
    return [s.tacticMeta.tacticId, {
      unitType:    s.type as string,
      unitName:    s.name,
      unitSub:     s.sub,
      atk:         stats.attack    ?? 0,
      def:         stats.defense   ?? 0,
      hp:          stats.hp        ?? 0,
      spd:         stats.moveRange ?? 1,
      cost:        TROOP_DEPLOY_COST[s.type],
      rarity:      s.rarity,
      rarityLabel: s.rarityLabel,
      stars:       s.stars,
      artResource: s.artResource,
      traits:      s.traits,
      traitDetails: s.traitDetails,
      abilities:   s.abilities,
      abilityDetails: s.abilityDetails,
      source:      s.source,
      lore:        s.lore,
      tacticId:    s.tacticMeta.tacticId,
      battleSkillId: s.tacticMeta.battleSkillId,
      battleSkillSourceType: s.tacticMeta.sourceType,
      targetMode: s.tacticMeta.targetMode,
      timing: s.tacticMeta.timing,
      desc:        s.desc,
      isDisabled:  false,
      affinity:    s.affinity,
    } as TallyCardData];
  }));
}

/** 選卡 UI 用的卡片摘要（ID 與顯示名稱），順序同目錄 */
export function getTallyCardSummaries(): Array<{ id: string; name: string; sub: string }> {
  return Array.from(buildTallyCardCatalog().entries()).map(([id, card]) => ({
    id,
    name: card.unitName,
    sub: card.unitSub,
  }));
}
