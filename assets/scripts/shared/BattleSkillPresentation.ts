// @spec-source → 戰法系統.md (doc_spec_0038)、主戰場UI規格書.md (doc_ui_0001)；PROG-2-1429 依建檔紀錄補標出處
import { Faction } from './CommonEnums';
import { SkillSourceType } from './SkillRuntimeContract';

export interface BattleSkillPresentation {
  name: string;
  /** 類別標籤（已翻譯，顯示用）；未掛 translator 時為繁中原文 */
  categoryTag: string;
  /** 類別繁中原文（與語系無關），供 TileSkillCategory 等邏輯對照 */
  categoryZh: string;
  /** 效果說明（已翻譯，顯示用，含【類別】前綴） */
  effectStatus: string;
}

/** i18n 查詢：鍵 + 可選 {0}{1} 佔位參數；缺條目時回傳鍵本身 */
export type BattleSkillNameTranslate = (key: string, ...args: string[]) => string;

let translate: BattleSkillNameTranslate | null = null;

/** 遊戲啟動時把 i18n 查詢掛上來；未掛上（例如純邏輯測試）時退回繁中原文或 battleSkillId。 */
export function setBattleSkillNameTranslator(fn: BattleSkillNameTranslate | null): void {
  translate = fn;
}

/** 招式名鍵：battle.skill_name.<battleSkillId> */
export function battleSkillNameKey(skillId: string): string {
  return `battle.skill_name.${skillId}`;
}

/** 效果說明鍵：battle.skill_effect.<battleSkillId>（字串含【類別】前綴） */
export function battleSkillEffectKey(skillId: string): string {
  return `battle.skill_effect.${skillId}`;
}

/** 類別標籤鍵：battle.skill_category.<categoryId>（categoryId 為英文小寫代號） */
export function battleSkillCategoryKey(categoryId: string): string {
  return `battle.skill_category.${categoryId}`;
}

function translated(key: string, fallback: string, ...args: string[]): string {
  if (!translate) return fallback;
  const text = translate(key, ...args);
  return text && text !== key ? text : fallback;
}

type PresentationRow = { categoryId: string; categoryZh: string };

const DEFAULT_ROW: PresentationRow = { categoryId: 'tactic', categoryZh: '戰術' };

/**
 * 招式表：每個 battleSkillId 對應類別代號與繁中原文類別。
 * 招式名、效果說明、類別標籤全部走 i18n（見 tests/BattleSkillNames.test.ts）。
 */
const PRESENTATION_BY_SKILL_ID: Record<string, PresentationRow> = {
  // 通用奧義；id 與名稱要和 GAME_CONFIG.genericUltimate 一致（共用層不引用 Constants，所以這裡寫字面值）
  'generic-all-out-charge': { categoryId: 'assault', categoryZh: '突擊' },
  'zhang-fei-roar': { categoryId: 'control', categoryZh: '控制' },
  // 五位初始名將的第一階專屬奧義（PROG-2-9327）
  'wei-yan-ziwu-raid': { categoryId: 'pierce', categoryZh: '貫穿' },
  'xiahou-dun-eye-devour': { categoryId: 'recover', categoryZh: '回復' },
  'zhang-he-adaptive-camp': { categoryId: 'reaction', categoryZh: '再動' },
  'sun-ce-conqueror': { categoryId: 'sweep', categoryZh: '橫掃' },
  'gan-ning-night-raid': { categoryId: 'control', categoryZh: '控制' },
  'cao-cao-tactics': { categoryId: 'breach', categoryZh: '破陣' },
  'guan-yu-slash': { categoryId: 'slash', categoryZh: '斬擊' },
  'lu-bu-rampage': { categoryId: 'burst', categoryZh: '爆發' },
  'zhao-yun-pierce': { categoryId: 'assault', categoryZh: '突擊' },
  'zhuge-liang-storm': { categoryId: 'range', categoryZh: '範圍' },
  'zhou-yu-inferno': { categoryId: 'fire', categoryZh: '火攻' },
  'sun-quan-tide': { categoryId: 'formation', categoryZh: '陣列' },
  'liu-bei-rally': { categoryId: 'support', categoryZh: '支援' },
  'diao-chan-charm': { categoryId: 'charm', categoryZh: '魅惑' },
  'cao-zhi-verse': { categoryId: 'literary', categoryZh: '文擊' },
  'guo-jia-foresight': { categoryId: 'stratagem', categoryZh: '奇策' },
  'sima-yi-shadow': { categoryId: 'suppress', categoryZh: '壓制' },
  'sow-discord': { categoryId: 'sow', categoryZh: '離間' },
  // 以下 23 個原本沒有招式名（顯示英文 id）；名稱取自 ultimate-definitions／tactic-library 的既有定名
  'cao-cao-revelry': { categoryId: 'morale', categoryZh: '鼓舞' },
  'cao-cao-ult-control': { categoryId: 'control', categoryZh: '控制' },
  'cao-cao-ult-revive': { categoryId: 'revive', categoryZh: '復活' },
  'eight-formation': { categoryId: 'array', categoryZh: '陣法' },
  'empty-fort': { categoryId: 'stratagem', categoryZh: '奇策' },
  'insp-combo-attack': { categoryId: 'combo', categoryZh: '連擊' },
  'insp-dragon-gall': { categoryId: 'duel', categoryZh: '單挑' },
  'insp-haste': { categoryId: 'haste', categoryZh: '疾行' },
  'insp-lance-thrust': { categoryId: 'assault', categoryZh: '突擊' },
  'insp-night-raid': { categoryId: 'nightraid', categoryZh: '夜襲' },
  'insp-shield': { categoryId: 'defense', categoryZh: '防禦' },
  'insp-sworn-fury': { categoryId: 'assault', categoryZh: '突擊' },
  'insp-taunt': { categoryId: 'taunt', categoryZh: '挑釁' },
  'lian-huan-chain': { categoryId: 'chain', categoryZh: '連環' },
  'liu-bei-reset': { categoryId: 'reset', categoryZh: '重置' },
  'medical-aid': { categoryId: 'medic', categoryZh: '醫療' },
  'mentor-morale': { categoryId: 'morale', categoryZh: '鼓舞' },
  'mentor-slow': { categoryId: 'slow', categoryZh: '緩速' },
  'tally-charge': { categoryId: 'charge', categoryZh: '衝鋒' },
  'tally-fire-chain': { categoryId: 'fire', categoryZh: '火攻' },
  'tally-wei-zhen-hua-xia': { categoryId: 'awe', categoryZh: '威震' },
  'tally-wushuang': { categoryId: 'breakthrough', categoryZh: '衝陣' },
  'zhao-yun-immortal': { categoryId: 'invincible', categoryZh: '無敵' },
  // PROG-2-10246：武將天生戰法模板用到、原本沒有招式名的虎符／專屬招式
  'wei-zhen-reset': { categoryId: 'reset', categoryZh: '重置' },
  'tally-fire-god-hunt': { categoryId: 'fire', categoryZh: '火攻' },
  'tally-link': { categoryId: 'chain', categoryZh: '連環' },
  'tally-poison-arrow': { categoryId: 'pierce', categoryZh: '貫穿' },
  'tally-hundred-steps': { categoryId: 'pierce', categoryZh: '貫穿' },
  'tally-defense-pierce': { categoryId: 'pierce', categoryZh: '貫穿' },
  'you-qi-counter': { categoryId: 'defense', categoryZh: '防禦' },
  'tally-counter-weak': { categoryId: 'defense', categoryZh: '防禦' },
  'tally-changban-root': { categoryId: 'control', categoryZh: '控制' },
  'tally-changban-push': { categoryId: 'control', categoryZh: '控制' },
};

/** 所有有招式表的 battleSkillId（測試用：每個可施放 id 都應能解出招式名與效果說明） */
export function battleSkillPresentationIds(): string[] {
  return Object.keys(PRESENTATION_BY_SKILL_ID);
}

/** 所有出現過的類別代號（測試用：每個類別在四語系都要有標籤） */
export function battleSkillCategoryIds(): string[] {
  const ids = new Set<string>([DEFAULT_ROW.categoryId]);
  for (const row of Object.values(PRESENTATION_BY_SKILL_ID)) ids.add(row.categoryId);
  return Array.from(ids).sort();
}

function resolveBattleSkillName(skillId: string): string {
  return translated(battleSkillNameKey(skillId), skillId);
}

export function getBattleSkillPresentation(skillId: string): BattleSkillPresentation {
  const hasRow = Object.prototype.hasOwnProperty.call(PRESENTATION_BY_SKILL_ID, skillId);
  const row = hasRow ? PRESENTATION_BY_SKILL_ID[skillId] : DEFAULT_ROW;
  const categoryTag = translated(battleSkillCategoryKey(row.categoryId), row.categoryZh);
  const name = resolveBattleSkillName(skillId);
  const effectStatus = hasRow
    ? translated(battleSkillEffectKey(skillId), `【${categoryTag}】${skillId}`)
    : translated('battle.skill_effect.fallback', `【${categoryTag}】${skillId} 生效`, categoryTag, skillId);
  return { name, categoryTag, categoryZh: row.categoryZh, effectStatus };
}

export function buildBattleSkillUsedMessage(
  skillId: string,
  faction: Faction,
  sourceType?: SkillSourceType,
  generalName?: string,
): string {
  const presentation = getBattleSkillPresentation(skillId);
  // AI武將強度 G-2（PROG-2-1469）：敵將有名字時改用敵將發動文案，奧義加全軍警示
  if (faction === Faction.Enemy && generalName) {
    return sourceType === SkillSourceType.Ultimate
      ? `危急！敵將 ${generalName} 發動奧義——${presentation.name}！全軍戒備！`
      : `敵將 ${generalName} 發動戰法——${presentation.name}！`;
  }
  const who = faction === Faction.Player ? '我方' : '敵方';
  const sourceLabel = sourceType === SkillSourceType.Ultimate ? '奧義' : '戰法';
  return `${who}${sourceLabel}【${presentation.categoryTag}】：${presentation.name}`;
}

export function buildBattleSkillAimingMessage(skillId: string, sourceType?: SkillSourceType): string {
  const presentation = getBattleSkillPresentation(skillId);
  const sourceLabel = sourceType === SkillSourceType.Ultimate ? '奧義' : '戰法';
  return `${sourceLabel}瞄準中：${presentation.name}`;
}

export function buildBattleSkillEffectMessage(skillId: string): string {
  return getBattleSkillPresentation(skillId).effectStatus;
}
