// @spec-source → 新手開場規格書 §5.2 初始名將登場台詞、§6 六位初始名將清單、分鏡 6（名將逐一登場）；WBS OPEN-06
/**
 * InitialGeneralShowcase — 六位初始名將的展示卡與登場台詞資料（純邏輯，不依賴 cc）。
 *
 * - 順序依規格清單：張飛、魏延、夏侯惇、張郃、孫策、甘寧。
 * - 每位名將有一句登場台詞，台詞原文來自規格 §5.2（趣味版，同正式版劇本文案 §7 備選庫）；
 *   另附正式版劇本文案 §3「名將登場正式版」的正式台詞（formalLine，PROG-2-1732）。
 * - 畫面預設改用正式版（SHOWCASE_LINE_STYLE_DEFAULT，2026-11-06 使用者裁決 #4，PROG-2-1901）；趣味版保留作備選。
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
    /** 出生地（史實） */
    originRegion: string;
    /** 主因子，必須是 factorTags 之一 */
    coreFactorTag: string;
    /** 登場台詞（規格 §5.2，趣味版） */
    line: string;
    /** 正式版登場台詞（正式版劇本文案 §3） */
    formalLine: string;
}

/** 登場台詞風格：fun = 趣味版（§5.2／§7）、formal = 正式版（§3） */
export type ShowcaseLineStyle = 'fun' | 'formal';

/** 預設用正式版（2026-11-06 裁決 #4）；趣味版仍可指定 'fun' 取用 */
export const SHOWCASE_LINE_STYLE_DEFAULT: ShowcaseLineStyle = 'formal';

/** 依風格取登場台詞 */
export function showcaseLineOf(entry: InitialShowcaseEntry, style: ShowcaseLineStyle = SHOWCASE_LINE_STYLE_DEFAULT): string {
    return style === 'formal' ? entry.formalLine : entry.line;
}

export const INITIAL_SHOWCASE_ENTRIES: readonly InitialShowcaseEntry[] = Object.freeze([
    {
        generalId: 'zhang-fei',
        name: '張飛',
        title: '萬人敵、燕門咆哮',
        factorTags: ['燕人', '蛇矛', '北境血脈'],
        originRegion: '幽州涿郡',
        coreFactorTag: '燕人',
        line: '主公！俺老張等這封信等得嗓子都乾了！',
        formalLine: '主公，這一回，我不會再讓你孤身向前。',
    },
    {
        generalId: 'wei-yan',
        name: '魏延',
        title: '奇策長史、漢中鎮守',
        factorTags: ['義陽', '狂骨', '孤軍'],
        originRegion: '義陽',
        coreFactorTag: '義陽',
        line: '他們都說我有反骨，只有你願意給我這封信。',
        formalLine: '別人看見的是反骨，你看見的，應該是我替你撕開局面的力量。',
    },
    {
        generalId: 'xiahou-dun',
        name: '夏侯惇',
        title: '拔矢啖睛、魏武元勳',
        factorTags: ['譙縣', '獨眼', '宗親'],
        originRegion: '豫州沛國譙縣',
        coreFactorTag: '譙縣',
        line: '雙眼尚在，戰魂未冷。',
        formalLine: '雙眼可失，信念不失。主公，請下令吧。',
    },
    {
        generalId: 'zhang-he',
        name: '張郃',
        title: '巧變之將、破敵先鋒',
        factorTags: ['河間', '巧變', '宿將'],
        originRegion: '冀州河間國',
        coreFactorTag: '河間',
        line: '在這渾沌的亂世中，唯有主公的選擇，才配得上我這華麗的謝幕。',
        formalLine: '在這亂世之中，真正值得我出手的人，只有主公。',
    },
    {
        generalId: 'sun-ce',
        name: '孫策',
        title: '江東小霸王',
        factorTags: ['富春', '霸王', '水鄉血脈'],
        originRegion: '揚州吳郡富春',
        coreFactorTag: '富春',
        line: '江東的風吹到了現代，還是這麼燙人。',
        formalLine: '江東之風再起。主公，這一次我與你並肩而行。',
    },
    {
        generalId: 'gan-ning',
        name: '甘寧',
        title: '錦帆賊、折衝將軍',
        factorTags: ['巴郡', '鈴聲', '游俠'],
        originRegion: '益州巴郡臨江',
        coreFactorTag: '巴郡',
        line: '這長江水，往後就歸主公管，我負責開路！',
        formalLine: '你聽見鈴聲了嗎？那是我回來替你開路的聲音。',
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
