// @spec-source → 結緣系統（配種）名士批語；WBS ORAC-09（PROG-2-1936）
/**
 * SageRemarkTemplates — 名士批語文案模板（純邏輯，不依賴 cc）。
 *
 * - 每位名士對六個因子色系各一句模板（每人 6 組，滿足「至少 5 組」），語氣依名士專長。
 * - 模板可含 {keyword}；有關鍵詞時用「含關鍵詞」句型，否則用不含關鍵詞句型。
 * - 左慈刻意含糊：句子不直接點出色系的意義，只給隱喻。
 *
 * 暫定：文案為初稿，待企劃潤稿；多語版本另卡。
 * Unity 對照：像一張 ScriptableObject 台詞表，以 (名士, 色系) 查一句再做字串代換。
 */
import type { FactorColor } from './FactorInheritance';
import type { SageId } from './SageDivination';

type ColorLines = Readonly<Record<FactorColor, string>>;

export interface SageRemarkTemplateSet {
    /** 含 {keyword} 的句型 */
    withKeyword: ColorLines;
    /** 不含關鍵詞的句型 */
    plain: ColorLines;
}

export const SAGE_REMARK_TEMPLATES: Readonly<Record<SageId, SageRemarkTemplateSet>> = {
    'zhuge-liang': {
        withKeyword: {
            blue: '觀此子眉宇，{keyword}之才可期，他日必能運籌帷幄。',
            pink: '此子心性溫厚，{keyword}一事，或能得人心。',
            green: '{keyword}之象已現，若能善用，可為一軍之鋒。',
            purple: '天數難測，然{keyword}之兆，亮亦不敢輕言。',
            white: '此子性情清明，{keyword}乃其本色。',
            red: '筋骨尚可，{keyword}之力，宜以謀略輔之。',
        },
        plain: {
            blue: '此子聰慧過人，可教以經略之道。',
            pink: '此子待人以誠，日後必多良緣。',
            green: '此子有將帥之姿，宜早習兵法。',
            purple: '此子命格奇特，亮亦難斷其終。',
            white: '此子心如明鏡，不為外物所動。',
            red: '此子體魄尚佳，然智勝於力方為上策。',
        },
    },
    'hua-tuo': {
        withKeyword: {
            blue: '脈象沉穩，{keyword}之思綿長，宜少勞心。',
            pink: '氣血和順，{keyword}之情易感，宜養心神。',
            green: '筋脈通達，{keyword}之勇可恃，然須防舊傷。',
            purple: '脈象有異，{keyword}之兆，老夫行醫多年未見。',
            white: '氣定神閒，{keyword}乃天性，不必強改。',
            red: '五臟強健，{keyword}之體，必享高壽。',
        },
        plain: {
            blue: '此子心思細密，宜多靜養，勿令過勞。',
            pink: '此子氣色紅潤，情志和順。',
            green: '此子筋骨強韌，可習武藝。',
            purple: '此子脈象奇特，難以常理度之。',
            white: '此子神氣清朗，少有病痛。',
            red: '此子根骨絕佳，壽數綿長。',
        },
    },
    'sima-hui': {
        withKeyword: {
            blue: '好，好。{keyword}之才，假以時日自見分曉。',
            pink: '好，好。{keyword}之德，亦是難得。',
            green: '好，好。{keyword}之勇，用之有度即可。',
            purple: '好，好。{keyword}之數，順其自然便是。',
            white: '好，好。{keyword}之性，不偏不倚。',
            red: '好，好。{keyword}之力，宜與智相濟。',
        },
        plain: {
            blue: '好，好。此子可讀書。',
            pink: '好，好。此子可交友。',
            green: '好，好。此子可從軍。',
            purple: '好，好。此子自有天命。',
            white: '好，好。此子品性端正。',
            red: '好，好。此子身強體健。',
        },
    },
    'xu-shao': {
        withKeyword: {
            blue: '此子{keyword}，治世之能臣也。',
            pink: '此子{keyword}，所到之處人皆親之。',
            green: '此子{keyword}，亂世之梟雄也。',
            purple: '此子{keyword}，其命不在常人之列。',
            white: '此子{keyword}，清議之中必有其名。',
            red: '此子{keyword}，萬人之敵也。',
        },
        plain: {
            blue: '月旦之評：此子才識過人。',
            pink: '月旦之評：此子仁厚可親。',
            green: '月旦之評：此子勇略兼備。',
            purple: '月旦之評：此子命數難評。',
            white: '月旦之評：此子性情清正。',
            red: '月旦之評：此子勇力絕倫。',
        },
    },
    'pang-tong': {
        withKeyword: {
            blue: '{keyword}？可作參軍，臨陣出奇。',
            pink: '{keyword}？軍中將士必樂為其用。',
            green: '{keyword}！此乃陷陣之才，可當先鋒。',
            purple: '{keyword}……此兆如落鳳，吉凶未可知。',
            white: '{keyword}，沉得住氣，可守要隘。',
            red: '{keyword}！衝陣破敵，非此子莫屬。',
        },
        plain: {
            blue: '此子可為謀主，善出奇計。',
            pink: '此子能得軍心，宜為統帥。',
            green: '此子戰陣之才，宜早上沙場。',
            purple: '此子之命，連統亦看不透。',
            white: '此子沉穩，宜鎮守後方。',
            red: '此子勇猛，宜為先登。',
        },
    },
    'zuo-ci': {
        withKeyword: {
            blue: '水中見月，{keyword}亦如是……哈哈。',
            pink: '桃花開時自有{keyword}，不開亦然。',
            green: '林間有風，{keyword}隨之而動。',
            purple: '{keyword}？天機也，說破便不靈了。',
            white: '雪落無聲，{keyword}在其中。',
            red: '火中取栗，{keyword}燙手否？',
        },
        plain: {
            blue: '杯中有海，海中無杯。',
            pink: '花自飄零水自流。',
            green: '青山不語，自有其路。',
            purple: '天機不可洩，不可洩。',
            white: '白雲出岫，本無心。',
            red: '烈火烹油，且看且行。',
        },
    },
};

/** 依名士與色系產生批語文字；名士不存在回 null。 */
export function renderSageRemarkText(sageId: string, color: FactorColor, keyword: string | null): string | null {
    const set = SAGE_REMARK_TEMPLATES[sageId as SageId];
    if (!set) return null;
    const kw = keyword?.trim();
    return kw ? set.withKeyword[color].split('{keyword}').join(kw) : set.plain[color];
}
