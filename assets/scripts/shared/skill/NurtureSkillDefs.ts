// @spec-source → 學府修業畫面與接線設計 (doc_spec_1179)；潁川／江東／隴中／洛陽／幽州各學府規格；技能系統 Base (doc_spec_1187) §5.2；PROG-2-9204
/**
 * NurtureSkillDefs — 培育（學府）技能的定義資料（domain=nurture）。
 *
 * 純資料：新增學府戰法只改這張表。名稱取自各學府規格書；弱冠禮通用候選三項為暫定 id 與暫定名稱。
 * 數值（TP 成本、門檻）學府戰法由結業直接授予，不經 TP 學習，所以不寫 cost。
 */
import type { SkillDef } from './SkillTypes';

function nurtureTactic(id: string, name: string, category: string, academy: string): SkillDef {
    return { schema: 'skill-def.v1', id, domain: 'nurture', name, category, tags: ['academy', 'tactic'], source: { type: 'academy', ids: [academy] }, trigger: { mode: 'activeCast' } };
}

export const NURTURE_SKILL_DEFS: readonly SkillDef[] = Object.freeze([
    // 弱冠禮通用候選（學府沒有專屬戰法時補位；名稱暫定）
    nurtureTactic('TACTIC_GENERIC_VALOR', '勇武歷練', 'generic', 'generic'),
    nurtureTactic('TACTIC_GENERIC_STRATEGY', '謀略歷練', 'generic', 'generic'),
    nurtureTactic('TACTIC_GENERIC_COMMAND', '統御歷練', 'generic', 'generic'),
    // 潁川書院
    nurtureTactic('TAC_LIAODI_JIXIAN', '料敵機先', '奇謀戰法', 'yingchuan'),
    nurtureTactic('TAC_SHISHENG_SHIBAI', '十勝十敗', '頂級戰法', 'yingchuan'),
    nurtureTactic('TAC_QUHU_TUNLANG', '驅虎吞狼', '奇謀戰法', 'yingchuan'),
    nurtureTactic('TAC_YIJI', '遺計', '奇謀戰法', 'yingchuan'),
    nurtureTactic('TAC_JIUPIN_GUANREN', '九品官人', '外交戰法', 'yingchuan'),
    // 江東
    nurtureTactic('TAC_HENGJIANG_ESHO', '橫江扼守', '防禦戰法', 'jiangdong'),
    nurtureTactic('TAC_LIANHUAN_SHENHUO', '連環神火', '火計戰法', 'jiangdong'),
    // 隴中
    nurtureTactic('TAC_BAZHEN_XUANJI', '八陣玄機', '陣法戰法', 'longzhong'),
    nurtureTactic('TAC_SHENJI_LIANNU', '神機連弩', '軍械戰法', 'longzhong'),
    // 洛陽
    nurtureTactic('TAC_JIUPIN_ZHONGZHENG', '九品中正', '外交戰法', 'luoyang'),
    nurtureTactic('TAC_GONGQING_WEIYI', '公卿威儀', '外交戰法', 'luoyang'),
    // 幽州
    nurtureTactic('TAC_TUQI_POZHEN', '突騎破陣', '突擊戰法', 'youzhou'),
    nurtureTactic('TAC_BAIMA_YICONG', '白馬義從', '專屬兵種戰法', 'youzhou'),
]);
