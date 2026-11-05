// @spec-source → 結緣系統（配種）.md (doc_spec_0028) §E #1 血統樹、UI 規格補遺_2026-04-11_培育戰場轉蛋pending.md (doc_ui_0031) BondingSetup
/**
 * BloodlineTreeSlots — 結緣畫面 14 人血統樹的格位排列（純邏輯，不依賴 cc）
 *
 * 排列與 BloodlineTreePanel 一致：祖先鏈依 BFS 順序，前 2 位放第 3 代、接著 4 位放第 2 代、最後 8 位放第 1 代。
 * 不足的格位以 null 補上，畫面顯示空白；祖先找不到名字時退回 uid。
 *
 * Unity 對照：像一個 Presenter，只把資料填進三排固定格數的 Slot 陣列，Label 文字交給畫面層套用。
 */

export const BLOODLINE_TREE_SLOT_COUNTS = { gen3: 2, gen2: 4, gen1: 8 } as const;

export interface BloodlineTreeSlot {
    /** 祖先 uid；空格為 null */
    uid: string | null;
    /** 畫面文字：空格為「—」，有資料時為名字（找不到名字則為 uid） */
    label: string;
}

export interface BloodlineTreeSlots {
    gen3: BloodlineTreeSlot[];
    gen2: BloodlineTreeSlot[];
    gen1: BloodlineTreeSlot[];
}

const EMPTY_LABEL = '—';

/** G2 §E #1：缺的祖位不留空 */
export const UNKNOWN_ANCESTOR_CARD_TEXT = '先祖佚名\n（世界基底池）';
/** G2 §G 展開三代十四席族譜 */
export const BLOODLINE_TREE_OPEN_LINE = '宗祠長老捧出竹簡：「參天之木，必有其根；懷山之水，必有其源。主公請看，此乃我族三代十四席之血脈淵源！」';

/** 外戚同源紅框的節點名；版面沒有這個節點的卡片不處理 */
export const TREE_CARD_KIN_FRAME = 'KinFrame';

/** 族譜裡出現兩次以上的祖先（總綱 M_stage 表 G3 共祖掃描）；空格不算 */
export function sharedAncestorUids(uids: readonly (string | null | undefined)[]): Set<string> {
    const seen = new Set<string>();
    const shared = new Set<string>();
    for (const uid of uids) {
        if (!uid) continue;
        if (seen.has(uid)) shared.add(uid);
        seen.add(uid);
    }
    return shared;
}

/** G2 §B-2：每席公開傳遞權重；比例與 FactorInheritance.FACTOR_POOL_RATE 相同 */
export const PEDIGREE_SEAT_WEIGHTS = { parent: 0.28, grandparent: 0.14, greatGrandparent: 0.07 } as const;

/** 族譜列標籤：世代、人數、每席權重 */
export function pedigreeRowLabel(generation: string, seats: number, weight: number): string {
    return `${generation}\n(${seats}人)\n每席 ${weight.toFixed(2)}`;
}

/** G2 §E #1 祖先卡頭像的排版：頭像在上、文字下移；沒有頭像時文字置中 */
export const TREE_CARD_AVATAR = { nodeName: 'Avatar', size: 32, y: 30, textOffsetY: -16 } as const;

/** 哪個 id 要載頭像：虛擬祖先與佚名祖位沒有畫像，回傳 null */
export function ancestorAvatarId(person: { uid: string; is_virtual?: boolean } | null | undefined): string | null {
    return person && !person.is_virtual ? person.uid : null;
}

/** 祖先卡文字：姓名、EP、主因子；沒有主因子就不佔一行 */
export function ancestorCardText(name: string, ep: number, mainFactorName?: string | null): string {
    return [name, `EP ${Math.round(ep)}`, mainFactorName].filter((line) => !!line).join('\n');
}

/** 結緣畫面的小格位：父母一行姓名加 EP，祖輩兩行，曾祖只放得下姓名 */
export function bondingSeatText(seatIndex: number, person: { name: string; ep: number } | null): string {
    const { gen3, gen2 } = BLOODLINE_TREE_SLOT_COUNTS;
    const isGreatGrandparent = seatIndex >= gen3 + gen2;
    if (!person) return isGreatGrandparent ? '佚名' : '先祖佚名';
    // 虛擬祖先的名字是「郡望 稱呼」，小格只放得下稱呼
    if (isGreatGrandparent) return person.name.split(' ').pop() ?? person.name;
    return seatIndex < gen3 ? `${person.name} EP ${Math.round(person.ep)}` : `${person.name}\nEP ${Math.round(person.ep)}`;
}

function fill(ancestors: ReadonlyArray<string | null>, count: number, nameOf: (uid: string) => string | undefined): BloodlineTreeSlot[] {
    return Array.from({ length: count }, (_, i) => {
        const uid = ancestors[i] ?? null;
        return { uid, label: uid === null ? EMPTY_LABEL : nameOf(uid) ?? uid };
    });
}

/**
 * 把祖先 uid 鏈排進三排格位；ancestors 不改。null 代表這個位置沒有人，後面的人不會往前擠。
 * 超過 14 位的部分直接忽略（血統樹只畫到第 3 代）。
 */
export function buildBloodlineTreeSlots(
    ancestors: ReadonlyArray<string | null>,
    nameOf: (uid: string) => string | undefined = () => undefined,
): BloodlineTreeSlots {
    const { gen3, gen2, gen1 } = BLOODLINE_TREE_SLOT_COUNTS;
    return {
        gen3: fill(ancestors.slice(0, gen3), gen3, nameOf),
        gen2: fill(ancestors.slice(gen3, gen3 + gen2), gen2, nameOf),
        gen1: fill(ancestors.slice(gen3 + gen2, gen3 + gen2 + gen1), gen1, nameOf),
    };
}
