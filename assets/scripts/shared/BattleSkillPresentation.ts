// @spec-source → 戰法系統.md (doc_spec_0038)、主戰場UI規格書.md (doc_ui_0001)；PROG-2-1429 依建檔紀錄補標出處
import { Faction } from './CommonEnums';
import { SkillSourceType } from './SkillRuntimeContract';

export interface BattleSkillPresentation {
  name: string;
  categoryTag: string;
  effectStatus: string;
}

/** 招式名走 i18n：鍵為 battle.skill_name.<battleSkillId>，四語系都要有值（見 tests/BattleSkillNames.test.ts） */
export type BattleSkillNameTranslate = (key: string) => string;

let nameTranslate: BattleSkillNameTranslate | null = null;

/** 遊戲啟動時把 i18n 查詢掛上來；未掛上（例如純邏輯測試）時招式名退回 battleSkillId。 */
export function setBattleSkillNameTranslator(translate: BattleSkillNameTranslate | null): void {
  nameTranslate = translate;
}

export function battleSkillNameKey(skillId: string): string {
  return `battle.skill_name.${skillId}`;
}

function resolveBattleSkillName(skillId: string): string {
  if (!nameTranslate) return skillId;
  const key = battleSkillNameKey(skillId);
  const text = nameTranslate(key);
  return text && text !== key ? text : skillId;
}

type PresentationRow = Omit<BattleSkillPresentation, 'name'>;

const DEFAULT_PRESENTATION: PresentationRow = {
  categoryTag: '戰術',
  effectStatus: '【戰術】技能效果生效',
};

const PRESENTATION_BY_SKILL_ID: Record<string, PresentationRow> = {
  // 通用奧義；id 與名稱要和 GAME_CONFIG.genericUltimate 一致（共用層不引用 Constants，所以這裡寫字面值）
  'generic-all-out-charge': {
    categoryTag: '突擊',
    effectStatus: '【突擊】全軍突擊：全軍齊攻，敵軍全體受創',
  },
  'zhang-fei-roar': {
    categoryTag: '控制',
    effectStatus: '【控制】震軍怒喝：敵軍全體暈眩，盾牆瓦解',
  },
  // 五位初始名將的第一階專屬奧義（PROG-2-9327）；效果文字照實際效果寫
  'wei-yan-ziwu-raid': { categoryTag: '貫穿', effectStatus: '【貫穿】子午奇襲：直線三連刺，逐段增傷' },
  'xiahou-dun-eye-devour': { categoryTag: '回復', effectStatus: '【回復】拔矢啖睛：全軍兵力回復' },
  'zhang-he-adaptive-camp': { categoryTag: '再動', effectStatus: '【再動】巧變連營：一隊友軍立即再行動' },
  'sun-ce-conqueror': { categoryTag: '橫掃', effectStatus: '【橫掃】小霸王之威：前方扇形敵軍受創' },
  'gan-ning-night-raid': { categoryTag: '控制', effectStatus: '【控制】百騎劫營：敵軍最後排暈眩' },
  'cao-cao-tactics': {
    categoryTag: '破陣',
    effectStatus: '【破陣】兵不厭詐：自動鎖定前線弱點',
  },
  'guan-yu-slash': {
    categoryTag: '斬擊',
    effectStatus: '【斬擊】月牙刀斬：最佳直線斬擊展開',
  },
  'lu-bu-rampage': {
    categoryTag: '爆發',
    effectStatus: '【爆發】天下無雙：最佳扇形壓制',
  },
  'zhao-yun-pierce': {
    categoryTag: '突擊',
    effectStatus: '【突擊】龍膽·破軍：自動貫穿最佳列',
  },
  'zhuge-liang-storm': {
    categoryTag: '範圍',
    effectStatus: '【範圍】諸葛風暴：自動選最大範圍',
  },
  'zhou-yu-inferno': {
    categoryTag: '火攻',
    effectStatus: '【火攻】周瑜炎陣：點燃敵軍所在格',
  },
  'sun-quan-tide': {
    categoryTag: '陣列',
    effectStatus: '【陣列】江潮列陣：掃蕩中心周邊',
  },
  'liu-bei-rally': {
    categoryTag: '支援',
    effectStatus: '【支援】仁德號召：全軍回復與士氣提振',
  },
  'diao-chan-charm': {
    categoryTag: '魅惑',
    effectStatus: '【魅惑】閉月傾城：敵軍全體受控',
  },
  'cao-zhi-verse': {
    categoryTag: '文擊',
    effectStatus: '【文擊】七步成章：最佳扇形文氣震擊',
  },
  'guo-jia-foresight': {
    categoryTag: '奇策',
    effectStatus: '【奇策】鬼謀先機：最佳範圍崩解',
  },
  'sima-yi-shadow': {
    categoryTag: '壓制',
    effectStatus: '【壓制】司馬影策：全敵範圍壓制',
  },
  'sow-discord': {
    categoryTag: '離間',
    effectStatus: '【離間】離間：敵軍倒戈互攻一回合',
  },
  // 以下 23 個原本沒有招式名（顯示英文 id）；名稱取自 ultimate-definitions／tactic-library 的既有定名
  'cao-cao-revelry': { categoryTag: '鼓舞', effectStatus: '【鼓舞】對酒當歌：全軍精力回復，攻速提升' },
  'cao-cao-ult-control': { categoryTag: '控制', effectStatus: '【控制】挾天子令：敵將為我方行動 2 回合' },
  'cao-cao-ult-revive': { categoryTag: '復活', effectStatus: '【復活】唯才是舉：陣亡友軍復活，恢復 50% 血量' },
  'eight-formation': { categoryTag: '陣法', effectStatus: '【陣法】八陣圖：佈下八陣，增益本陣' },
  'empty-fort': { categoryTag: '奇策', effectStatus: '【奇策】空城計：示弱誘敵，推開前方敵軍' },
  'insp-combo-attack': { categoryTag: '連擊', effectStatus: '【連擊】連擊：連番出手，接連追擊' },
  'insp-dragon-gall': { categoryTag: '單挑', effectStatus: '【單挑】龍膽：一對一決鬥，全力出擊' },
  'insp-haste': { categoryTag: '疾行', effectStatus: '【疾行】疾行：加速行軍，搶先行動' },
  'insp-lance-thrust': { categoryTag: '突擊', effectStatus: '【突擊】長槍突刺：直線貫穿，一擊到底' },
  'insp-night-raid': { categoryTag: '夜襲', effectStatus: '【夜襲】夜襲：趁夜先制，突襲敵陣' },
  'insp-shield': { categoryTag: '防禦', effectStatus: '【防禦】堅盾：舉盾固守，減少受傷' },
  'insp-sworn-fury': { categoryTag: '突擊', effectStatus: '【突擊】結義之怒：兄弟同心，怒氣衝鋒' },
  'insp-taunt': { categoryTag: '挑釁', effectStatus: '【挑釁】挑釁：激怒敵將，迫其暈眩' },
  'lian-huan-chain': { categoryTag: '連環', effectStatus: '【連環】連環計：敵軍相連，一損皆損' },
  'liu-bei-reset': { categoryTag: '重置', effectStatus: '【重置】漢室餘暉：召集援軍，重置友軍行動條' },
  'medical-aid': { categoryTag: '醫療', effectStatus: '【醫療】醫療：救治友軍，回復兵力' },
  'mentor-morale': { categoryTag: '鼓舞', effectStatus: '【鼓舞】鼓舞：提振士氣' },
  'mentor-slow': { categoryTag: '緩速', effectStatus: '【緩速】緩速：拖慢敵軍行動' },
  'tally-charge': { categoryTag: '衝鋒', effectStatus: '【衝鋒】騎兵衝鋒：騎兵突進，直撲敵陣' },
  'tally-fire-chain': { categoryTag: '火攻', effectStatus: '【火攻】赤壁烈焰：火勢相連，焚燒敵軍' },
  'tally-wei-zhen-hua-xia': { categoryTag: '威震', effectStatus: '【威震】威震華夏：一騎當千，震懾敵將' },
  'tally-wushuang': { categoryTag: '衝陣', effectStatus: '【衝陣】單騎破陣：單騎突陣，撕開敵陣' },
  'zhao-yun-immortal': { categoryTag: '無敵', effectStatus: '【無敵】白馬銀槍·不滅：全屏範圍攻擊，獲得 1 回合無敵，全體士氣拉滿' },
};

/** 所有有招式表的 battleSkillId（測試用：每個可施放 id 都應能解出招式名） */
export function battleSkillPresentationIds(): string[] {
  return Object.keys(PRESENTATION_BY_SKILL_ID);
}

export function getBattleSkillPresentation(skillId: string): BattleSkillPresentation {
  const row = Object.prototype.hasOwnProperty.call(PRESENTATION_BY_SKILL_ID, skillId) ? PRESENTATION_BY_SKILL_ID[skillId] : null;
  if (!row) {
    return {
      ...DEFAULT_PRESENTATION,
      name: skillId,
      effectStatus: `【戰術】${skillId} 生效`,
    };
  }
  return { ...row, name: resolveBattleSkillName(skillId) };
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
