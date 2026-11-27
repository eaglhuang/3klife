// @spec-source → 開場重新包裝規格書（方案 B：AI 武將搶先連線，doc_spec_1346）§4 彈幕、§6 轉蛋回呼；PROG-2-10149
/**
 * OpeningDanmaku — 開場方案 B 的彈幕台詞時間表與轉蛋回呼台詞（純 TS，不依賴 cc）。
 *
 * - 每句彈幕有發話者（固定聲線，開場時武將名冊可能還沒載完，不能等名冊）、i18n 鍵、出現時間。
 * - 台詞樣板放 i18n（`ui.opening.danmaku.*`、`ui.opening.callback.*`），第一人稱一律寫 {self}，
 *   由 SpeakerVoice 依性別、性格、年齡代入，不在樣板寫死「某」「咱」。
 * - 查不到語系字串（translate 回傳原鍵或空字串）的那句直接略過，不拿萬用句硬補。
 *
 * Unity 對照：像一份 Timeline 的字幕軌資料，畫面層只依時間取出該顯示的字。
 */
import { fillSlots } from '../mind/MindLineTemplates';
import { voiceSlots, type VoiceProfile } from '../mind/SpeakerVoice';

/** 開場三個畫面各自一條彈幕軌 */
export type DanmakuBeat = 'intro' | 'letter' | 'showcase';

/** 開場出場武將（含信的寄件人三位、亮相六位）的固定聲線：性別、性格、年齡 */
export const OPENING_CAST_VOICE: Readonly<Record<string, VoiceProfile>> = Object.freeze({
    'liu-bei': { gender: '男', type: 'Loyal', age: 45 },
    'guan-yu': { gender: '男', type: 'Brave', age: 44 },
    'zhuge-liang': { gender: '男', type: 'Wise', age: 40 },
    'zhang-fei': { gender: '男', type: 'Brave', age: 40 },
    'wei-yan': { gender: '男', type: 'Brave', age: 42 },
    'xiahou-dun': { gender: '男', type: 'Loyal', age: 45 },
    'zhang-he': { gender: '男', type: 'Wise', age: 42 },
    'sun-ce': { gender: '男', type: 'Playful', age: 22 },
    'gan-ning': { gender: '男', type: 'Playful', age: 28 },
});

/** 信的三位寄件人（劉備、張飛、關羽），順序即信封寄件人欄順序 */
export const OPENING_LETTER_SENDERS: readonly string[] = Object.freeze(['liu-bei', 'zhang-fei', 'guan-yu']);

/** 非武將發話者：系統日誌與客服史小境（沒有性別，不代入 {self}） */
export type DanmakuSpeaker = string | 'system' | 'shi-xiao-jing';

export interface DanmakuLineDef {
    /** 出現時間（毫秒，自該畫面彈幕軌開始起算） */
    atMs: number;
    /** 語系鍵 */
    key: string;
    speaker: DanmakuSpeaker;
}

/** 六位亮相名將的點亮順序（與 INITIAL_SHOWCASE_ENTRIES 相同） */
export const SHOWCASE_SIX: readonly string[] = Object.freeze(['zhang-fei', 'wei-yan', 'xiahou-dun', 'zhang-he', 'sun-ce', 'gan-ning']);

/** 亮相頁每位名將點亮的間隔（毫秒） */
export const SHOWCASE_LIGHT_STEP_MS = 520;

export const DANMAKU_TRACKS: Readonly<Record<DanmakuBeat, readonly DanmakuLineDef[]>> = Object.freeze({
    // 分鏡 1、2、6：後台日誌 → 武將互相推託 → 「連線！」塞滿畫面（第一幕長卷約 4.8 秒，全部排在長卷內）
    intro: [
        { atMs: 0, key: 'ui.opening.danmaku.log', speaker: 'system' },
        { atMs: 650, key: 'ui.opening.danmaku.who_sent', speaker: 'zhuge-liang' },
        { atMs: 1300, key: 'ui.opening.danmaku.not_me', speaker: 'guan-yu' },
        { atMs: 1950, key: 'ui.opening.danmaku.its_me', speaker: 'liu-bei' },
        ...SHOWCASE_SIX.map((speaker, i): DanmakuLineDef => ({ atMs: 2900 + i * 230, key: 'ui.opening.danmaku.connect', speaker })),
    ],
    // 分鏡 3、4：信文旁邊的武將插話
    letter: [
        { atMs: 500, key: 'ui.opening.danmaku.letter_liu_bei', speaker: 'liu-bei' },
        { atMs: 1900, key: 'ui.opening.danmaku.letter_zhuge', speaker: 'zhuge-liang' },
        { atMs: 3300, key: 'ui.opening.danmaku.letter_zhang_fei', speaker: 'zhang-fei' },
        { atMs: 4700, key: 'ui.opening.danmaku.letter_ai', speaker: 'guan-yu' },
    ],
    // 分鏡 5、7：六輪廓逐一點亮各冒一句口頭禪，全部點亮後史小境補一句
    showcase: [
        ...SHOWCASE_SIX.map((speaker, i): DanmakuLineDef => ({ atMs: 300 + i * SHOWCASE_LIGHT_STEP_MS, key: `ui.opening.danmaku.catch_${speaker.replace(/-/g, '_')}`, speaker })),
        { atMs: 300 + SHOWCASE_SIX.length * SHOWCASE_LIGHT_STEP_MS + 600, key: 'ui.opening.danmaku.shi_xiao_jing', speaker: 'shi-xiao-jing' },
    ],
});

export interface DanmakuCue {
    atMs: number;
    /** 已代入聲線的整句（含「名字：」前綴，系統日誌沒有前綴） */
    text: string;
}

function isMissing(text: string, key: string): boolean {
    return !text || text === key;
}

/**
 * 組出某一軌的彈幕 cue。
 * names：發話者 id → 顯示名（武將名取語系 `ui.opening.cast.<id>`，查不到就不加名字前綴）。
 */
export function buildDanmakuCues(beat: DanmakuBeat, translate: (key: string) => string): DanmakuCue[] {
    const cues: DanmakuCue[] = [];
    for (const def of DANMAKU_TRACKS[beat]) {
        const template = translate(def.key);
        if (isMissing(template, def.key)) continue;
        const voice = OPENING_CAST_VOICE[def.speaker];
        const body = fillSlots(template, voice ? voiceSlots(voice) : {});
        const nameKey = `ui.opening.cast.${def.speaker.replace(/-/g, '_')}`;
        const name = translate(nameKey);
        const prefix = def.speaker === 'system' || isMissing(name, nameKey) ? '' : `${name}：`;
        cues.push({ atMs: def.atMs, text: `${prefix}${body}` });
    }
    return cues;
}

/** 轉蛋回呼台詞的 i18n 鍵：六位亮相名將各一句，「我就說是我寄的」 */
export function openingCallbackKey(generalId: string): string {
    return `ui.opening.callback.${generalId.replace(/-/g, '_')}`;
}

/**
 * 宿命轉蛋抽到的名將若是六位亮相名將之一，回傳他的回呼台詞；不是、或查不到語系字串回空字串。
 * 聲線優先用名冊資料（roster 有性別、性格、年齡就用名冊的），沒有則用固定聲線。
 */
export function openingCallbackLine(
    generalId: string,
    translate: (key: string) => string,
    roster?: Readonly<VoiceProfile>,
): string {
    if (!SHOWCASE_SIX.includes(generalId)) return '';
    const key = openingCallbackKey(generalId);
    const template = translate(key);
    if (isMissing(template, key)) return '';
    const fixed = OPENING_CAST_VOICE[generalId] ?? {};
    const profile: VoiceProfile = {
        gender: roster?.gender ?? fixed.gender,
        type: roster?.type ?? fixed.type,
        age: roster?.age ?? fixed.age,
    };
    return fillSlots(template, voiceSlots(profile));
}
