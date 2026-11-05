// @spec-source → 血統傳承 G3 §E #1、§J 多樣性係數 D（PROG-2-1829）
/**
 * DiversityFactor — 雙親祖位的異質程度（純邏輯，不依賴 cc）
 *
 * 規格只定義「近親或雙重表親會扣減 D，最低扣至 0，進而降低五維總和期望」，沒有公式。
 * 暫定：以 G2 §F-2 的席位權重（祖輩 0.14、曾祖 0.07）算兩邊有多少比例的祖位出現在對方譜上，
 * 取平均後 D = 1 − 重疊比例。雙親兩席不計，那是同姓不婚與近親封鎖在管的範圍。
 * 算出來：雙重表親 0、一般表親 0.5、再從表親 0.875、無共祖 1。
 *
 * Unity 對照：像把兩份血統表攤開比對，回傳一個 0~1 的係數給繁殖公式用。
 */
import { PEDIGREE_SLOTS, pedigreeSlotGeneration, type Pedigree, type PedigreeSlot } from '../services/BloodlineGraph';

const SEAT_WEIGHT: Record<2 | 3, number> = { 2: 0.14, 3: 0.07 };
const SCORED_SLOTS = PEDIGREE_SLOTS.filter((slot) => pedigreeSlotGeneration(slot) > 1);
const SCORED_TOTAL = SCORED_SLOTS.reduce((sum, slot) => sum + seatWeight(slot), 0);

function seatWeight(slot: PedigreeSlot): number {
    return SEAT_WEIGHT[pedigreeSlotGeneration(slot) as 2 | 3];
}

function overlapShare(side: Pedigree, other: Pedigree): number {
    const others = PEDIGREE_SLOTS.map((slot) => other[slot]);
    const shared = SCORED_SLOTS.filter((slot) => !!side[slot] && others.indexOf(side[slot]) >= 0);
    return shared.reduce((sum, slot) => sum + seatWeight(slot), 0) / SCORED_TOTAL;
}

export function diversityFactor(father: Pedigree, mother: Pedigree): number {
    const overlap = (overlapShare(father, mother) + overlapShare(mother, father)) / 2;
    return Math.round((1 - overlap) * 1000) / 1000;
}

/** 沒有祖譜資料時視為無共祖 */
export function diversityOfPair(fatherId: string, motherId: string, source: { getPedigree?(uid: string): Pedigree } | undefined): number {
    if (!source?.getPedigree) return 1;
    return diversityFactor(source.getPedigree(fatherId), source.getPedigree(motherId));
}

/** 免費提示不給精確值，精確值要譜牒密考（G3 §C） */
export const DIVERSITY_HINT = '多樣性受損，功業加成折減';
