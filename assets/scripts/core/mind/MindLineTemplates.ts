// @spec-source → 武將心智提案 §2.6 主動行為、§2.7 信箱／意見（PROG-2-9150 MIND-2）；離線模板為主（使用者 2026-11-17 裁決）
/**
 * 主動請求、玩家回應後的反應、選將意見的離線台詞模板，純 TS，不依賴 cc。
 * 只管「說」：要說什麼由 MindRequests／MindLearning 決定，這裡依性格取句、代入真實事件的名稱與季數。
 * 槽位：{self} 第一人稱（SpeakerVoice 依性別＋性格＋年齡代入，槽位帶 gender／age 字串即可）、{cite} 引用的過去（例「第3年夏的河北押運」）、{n} 連敗／閒置季數、{fame}／{next} 名聲、{title} 將階稱號、
 * {opponent} 對手、{partner} 搭檔、{label} 任務名、{season} 季數文字、{name} 武將名。同 seed 同輸出。
 */
import type { GeneralPersonalityType } from '../models/GeneralUnit';
import { mindHash } from './MindBarks';
import type { MindRequestKind } from './MindTypes';
import { withVoiceSlots } from './SpeakerVoice';

type PerType = Readonly<Record<GeneralPersonalityType, readonly string[]>>;

export type MindSlots = Readonly<Record<string, string>>;

export function fillSlots(template: string, vars: MindSlots): string {
    return template.replace(/\{(\w+)\}/g, (whole, key: string) => vars[key] ?? whole);
}

function pick<T>(list: readonly T[], hash: number): T {
    return list[hash % list.length];
}

/** 把過去的事件包成一小段引用詞：有名稱與季數就「第3年夏的河北押運」，缺的往下退 */
export function citeOf(label: string | undefined, season: number | undefined, seasonLabel?: (season: number) => string): string {
    const when = season === undefined ? '' : (seasonLabel ? seasonLabel(season) : `第${season}季`);
    if (label && when) return `${when}的${label}`;
    if (label) return label;
    return when ? `${when}那回差事` : '先前那回差事';
}

// ───────────────────────── 主動請求（提出時的內文）─────────────────────────

export const REQUEST_ASK_PROMOTE: PerType = {
    Brave: ['主公，自{cite}得手，{self}名聲已 {fame}/{next}，只差主公一紙賜封，晉{title}！'],
    Wise: ['臣自{cite}以來聲望漸隆（{fame}/{next}），敢請主公賜封晉{title}，以便為主公更盡其力。'],
    Loyal: ['蒙主公信任，{cite}幸不辱命，名聲已達 {fame}/{next}。{self}不敢居功，唯盼主公酌情賜封。'],
    Playful: ['嘿，{cite}那回多漂亮！名聲都 {fame}/{next} 啦，主公賜個封，{self}請你喝酒！'],
};

export const REQUEST_ASK_BATTLE: PerType = {
    Brave: ['名聲已 {fame}/{next}，只差一場斬將或單挑便可晉{title}。{cite}之後{self}手癢得很，請主公准{self}出戰！'],
    Wise: ['臣名聲已 {fame}/{next}，所缺者唯斬將或單挑之功。{cite}已驗{self}之能，請主公擇一戰場。'],
    Loyal: ['{self}名聲 {fame}/{next}，只欠一場戰功。{cite}蒙主公信任，願再為主公陣前效力。'],
    Playful: ['名聲 {fame}/{next} 就差臨門一腳，{cite}之後閒得慌，來場大仗吧主公！'],
};

/** 對手記憶：單挑敗於某人，請戰時點名 */
export const REQUEST_ASK_BATTLE_GRUDGE: PerType = {
    Brave: ['{opponent}此賊，{cite}之辱{self}沒忘！名聲 {fame}/{next}，請主公准{self}出戰，斬此賊以雪恥！'],
    Wise: ['{opponent}之能，臣已在{cite}領教。名聲 {fame}/{next}，請主公給臣再會此人的機會。'],
    Loyal: ['{cite}敗給{opponent}，{self}愧對主公。名聲 {fame}/{next}，願再戰此人，不負所託。'],
    Playful: ['{opponent}那傢伙{cite}贏了{self}一手，不服！名聲都 {fame}/{next} 了，再約一場！'],
};

export const REQUEST_REDEEM: PerType = {
    Brave: ['{cite}連敗 {n} 回，這口氣{self}嚥不下，請主公再派{self}去，不雪此恥誓不罷休！'],
    Wise: ['{cite}連失 {n} 回，{self}已想明癥結所在，請主公再給一次機會。'],
    Loyal: ['{cite}辱主公所託已 {n} 回，{self}願再往，以功贖過。'],
    Playful: ['{cite}栽了 {n} 回，{self}不服！再來一把，這回一定贏！'],
};

export const REQUEST_APOLOGIZE: PerType = {
    Brave: ['{cite}失手，是{self}技不如人。主公責罰，{self}絕無怨言。'],
    Wise: ['{cite}之敗，咎在於臣。願領罰，更願檢討得失後再為主公辦事。'],
    Loyal: ['辱主公所託，{cite}一事{self}願領罰，更願再試。'],
    Playful: ['哎呀，{cite}搞砸了……主公要罵就罵吧，{self}認了。'],
};

export const REQUEST_COMPLAIN_IDLE: PerType = {
    Brave: ['主公已 {n} 季沒派{self}差事了（上回是{cite}），刀都要生鏽了！'],
    Wise: ['主公已 {n} 季不曾差遣臣（上回是{cite}），莫非臣有不當之處？'],
    Loyal: ['主公已 {n} 季不用{self}了（上回是{cite}），莫非嫌棄？'],
    Playful: ['{n} 季沒出門啦（上回是{cite}），悶得發慌，主公把{self}忘了嗎？'],
};

/** 進言：依觸發原因分款，不分性格（性格只決定誰會進言） */
export const REQUEST_ADVISE: Readonly<Record<'CAUTION' | 'IDLE' | 'WINNING' | 'BOND', readonly string[]>> = {
    CAUTION: ['近日{cite}連失 {n} 回，宜先補足情報、探明虛實再行。', '{cite}之後屢敗（連 {n} 回），{self}以為此類差事宜先查明敵情。'],
    IDLE: ['主公近來久未出戰（上回是{cite}），軍心恐懈，宜操練以待時機。', '久未用兵（上回是{cite}），將士易惰，請主公擇機一戰。'],
    WINNING: ['{cite}之後連戰皆捷，士氣正旺，宜乘勝再進一步。', '近日{cite}得手，此類差事可再多派。'],
    BOND: ['{self}與{partner}並肩 {n} 回（上回{cite}），默契已成，可多派我二人同行。', '有{partner}同往，{cite}那般差事{self}更有把握，請主公留意。'],
};

export const REQUEST_DEFY_LETTER: readonly string[] = [
    '{name}：主公，近來屢受冷遇，連你也無一句慰勉。{cite}之事，這一回{self}不能從命，望主公體察。',
    '{name}：連番被駁、被冷落，{self}心灰意冷。這一回{self}不願從命（{cite}），非敢不敬，只盼主公明白。',
];

const REQUEST_TEXTS: Readonly<Record<Exclude<MindRequestKind, 'ADVISE' | 'DEFY_LETTER' | 'ASK_BATTLE'>, PerType>> = {
    ASK_PROMOTE: REQUEST_ASK_PROMOTE,
    REDEEM: REQUEST_REDEEM,
    APOLOGIZE: REQUEST_APOLOGIZE,
    COMPLAIN_IDLE: REQUEST_COMPLAIN_IDLE,
};

export type AdviseVariant = 'CAUTION' | 'IDLE' | 'WINNING' | 'BOND';

/** 組出請求內文；缺槽位時保留原樣（呼叫端的測試會抓到），不丟例外 */
export function requestText(kind: MindRequestKind, type: GeneralPersonalityType, slots: MindSlots, seed: number, extra: { grudge?: boolean; advise?: AdviseVariant } = {}): string {
    const h = mindHash(seed, `${kind}|${slots.name ?? ''}`);
    let template: string;
    if (kind === 'ASK_BATTLE') template = pick((extra.grudge ? REQUEST_ASK_BATTLE_GRUDGE : REQUEST_ASK_BATTLE)[type], h >>> 3);
    else if (kind === 'ADVISE') template = pick(REQUEST_ADVISE[extra.advise ?? 'CAUTION'], h >>> 3);
    else if (kind === 'DEFY_LETTER') template = pick(REQUEST_DEFY_LETTER, h >>> 3);
    else template = pick(REQUEST_TEXTS[kind][type], h >>> 3);
    return fillSlots(template, withVoiceSlots(slots, type));
}

// ───────────────────────── 玩家回應後的反應 ─────────────────────────

export const REPLY_GRANT: Readonly<Record<MindRequestKind, PerType>> = {
    ASK_PROMOTE: {
        Brave: ['多謝主公！{self}必以戰功回報！'], Wise: ['謝主公賜封，臣定不負所託。'],
        Loyal: ['主公厚恩，{self}沒齒難忘。'], Playful: ['嘿嘿，主公夠意思！以後有事儘管吩咐！'],
    },
    ASK_BATTLE: {
        Brave: ['痛快！{self}這就去磨刀，定不辱使命！'], Wise: ['謝主公成全，臣會謀定而後動。'],
        Loyal: ['謝主公信任，{self}必竭盡全力。'], Playful: ['太好啦！這場仗{self}包了！'],
    },
    REDEEM: {
        Brave: ['謝主公！{cite}的恥，這回一併雪清！'], Wise: ['謝主公，這回臣必先備後行。'],
        Loyal: ['謝主公給{self}贖過的機會，必不再辜負。'], Playful: ['耶！這回換{self}贏給你看！'],
    },
    APOLOGIZE: {
        Brave: ['主公不罰，{self}更要拚命報答。'], Wise: ['承主公寬宏，臣會記取教訓。'],
        Loyal: ['主公寬厚，{self}無地自容，唯有再試以報。'], Playful: ['呼，主公沒罵{self}，下回一定爭氣！'],
    },
    COMPLAIN_IDLE: {
        Brave: ['主公還記著{self}，這就夠了！下回儘管差{self}！'], Wise: ['承主公撫慰，臣心安矣。'],
        Loyal: ['主公不棄，{self}感激涕零。'], Playful: ['哈，被安撫啦，{self}心情好多了！'],
    },
    ADVISE: {
        Brave: ['主公英明，採納{self}之言！'], Wise: ['主公肯納言，臣之幸也。'],
        Loyal: ['主公聽進{self}的話，{self}很欣慰。'], Playful: ['哇，主公真的聽進去啦！'],
    },
    DEFY_LETTER: {
        Brave: ['（{self}看了主公的回音，怒氣稍平。）'], Wise: ['（臣已知悉，且看主公後續。）'],
        Loyal: ['（{self}望主公日後多體恤。）'], Playful: ['（哼，下不為例。）'],
    },
};

export const REPLY_DENY: Readonly<Record<MindRequestKind, PerType>> = {
    ASK_PROMOTE: {
        Brave: ['哼……既然主公不允，{self}等著下回再請。'], Wise: ['臣明白了，時機未到，容臣再積功勞。'],
        Loyal: ['是{self}操之過急，主公莫怪。'], Playful: ['唉，被駁啦，那就下次再說。'],
    },
    ASK_BATTLE: {
        Brave: ['不准？{self}憋著一身力氣呢……罷了。'], Wise: ['臣知曉了，且待時機。'],
        Loyal: ['既是主公之意，{self}聽命便是。'], Playful: ['沒意思，那{self}再去閒晃閒晃。'],
    },
    REDEEM: {
        Brave: ['……{self}記著這口氣，下回再請。'], Wise: ['臣明白，容臣再思量。'],
        Loyal: ['主公不許，是{self}尚未足以讓主公放心。'], Playful: ['切，不給{self}機會，真小氣。'],
    },
    APOLOGIZE: {
        Brave: ['主公責罰得是，{self}受著。'], Wise: ['臣領受，必當反省。'],
        Loyal: ['是{self}辜負了主公，願受責備。'], Playful: ['嗚，被罵啦……{self}知道錯了。'],
    },
    COMPLAIN_IDLE: {
        Brave: ['……{self}明白了，那便繼續等著。'], Wise: ['臣知曉了，不敢再擾。'],
        Loyal: ['是{self}多慮了，打擾主公。'], Playful: ['哦……那{self}自己找樂子去。'],
    },
    ADVISE: {
        Brave: ['主公自有主張，{self}不多言。'], Wise: ['臣之言或有不周，主公裁量即可。'],
        Loyal: ['{self}多嘴了，主公莫怪。'], Playful: ['好吧好吧，當{self}沒說。'],
    },
    DEFY_LETTER: {
        Brave: ['……'], Wise: ['……'], Loyal: ['……'], Playful: ['……'],
    },
};

export function replyText(kind: MindRequestKind, accept: boolean, type: GeneralPersonalityType, slots: MindSlots, seed: number): string {
    const table = accept ? REPLY_GRANT : REPLY_DENY;
    const h = mindHash(seed, `reply|${kind}|${accept}|${slots.name ?? ''}`);
    return fillSlots(pick(table[kind][type], h >>> 3), withVoiceSlots(slots, type));
}

// ───────────────────────── 選將意見（勸阻附原因）─────────────────────────

export const OPINION_CAUTION: PerType = {
    Brave: ['{cite}連栽 {n} 回，這次沒摸清底細，{self}不想再白跑。主公堅持，{self}自當拚命。'],
    Wise: ['{cite}連失 {n} 回，情報不足，{self}不敢輕進。主公若執意，{self}自當盡力。'],
    Loyal: ['{cite}連失 {n} 回，{self}怕再辜負主公，懇請先補情報。主公之命，{self}不敢違。'],
    Playful: ['{cite}連輸 {n} 回，這差事邪門，{self}有點發怵。主公說了算啦。'],
};

export const OPINION_REDEEM: PerType = {
    Brave: ['{cite}之恥{self}未忘，這回讓{self}去！'],
    Wise: ['{cite}之失{self}已檢討，這回必能補回。'],
    Loyal: ['{cite}之過{self}銘記在心，這回定要贖過。'],
    Playful: ['{cite}輸得不甘心，這回換{self}來！'],
};

export const OPINION_CONFIDENT: readonly string[] = [
    '{cite}得手過 {win} 回，這類差事包在{self}身上。',
    '這種差事{self}有把握（{cite}成過），主公儘管放心。',
];

export const OPINION_BOND: readonly string[] = ['若與{partner}同往，{self}無憂。', '有{partner}同行，{self}心裡踏實。'];

export const OPINION_GRUDGE: readonly string[] = ['與{partner}同行？{self}與對方有舊怨，恐難配合，主公三思。', '{partner}與{self}不對盤，同往恐生事端。'];

export const OPINION_MOOD_LOW: readonly string[] = ['近來心緒不寧，這差事恐難盡心，主公三思。', '近來提不起勁，換個人或許更穩妥。'];

export const OPINION_DEFAULT: readonly string[] = ['{self}遵命。', '聽憑主公差遣。'];

export function opinionLine(
    cause: 'CAUTION' | 'REDEEM' | 'CONFIDENT' | 'BOND' | 'GRUDGE' | 'MOOD_LOW' | 'NONE',
    type: GeneralPersonalityType,
    slots: MindSlots,
    seed: number,
): string {
    const h = mindHash(seed, `opinion|${cause}|${slots.name ?? ''}`) >>> 3;
    let template: string;
    switch (cause) {
        case 'CAUTION': template = pick(OPINION_CAUTION[type], h); break;
        case 'REDEEM': template = pick(OPINION_REDEEM[type], h); break;
        case 'CONFIDENT': template = pick(OPINION_CONFIDENT, h); break;
        case 'BOND': template = pick(OPINION_BOND, h); break;
        case 'GRUDGE': template = pick(OPINION_GRUDGE, h); break;
        case 'MOOD_LOW': template = pick(OPINION_MOOD_LOW, h); break;
        default: template = pick(OPINION_DEFAULT, h);
    }
    return fillSlots(template, withVoiceSlots(slots, type));
}
