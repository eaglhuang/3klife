// @spec-source → 名將挑戰賽系統.md (doc_spec_0007) §E-10 賽季虎符連動、§季節 BOSS 與虎符連動（克制標籤命中弱點 ×1.5）
/**
 * TallyBossTags — 虎符的 BOSS 克制標籤與本季 BOSS 弱點命中統計（純邏輯，不依賴 cc）
 *
 * - 虎符有明確的 bossTags（新發行虎符自帶）時用明確標籤，濾掉不認得的標籤。
 * - 沒有時依兵種對照表推得；對照表外的兵種不帶標籤。
 *
 * PM 暫定（2026-10-28，可逆）：兵種對照表規格未寫，先用下表；緩速（SLOW）只靠明確標籤。
 * BOSS 戰需伺服器，這裡只算「誰命中」，傷害 ×1.5 由 bossWeaknessMultiplier 負責。
 * Unity 對照：像一張 ScriptableObject 對照表 + 一個查表函式。
 */
import type { TigerTallyCard } from '../models/TigerTallyCard';
import { TOURNAMENT_BOSS_TAG_LABEL, type TournamentBossTag, type TournamentSeasonBoss } from './TournamentLocal';

/** 兵種 → 克制標籤（暫定）；key 為 TroopType 字串值 */
export const TALLY_BOSS_TAGS_BY_TROOP: Readonly<Record<string, readonly TournamentBossTag[]>> = {
    archer: ['RANGED'],
    pikeman: ['ANTI_CAVALRY'],
    engineer: ['FIRE'],
    navy: ['FIRE'],
    shield: ['ANTI_CONTROL'],
    medic: ['ANTI_CONTROL'],
};

function isBossTag(tag: unknown): tag is TournamentBossTag {
    return typeof tag === 'string' && Object.prototype.hasOwnProperty.call(TOURNAMENT_BOSS_TAG_LABEL, tag);
}

/** 這張虎符的克制標籤：明確標籤優先，否則依兵種推得 */
export function tallyBossTags(card: Pick<TigerTallyCard, 'bossTags' | 'troopType'>): TournamentBossTag[] {
    if (Array.isArray(card.bossTags) && card.bossTags.length > 0) {
        return Array.from(new Set(card.bossTags.filter(isBossTag)));
    }
    return [...(TALLY_BOSS_TAGS_BY_TROOP[card.troopType ?? ''] ?? [])];
}

export interface TallyBossMatch {
    /** 命中弱點的虎符張數 */
    matchedCount: number;
    /** 命中的弱點標籤（依 BOSS 弱點順序） */
    matchedTags: TournamentBossTag[];
}

/** 統計一組虎符命中本季 BOSS 弱點的情況 */
export function tallyBossMatch(cards: readonly Pick<TigerTallyCard, 'bossTags' | 'troopType'>[], boss: Readonly<TournamentSeasonBoss>): TallyBossMatch {
    const hit = new Set<TournamentBossTag>();
    let matchedCount = 0;
    for (const card of cards) {
        const tags = tallyBossTags(card).filter((tag) => boss.weaknessTags.includes(tag));
        if (tags.length === 0) continue;
        matchedCount++;
        tags.forEach((tag) => hit.add(tag));
    }
    return { matchedCount, matchedTags: boss.weaknessTags.filter((tag) => hit.has(tag)) };
}

/** 彈窗用短句：「虎符命中 N 張（火攻、遠程）」；沒有命中時提示配置克制陣容 */
export function tallyBossMatchText(match: TallyBossMatch): string {
    if (match.matchedCount === 0) return '虎符命中 0 張，可配置克制陣容';
    return `虎符命中 ${match.matchedCount} 張（${match.matchedTags.map((tag) => TOURNAMENT_BOSS_TAG_LABEL[tag]).join('、')}）`;
}
