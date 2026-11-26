// @spec-source → 武將台詞性別化（PROG-2-10083）：孩童（未滿 16 歲）不講成年台詞
/**
 * HallChildLines — 孩童版的大廳閒聊，純 TS，不依賴 cc。
 *
 * 成年武將的台詞包（友誼分級、典故、心智記憶）都是大人口吻；孩子點下去時改走這張短表，
 * 自稱一律「我」（與 SpeakerVoice 的孩童規則一致）。同 seed 同輸出。
 */
import { voiceAgeGroupOf } from '../mind/SpeakerVoice';

const CHILD_LINES: readonly string[] = [
    '我在練習揮木劍，爹爹說我有天分！',
    '我今天有乖乖吃飯喔，可以去玩了嗎？',
    '我長大以後也要像爹爹一樣厲害！',
    '我剛剛在院子裡抓到一隻蟲，要看嗎？',
    '我想吃糖葫蘆……可以嗎可以嗎？',
];

/** 這個年齡是否要走孩童台詞；年齡不明視為成年 */
export function isChildSpeaker(age: number | undefined): boolean {
    return voiceAgeGroupOf(age) === 'CHILD';
}

/** 挑一句孩童閒聊；seed 換句用 */
export function pickChildLine(seed: number): string {
    const i = Math.abs(Math.floor(Number.isFinite(seed) ? seed : 0)) % CHILD_LINES.length;
    return CHILD_LINES[i];
}
