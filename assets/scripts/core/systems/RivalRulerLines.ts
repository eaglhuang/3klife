// @spec-source → 治理模式他國AI系統.md (doc_spec_0020) §G-1 AI 國家事件文案、§G-2 各勢力君主台詞（PROG-2-1707）
/**
 * RivalRulerLines — 他國君主台詞與事件文案（純資料＋格式化，不依賴 cc）
 *
 * 規格只給了魏／蜀／吳／呂布／袁紹的台詞；其他勢力沒有台詞時，文案省略台詞那一段。
 * Unity 對照：像一張 ScriptableObject 台詞表，呼叫端只拿 key 查字串。
 */

export interface RulerLines {
    readonly ruler: string;
    readonly declareWar?: string;
    readonly alliance?: string;
    readonly betray?: string;
}

/** G-2 台詞表（括號註記如「不會主動背叛」不是台詞，留空） */
export const RULER_LINES: Readonly<Record<string, RulerLines>> = {
    wei: { ruler: '曹操', declareWar: '識時務者為俊傑，你已錯失良機。', alliance: '暫且合作，日後再論高下。', betray: '此乃亂世，何必拘泥小節。' },
    shu: { ruler: '劉備', declareWar: '吾不得已而為之，望閣下理解。', alliance: '義結金蘭，共抗強敵！' },
    wu: { ruler: '孫權', declareWar: '侵我江東者，必遭覆滅。', alliance: '長江南北，共享太平。', betray: '形勢所迫，非吾本意。' },
    lvbu: { ruler: '呂布', declareWar: '天下第一，有何不服？' },
    yuan: { ruler: '袁紹', declareWar: '四世三公，豈容小輩放肆！', alliance: '吾家門高貴，結盟自有分寸。', betray: '勢不如人，自當另尋出路。' },
    liuzhang: { ruler: '劉璋' },
    mateng: { ruler: '馬騰' },
    nanman: { ruler: '孟獲' },
};

/** G-1 AI 宣戰：「{國名} 的 {君主名} 向你宣戰！『{宣戰台詞}』準備迎戰吧！」；無台詞時退回簡短版 */
export function formatRivalDeclareWar(nationId: string, nationName: string): string {
    const lines = RULER_LINES[nationId];
    if (!lines?.declareWar) return `${nationName} 率軍來犯！`;
    return `${nationName} 的 ${lines.ruler} 向你宣戰！『${lines.declareWar}』準備迎戰吧！`;
}

/** 結盟成功時附上君主的結盟台詞；無台詞時只回結盟訊息 */
export function formatAllianceFormed(nationId: string, nationName: string): string {
    const lines = RULER_LINES[nationId];
    const base = `與 ${nationName} 結為同盟`;
    return lines?.alliance ? `${base}。${lines.ruler}：『${lines.alliance}』` : base;
}

/** G-1 AI 背叛（PROG-2-1769）；無背叛台詞時省略君主與台詞 */
export function formatNationBetrayal(nationId: string, nationName: string): string {
    const lines = RULER_LINES[nationId];
    return lines?.betray
        ? `${nationName} 撕毀盟約！${lines.ruler}：『${lines.betray}』邦交驟降！`
        : `${nationName} 撕毀盟約！邦交驟降！`;
}

/** G-1 AI 國滅亡（PROG-2-1769） */
export function formatNationFallen(nationId: string, nationName: string): string {
    return `${nationName} 已覆滅。${RULER_LINES[nationId]?.ruler ?? nationName} 下落不明... 殘餘武將流入各地傭兵市場。`;
}

/** G-1 AI 掠奪（PROG-2-1769） */
export function formatRaid(food: number, troops: number): string {
    return `南蠻蠻族再次入侵邊境！失去 ${food} 糧草與 ${troops} 兵力！`;
}

/** G-1 天下大亂文案（PROG-2-1708） */
export const ERA_SHIFT_TEXT = '天下大亂，諸侯版圖重整，新的霸權競逐再次開始。';

/** G-1 AI 稱霸：「{國名} 勢力空前強大！天下諸侯密謀結盟對抗霸主。」（PROG-2-1710） */
export function formatHegemonRise(nationName: string): string {
    return `${nationName} 勢力空前強大！天下諸侯密謀結盟對抗霸主。`;
}
