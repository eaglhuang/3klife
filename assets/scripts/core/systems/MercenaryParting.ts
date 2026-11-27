// @spec-source → 六日傭兵結義好感到期退場規格 doc_spec_0583 §5.1（離隊寄客卿留書，附贈留念禮物，好感越高越豐厚）；禮物內容與數量為 PM 暫定，放 reward-config.json 的 BUNDLE_MERC_PARTING_*；PROG-2-10207
/**
 * MercenaryParting — 傭兵到期離隊的留念禮物（純邏輯，不依賴 cc）。
 *
 * 好感分級（oath-config.json parting.tiers）→ 獎勵套件 id；實際入帳走共用獎勵框架 reward.claim，
 * grantKey 以傭兵 uid 與離隊日序組成，重送不重複入帳。這裡只算「該領哪一包」，不入帳。
 */
import type { OathConfig } from './OathConfig';

export interface PartingGiftClaim {
    bundleId: string;
    grantKey: string;
    source: { kind: 'mercenary'; ref: string };
}

/** 依好感取最高一檔（好感 >= minAffection 的最後一檔）；tiers 為空回傳 null。 */
export function partingGiftClaim(uid: string, affection: number, day: number, config: OathConfig): PartingGiftClaim | null {
    let picked: string | null = null;
    for (const tier of config.parting.tiers) {
        if (affection >= tier.minAffection) picked = tier.bundleId;
    }
    if (!picked) return null;
    return { bundleId: picked, grantKey: `merc-parting:${uid}:${day}`, source: { kind: 'mercenary', ref: uid } };
}
