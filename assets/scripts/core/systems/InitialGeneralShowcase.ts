// @spec-source → 新手開場規格書 §5.2 初始名將登場台詞、§6 六位初始名將清單、分鏡 6（名將逐一登場）；WBS OPEN-06
/**
 * InitialGeneralShowcase — 六位初始名將的展示卡與登場台詞資料（純邏輯，不依賴 cc）。
 *
 * - 順序依規格清單：張飛、魏延、夏侯惇、張郃、孫策、甘寧。
 * - 每位名將有一句登場台詞，台詞原文來自規格 §5.2。
 * - generalId 對應 generals.json；測試會檢查 id 與名稱是否對得上。
 *
 * Unity 對照：像一份 Showcase 的 ScriptableObject 清單，畫面只依序取出一筆來播放。
 */

export interface InitialShowcaseEntry {
    generalId: string;
    name: string;
    /** 建議稱號（規格 §6） */
    title: string;
    /** 核心因子標籤（規格 §6） */
    factorTags: readonly string[];
    /** 登場台詞（規格 §5.2） */
    line: string;
}

export const INITIAL_SHOWCASE_ENTRIES: readonly InitialShowcaseEntry[] = Object.freeze([
    {
        generalId: 'zhang-fei',
        name: '張飛',
        title: '萬人敵、燕門咆哮',
        factorTags: ['燕人', '蛇矛', '北境血脈'],
        line: '主公！俺老張等這封信等得嗓子都乾了！',
    },
    {
        generalId: 'wei-yan',
        name: '魏延',
        title: '奇策長史、漢中鎮守',
        factorTags: ['義陽', '狂骨', '孤軍'],
        line: '他們都說我有反骨，只有你願意給我這封信。',
    },
    {
        generalId: 'xiahou-dun',
        name: '夏侯惇',
        title: '拔矢啖睛、魏武元勳',
        factorTags: ['譙縣', '獨眼', '宗親'],
        line: '雙眼尚在，戰魂未冷。',
    },
    {
        generalId: 'zhang-he',
        name: '張郃',
        title: '巧變之將、破敵先鋒',
        factorTags: ['河間', '巧變', '宿將'],
        line: '在這渾沌的亂世中，唯有主公的選擇，才配得上我這華麗的謝幕。',
    },
    {
        generalId: 'sun-ce',
        name: '孫策',
        title: '江東小霸王',
        factorTags: ['富春', '霸王', '水鄉血脈'],
        line: '江東的風吹到了現代，還是這麼燙人。',
    },
    {
        generalId: 'gan-ning',
        name: '甘寧',
        title: '錦帆賊、折衝將軍',
        factorTags: ['巴郡', '鈴聲', '游俠'],
        line: '這長江水，往後就歸主公管，我負責開路！',
    },
]);

/** 依規格順序回傳六位名將的展示資料；陣列是複本，改動不會回寫到常數。 */
export function initialShowcaseEntries(): InitialShowcaseEntry[] {
    return INITIAL_SHOWCASE_ENTRIES.map((entry) => ({ ...entry, factorTags: [...entry.factorTags] }));
}

/** 依 generalId 取出展示資料；不在六位之內時回傳 null。 */
export function initialShowcaseOf(generalId: string): InitialShowcaseEntry | null {
    const entry = INITIAL_SHOWCASE_ENTRIES.find((item) => item.generalId === generalId);
    return entry ? { ...entry, factorTags: [...entry.factorTags] } : null;
}
