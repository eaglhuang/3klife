/**
 * MarriageRelationTags — 結緣選角關係標籤與加成預覽（純邏輯，不依賴 cc）
 */

export interface MarriageRelationTagInput {
    isOathBrotherOrSister: boolean;
    isRival: boolean;
    isComrade: boolean;
    oathBonusPct?: number;
    rivalMutationPct?: number;
    comradeBonusPct?: number;
}

export interface MarriageRelationTagItem {
    key: string;
    args: string[];
}

export interface MarriageRelationTagSummary {
    visibleTags: MarriageRelationTagItem[];
    overflowCount: number;
}

const MAX_VISIBLE_TAGS = 2;

export function buildMarriageRelationTags(input: MarriageRelationTagInput): MarriageRelationTagSummary {
    const all: MarriageRelationTagItem[] = [];
    if (input.isOathBrotherOrSister) {
        all.push({
            key: 'ui.marriage.tag.oath_matchmaker',
            args: [String(input.oathBonusPct ?? 10)],
        });
    }
    if (input.isRival) {
        all.push({
            key: 'ui.marriage.tag.rival_mutation',
            args: [String(input.rivalMutationPct ?? 15)],
        });
    }
    if (input.isComrade) {
        all.push({
            key: 'ui.marriage.tag.comrade_bonus',
            args: [String(input.comradeBonusPct ?? 10)],
        });
    }
    const visibleTags = all.slice(0, MAX_VISIBLE_TAGS);
    const overflowCount = Math.max(0, all.length - MAX_VISIBLE_TAGS);
    return { visibleTags, overflowCount };
}

export function formatMarriageRelationTagsLine(
    summary: MarriageRelationTagSummary,
    t: (key: string, ...args: string[]) => string,
): string {
    if (summary.visibleTags.length === 0) return '';
    const parts = summary.visibleTags.map((tag) => `[${t(tag.key, ...tag.args)}]`);
    if (summary.overflowCount > 0) {
        parts.push(`[+${summary.overflowCount}]`);
    }
    return parts.join(' ');
}
