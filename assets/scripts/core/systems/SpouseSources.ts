// @spec-source → 家族子嗣與血統總規格書 (doc_spec_1241) 3.2 配偶三來源；遊戲定調 doc_spec_1265 第 3 章；PROG-2-9583
/**
 * SpouseSources — 配偶三來源（結緣好感、聯姻外交、媒人說親）的純規則與文案（不依賴 cc）。
 *
 * 權威判定都在這裡算、GameSession 只負責套用：好感門檻、邦交門檻、媒人候選的固定種子 slot 與每年上限。
 * 生成型配偶的 id 由 slot 推出（spouse_gen_<slot>），所以來源與年度可由 id 反推，家族紀錄不用多存欄位。
 *
 * Unity 對照：像三個 ScriptableObject 判定函式，輸入設定與當下數值、輸出可不可以。
 */
import type { FamilyConfigV1 } from '../../shared/family/FamilyConfig';
import type { GeneralConfig } from '../models/GeneralUnit';
import { buildGeneratedSpouse } from './GeneratedSpouse';

export const MATCHMAKER_CANDIDATES = 3;
/** 聯姻成婚後邦交加成（規格 3.2） */
export const MARRIAGE_RELATION_GAIN = 20;
/** 友好以上才能聯姻：邦交值門檻（RelationTier friendly = 40） */
export const FRIENDLY_RELATION = 40;
export const SEASONS_PER_YEAR = 4;

/** 媒人價格未定（Q-F2）：UI 顯示的固定文案 */
export const MATCHMAKER_CLOSED_LABEL = '即將開放';
export const MATCHMAKER_CLOSED_LINE = '媒婆還在排隊拿號碼牌，這項服務「即將開放」，先去逛逛別的。';

/** 輕鬆口語的家世提示（暫定文案，OPEN：企劃潤稿） */
export const FAMILY_HINTS: readonly string[] = [
    '書香門第，嫁妝是三車竹簡，打字很慢但識字很多',
    '商賈世家，帳算得比你還精，記得別跟她對帳',
    '將門之後，會騎馬也會嘴砲，吵架先別跟她比嗓門',
    '小戶人家，勤儉持家，錢包比你還穩',
];

export const BOND_LINE = (name: string): string => `${name}跟你的好感已經破表，要不要乾脆把她納為配偶？再不說，她的信箱都要塞爆了。`;
export const DIPLOMATIC_LINE = (nation: string): string => `${nation}送來一位千金，說是「友好交流」，白話文就是：請多多關照，順便別打我們。`;

export function bondAffinityMet(affinity: number, config: FamilyConfigV1): boolean {
    return affinity >= config.bondAffinityToMarry;
}

export function relationAllowsAlliance(relation: number): boolean {
    return relation >= FRIENDLY_RELATION;
}

export function matchmakerSlot(year: number, index: number): string {
    return `matchmaker:y${year}:${index}`;
}

export function diplomaticSlot(nationId: string, ordinal: number): string {
    return `diplomatic:${nationId}:${ordinal}`;
}

/** 由生成型配偶 id 反推來源；非生成型（含結緣納入）回 null */
export function spouseSourceOf(generalId: string): 'first-child' | 'matchmaker' | 'diplomatic' | null {
    if (!generalId.startsWith('spouse_gen_')) return null;
    const body = generalId.slice('spouse_gen_'.length);
    if (body === 'first-child') return 'first-child';
    if (body.startsWith('matchmaker_')) return 'matchmaker';
    if (body.startsWith('diplomatic_')) return 'diplomatic';
    return null;
}

/** 聯姻配偶的母國勢力 id（母國牽掛：開戰時心情／忠誠下降、不可出征對抗母國；規格 3.2、裁決 Q-SP2）；非聯姻配偶回 null */
export function spouseHomeNationOf(generalId: string): string | null {
    const m = /^spouse_gen_diplomatic_(.+)_\d+$/.exec(generalId);
    return m ? m[1] : null;
}

/** 媒人候選 id 的年度（matchmaker_y<year>_<n>）；其他來源回 null */
export function matchmakerYearOf(generalId: string): number | null {
    const m = /^spouse_gen_matchmaker_y(\d+)_\d+$/.exec(generalId);
    return m ? Number(m[1]) : null;
}

export interface MatchmakerCandidate {
    index: number;
    generalId: string;
    name: string;
    ep: number;
    hint: string;
}

/** 某年的三位候選（固定種子：同一年同一位序永遠同一人，重開遊戲、重新整理都不會變） */
export function matchmakerCandidates(year: number, config: FamilyConfigV1): MatchmakerCandidate[] {
    const out: MatchmakerCandidate[] = [];
    for (let i = 0; i < MATCHMAKER_CANDIDATES; i++) {
        const g: GeneralConfig = buildGeneratedSpouse({ slot: matchmakerSlot(year, i), epRange: config.generatedSpouseEp });
        const ep = g.ep ?? 0;
        out.push({ index: i, generalId: g.id, name: g.name, ep, hint: FAMILY_HINTS[(ep + i) % FAMILY_HINTS.length] });
    }
    return out;
}
