// @spec-source → 正式版劇本文案.md §7 趣味台詞備選庫（§7.4 使用說明）（PROG-2-0945，COPY-05）
/**
 * FunLineLibrary — 趣味台詞彩蛋庫與使用規則（純資料與查詢，不依賴 cc）
 *
 * 規則（規格 §7.4）：趣味台詞只用在開場信件與角色初登場，不可在其他系統出現。
 * 規格 §7.3「紅顏趣味台詞」屬於紅顏趕路情境，不在這兩個場景內，保留為 reserved，不會被查出。
 *
 * 暫定：規格只列台詞，沒寫觸發條件的細節；這裡以「場景」為觸發條件（opening-letter / first-appearance）。
 *
 * Unity 對照：像 ScriptableObject 的台詞表，每條帶 Tag，取用時用 Tag 過濾，不在 Prefab 裡寫死。
 */

export type FunLineScene = 'opening-letter' | 'first-appearance';

export interface FunLine {
    id: string;
    /** 說話的武將 id；開場信件的台詞沒有說話者 */
    speakerId: string | null;
    text: string;
    /** 允許出現的場景；空陣列表示保留、目前不用 */
    scenes: readonly FunLineScene[];
}

export const FUN_LINES: readonly FunLine[] = [
    { id: 'fun.zhang-fei.01', speakerId: 'zhang-fei', text: '主公！俺老張等這封信等得嗓子都乾了！', scenes: ['first-appearance'] },
    { id: 'fun.sun-ce.01', speakerId: 'sun-ce', text: '江東的風吹到了現代，還是這麼燙人。', scenes: ['first-appearance'] },
    { id: 'fun.gan-ning.01', speakerId: 'gan-ning', text: '這長江水，往後就歸主公管，我負責開路！', scenes: ['first-appearance'] },
    { id: 'fun.xiahou-dun.01', speakerId: 'xiahou-dun', text: '雙眼尚在，戰魂未冷。', scenes: ['first-appearance'] },
    { id: 'fun.wei-yan.01', speakerId: 'wei-yan', text: '他們都說我有反骨，只有你願意給我這封信。', scenes: ['first-appearance'] },
    { id: 'fun.zhang-he.01', speakerId: 'zhang-he', text: '在這渾沌的亂世中，唯有主公的選擇，才配得上我這華麗的謝幕。', scenes: ['first-appearance'] },
    { id: 'fun.letter.01', speakerId: null, text: '老朋友，好久不見。', scenes: ['opening-letter'] },
    { id: 'fun.letter.02', speakerId: null, text: '我們在這裡準備了一個『夢境觀測位』。', scenes: ['opening-letter'] },
    { id: 'fun.letter.03', speakerId: null, text: '只要你戴上這副全息頭盔，我就能帶你親自走一趟那片滾滾長江。', scenes: ['opening-letter'] },
    { id: 'fun.letter.04', speakerId: null, text: '去選一個吧。', scenes: ['opening-letter'] },
    { id: 'fun.letter.05', speakerId: null, text: '你準備好……改寫那段青山依舊的歷史了嗎？', scenes: ['opening-letter'] },
    { id: 'fun.redface.01', speakerId: null, text: '主公，妾身若搭馬車需三天，若有 0.99 盤纏，即刻便到。', scenes: [] },
    { id: 'fun.redface.02', speakerId: null, text: '只需旅費 29.99，美人與文官可一同加入，文武齊備護主公。', scenes: [] },
    { id: 'fun.redface.03', speakerId: null, text: '主公，路途遙遠，妾身正在趕來。', scenes: [] },
];

/** 這條台詞能不能在指定場景出現 */
export function isFunLineAllowed(line: FunLine, scene: FunLineScene): boolean {
    return line.scenes.includes(scene);
}

/** 指定場景可用的台詞；傳入 speakerId 時只回傳該武將的初登場台詞（開場信件不分說話者） */
export function funLinesFor(scene: FunLineScene, speakerId?: string): FunLine[] {
    return FUN_LINES.filter((line) => {
        if (!isFunLineAllowed(line, scene)) return false;
        if (speakerId === undefined) return true;
        return line.speakerId === speakerId;
    });
}
