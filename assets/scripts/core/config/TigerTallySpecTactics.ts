/**
 * TigerTallySpecTactics — 虎符特殊戰法對照表（PROG-2-0928，TRP-15）
 *
 * 規格來源：兵種（虎符）系統 §特殊兵種列表，34 條兵種專屬戰法（死亡傳承通用 17 + 名將專屬 17）。
 * 每條戰法對應一個 battleSkillId，由 BattleSkillProfiles 解析成 BattleSkill 管線的 profile。
 *
 * reusesProfile = true：沿用既有 profile（G-1／G-2 已落地的效果，欄位與規格一致或近似）。
 * reusesProfile = false：本卡只建立殼（coefficient 0、無效果欄位），效果待各戰法另卡實作，
 *   殼 profile 不造成任何傷害，避免誤以為已有數值。
 *
 * 依 import 邊界：只放字串與純資料，不 import battle 層。
 *
 * Unity 對照：像 ScriptableObject 技能清單，每筆記錄「技能資產 id」與「實作腳本是否已掛上」。
 */

export type TigerTallySpecGroup = 'general' | 'named';

export interface TigerTallySpecTactic {
    tacticId: string;
    battleSkillId: string;
    group: TigerTallySpecGroup;
    /** 虎符名稱（規格表第二欄） */
    tallyName: string;
    /** 兵種名稱（規格表第三欄） */
    unitName: string;
    /** 規格表「來源」欄 */
    sourceGeneral: string;
    /** 規格表「品質」欄 */
    quality: 'R' | 'SR' | 'SSR' | 'UR';
    /** 規格表「特殊戰法」欄的效果摘要 */
    effect: string;
    reusesProfile: boolean;
}

export const TIGER_TALLY_SPEC_TACTICS: readonly TigerTallySpecTactic[] = [
    // --- 死亡傳承虎符（通用型）---
    { tacticId: 'tiger-tally-bai-ma-yi-cong', battleSkillId: 'tally-bai-ma-yi-cong', group: 'general', tallyName: '虎符：白馬', unitName: '白馬義從', sourceGeneral: '公孫瓚', quality: 'SSR', effect: '騎射合一：騎兵移動 + 弓兵射程', reusesProfile: false },
    { tacticId: 'tiger-tally-xian-zhen', battleSkillId: 'tally-defense-pierce', group: 'general', tallyName: '虎符：陷陣', unitName: '陷陣營', sourceGeneral: '高順', quality: 'SSR', effect: '無視防禦：攻擊穿透 50% 防禦', reusesProfile: true },
    { tacticId: 'tiger-tally-hu-bao', battleSkillId: 'tally-charge', group: 'general', tallyName: '虎符：虎豹', unitName: '曹魏虎豹騎', sourceGeneral: '曹操 / 曹仁', quality: 'SSR', effect: '精銳突擊：衝鋒傷害 ×2', reusesProfile: true },
    { tacticId: 'tiger-tally-dan-yang', battleSkillId: 'tally-dan-yang', group: 'general', tallyName: '虎符：丹陽', unitName: '丹陽精兵', sourceGeneral: '孫策 / 太史慈', quality: 'SR', effect: '山地特化：山地移動 +2、攻擊 +20%', reusesProfile: false },
    { tacticId: 'tiger-tally-tie-qi', battleSkillId: 'tally-tie-qi', group: 'general', tallyName: '虎符：鐵騎', unitName: '西涼鐵騎', sourceGeneral: '馬超 / 馬騰', quality: 'SSR', effect: '恐懼衝鋒：衝鋒時周圍敵軍士氣 -20', reusesProfile: false },
    { tacticId: 'tiger-tally-wu-dang', battleSkillId: 'tally-poison-arrow', group: 'general', tallyName: '虎符：無當', unitName: '無當飛軍', sourceGeneral: '王平', quality: 'SR', effect: '毒箭：攻擊附帶持續中毒', reusesProfile: true },
    { tacticId: 'tiger-tally-changshan-nu', battleSkillId: 'tally-changshan-nu', group: 'general', tallyName: '虎符：常山女', unitName: '常山女騎', sourceGeneral: '趙雲系女性名將', quality: 'SR', effect: '迴避 +30%、治療友軍能力', reusesProfile: false },
    { tacticId: 'tiger-tally-teng-jia', battleSkillId: 'tally-teng-jia', group: 'general', tallyName: '虎符：藤甲', unitName: '藤甲兵', sourceGeneral: '孟獲', quality: 'R', effect: '物理減傷 50%，但火攻 ×3', reusesProfile: false },
    { tacticId: 'tiger-tally-xian-deng', battleSkillId: 'tally-xian-deng', group: 'general', tallyName: '虎符：先登', unitName: '先登死士', sourceGeneral: '袁紹 / 麴義', quality: 'SR', effect: '攻城傷害 ×2、免疫恐懼', reusesProfile: false },
    { tacticId: 'tiger-tally-jie-fan', battleSkillId: 'tally-jie-fan', group: 'general', tallyName: '虎符：解煩', unitName: '解煩軍', sourceGeneral: '孫權', quality: 'SR', effect: '突擊步兵：移動 +2、攻擊 +20%', reusesProfile: false },
    { tacticId: 'tiger-tally-da-qiao', battleSkillId: 'tally-da-qiao', group: 'general', tallyName: '虎符：大喬', unitName: '大喬親衛', sourceGeneral: '大喬', quality: 'R', effect: '全隊魅力 +20、士氣不降', reusesProfile: false },
    { tacticId: 'tiger-tally-wu-guo', battleSkillId: 'tally-wu-guo', group: 'general', tallyName: '虎符：吳國', unitName: '吳國水師', sourceGeneral: '周泰 / 韓當', quality: 'SSR', effect: '水域特化：水域移動 +2、攻擊 +20%', reusesProfile: false },
    { tacticId: 'tiger-tally-du-du', battleSkillId: 'tally-fire-chain', group: 'general', tallyName: '虎符：都督', unitName: '都督禁衛', sourceGeneral: '周瑜', quality: 'SSR', effect: '火計連環：弩箭附帶標記，命中後引燃周圍草叢', reusesProfile: true },
    { tacticId: 'tiger-tally-jin-fan', battleSkillId: 'tally-jin-fan', group: 'general', tallyName: '虎符：錦帆', unitName: '錦帆游擊兵', sourceGeneral: '甘寧', quality: 'SSR', effect: '恐懼光環：周圍 1 格敵軍攻擊力下降；水上移動力與傷害增加', reusesProfile: false },
    { tacticId: 'tiger-tally-bai-er', battleSkillId: 'tally-bai-er', group: 'general', tallyName: '虎符：白耳', unitName: '白耳兵', sourceGeneral: '陳到', quality: 'SR', effect: '精銳護衛：剋制弓兵，替主將承傷，斷後時防禦 ×2', reusesProfile: false },
    { tacticId: 'tiger-tally-yuan-rong', battleSkillId: 'tally-yuan-rong', group: 'general', tallyName: '虎符：元戎', unitName: '元戎弩兵', sourceGeneral: '諸葛亮', quality: 'SSR', effect: '連弩齊射：範圍傷害＋連擊，壓制步兵效率極高', reusesProfile: false },
    { tacticId: 'tiger-tally-nan-man', battleSkillId: 'tally-nan-man', group: 'general', tallyName: '虎符：南蠻', unitName: '南蠻象兵', sourceGeneral: '木鹿大王 / 孟獲', quality: 'SR', effect: '巨型踐踏：無視輕型步兵阻擋，攻擊附帶濺射傷害', reusesProfile: false },

    // --- 名將專屬虎符（個人裝備型）---
    { tacticId: 'tiger-tally-long-dan', battleSkillId: 'tally-long-dan', group: 'named', tallyName: '龍膽符', unitName: '常山龍騎', sourceGeneral: '趙雲', quality: 'SSR', effect: '七進七出：移動無視阻擋穿透障礙物，閃避後反擊', reusesProfile: false },
    { tacticId: 'tiger-tally-du-du-fu', battleSkillId: 'tally-du-du-fu', group: 'named', tallyName: '都督符', unitName: '都督精弩', sourceGeneral: '周瑜', quality: 'SSR', effect: '火燒連營：普攻引燃目標及周圍 1 格', reusesProfile: false },
    { tacticId: 'tiger-tally-zhong-yi-fu', battleSkillId: 'tally-wei-zhen-hua-xia', group: 'named', tallyName: '忠義符', unitName: '忠義鐵衛', sourceGeneral: '關羽', quality: 'SSR', effect: '威震華夏：首擊傷害 ×2，擊殺後回滿行動', reusesProfile: true },
    { tacticId: 'tiger-tally-dang-yang-fu', battleSkillId: 'tally-changban-root', group: 'named', tallyName: '當陽符', unitName: '雷霆暴隊', sourceGeneral: '張飛', quality: 'SSR', effect: '長坂雄咆：周圍敵軍恐懼並後退 1 格', reusesProfile: true },
    { tacticId: 'tiger-tally-lie-gong-fu', battleSkillId: 'tally-hundred-steps', group: 'named', tallyName: '烈弓符', unitName: '神射帥營', sourceGeneral: '黃忠', quality: 'SSR', effect: '百步穿楊：射程 +2，遠距目標爆擊 +50%', reusesProfile: true },
    { tacticId: 'tiger-tally-shen-wei-fu', battleSkillId: 'tally-shen-wei', group: 'named', tallyName: '神威符', unitName: '虎威神騎', sourceGeneral: '馬超', quality: 'SSR', effect: '強擊突刺：衝鋒每格增加傷害，無視地形', reusesProfile: false },
    { tacticId: 'tiger-tally-qi-lin-fu', battleSkillId: 'tally-counter-weak', group: 'named', tallyName: '麒麟符', unitName: '天算禁軍', sourceGeneral: '姜維', quality: 'SSR', effect: '幼麒天算：反擊傷害加倍，附帶虛弱效果', reusesProfile: true },
    { tacticId: 'tiger-tally-hu-chi-fu', battleSkillId: 'tally-hu-chi', group: 'named', tallyName: '虎痴符', unitName: '虎衛禁軍', sourceGeneral: '許褚', quality: 'SSR', effect: '裸衣決鬥：防禦減半，攻擊力翻倍', reusesProfile: false },
    { tacticId: 'tiger-tally-e-lai-fu', battleSkillId: 'tally-e-lai', group: 'named', tallyName: '惡來符', unitName: '鐵戟死士', sourceGeneral: '典韋', quality: 'SSR', effect: '捨命護主：替周圍友軍承傷，血低防高', reusesProfile: false },
    { tacticId: 'tiger-tally-zhi-ti-fu', battleSkillId: 'tally-zhi-ti', group: 'named', tallyName: '止啼符', unitName: '逍遙精騎', sourceGeneral: '張遼', quality: 'SSR', effect: '突襲止啼：對敵方後排兩列傷害 +50%', reusesProfile: false },
    { tacticId: 'tiger-tally-wu-shuang-fu', battleSkillId: 'tally-wushuang', group: 'named', tallyName: '無雙符', unitName: '并州狼騎', sourceGeneral: '呂布', quality: 'UR', effect: '無雙亂舞：範圍攻擊周圍 8 格並擊退', reusesProfile: true },
    { tacticId: 'tiger-tally-lian-huan-fu', battleSkillId: 'tally-link', group: 'named', tallyName: '連環符', unitName: '鳳雛軍', sourceGeneral: '龐統', quality: 'SSR', effect: '連環計：多個敵方單位受到的傷害同步', reusesProfile: true },
    { tacticId: 'tiger-tally-feng-xiao-fu', battleSkillId: 'tally-feng-xiao', group: 'named', tallyName: '奉孝符', unitName: '鬼謀營', sourceGeneral: '郭嘉', quality: 'SSR', effect: '遺計定遼：陣亡時引發全場敵軍混亂', reusesProfile: false },
    { tacticId: 'tiger-tally-lang-gu-fu', battleSkillId: 'tally-lang-gu', group: 'named', tallyName: '狼顧符', unitName: '冥影衛', sourceGeneral: '司馬懿', quality: 'SSR', effect: '鷹視狼顧：每回合隨機使一名敵軍叛變', reusesProfile: false },
    { tacticId: 'tiger-tally-xiao-ji-fu', battleSkillId: 'tally-xiao-ji', group: 'named', tallyName: '梟姬符', unitName: '巾幗軍', sourceGeneral: '孫尚香', quality: 'SR', effect: '結姻連射：與男性相鄰時攻擊次數 +1', reusesProfile: false },
    { tacticId: 'tiger-tally-huo-shen-fu', battleSkillId: 'tally-fire-god-hunt', group: 'named', tallyName: '火神符', unitName: '烈火騎', sourceGeneral: '祝融', quality: 'SR', effect: '火神狩獵：騎乘巨獸，附帶火傷與擊退', reusesProfile: true },
    { tacticId: 'tiger-tally-gong-jia-fu', battleSkillId: 'tally-gong-jia', group: 'named', tallyName: '工甲符', unitName: '機關營', sourceGeneral: '黃月英', quality: 'SR', effect: '工甲連弩：連擊時傷害提升，可穿透防禦', reusesProfile: false },
];

/** 尚未有實作效果的殼 battleSkillId（reusesProfile = false），供 BattleSkillProfiles 建立殼 profile */
export const TIGER_TALLY_PENDING_SKILL_IDS: readonly string[] = TIGER_TALLY_SPEC_TACTICS
    .filter(tactic => !tactic.reusesProfile)
    .map(tactic => tactic.battleSkillId);
