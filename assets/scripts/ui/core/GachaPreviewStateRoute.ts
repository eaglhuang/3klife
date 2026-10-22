import type { UIPreviewBinderState } from './UIPreviewStateApplicator';

export const GACHA_PREVIEW_BANNER_ART_BINDING = 'skinLayer_BannerCharacterArt';

export interface GachaPreviewContentFile {
    defaultState?: string;
    states?: Record<string, Record<string, unknown>>;
}

export function resolveGachaPreviewStateKey(defaultState: string, previewVariant = ''): string {
    const requested = previewVariant.trim().toLowerCase().split(':', 1)[0];
    if (requested === 'hero') {
        return 'bloodline-seed';
    }
    if (requested === 'support') {
        return 'nurture-depth';
    }
    if (requested === 'limited') {
        return 'limited-spotlight';
    }
    if (
        requested === 'bloodline-seed'
        || requested === 'nurture-depth'
        || requested === 'limited-spotlight'
    ) {
        return requested;
    }
    return defaultState;
}

export function resolveGachaPreviewGeneralIdOverride(previewVariant = ''): string | null {
    const segments = previewVariant.trim().toLowerCase().split(':').map((part) => part.trim()).filter(Boolean);
    if (segments.length < 2 || segments[1] === 'seed') {
        return null;
    }
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(segments[1]) ? segments[1] : null;
}

export function resolveGachaPreviewPortraitPath(generalId: string): string {
    const normalizedId = generalId.trim().toLowerCase();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalizedId)) {
        throw new Error(`Invalid gacha preview general id: ${generalId}`);
    }
    return `sprites/generals/${normalizedId.replace(/-/g, '_')}_portrait`;
}

export function orderGachaPreviewCandidateIds(
    candidateIds: string[],
    previewVariant = '',
    random: () => number = Math.random,
): string[] {
    const uniqueIds = Array.from(new Set(candidateIds
        .filter((id): id is string => typeof id === 'string')
        .map((id) => id.trim().toLowerCase())
        .filter((id) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id))));
    const requestedId = resolveGachaPreviewGeneralIdOverride(previewVariant);
    const requestedIndex = requestedId ? uniqueIds.indexOf(requestedId) : -1;
    const requested = requestedIndex >= 0 ? uniqueIds.splice(requestedIndex, 1)[0] : null;
    const seed = resolveGachaPreviewSeed(previewVariant);
    const nextRandom = seed ? createSeededRandom(seed) : random;

    for (let index = uniqueIds.length - 1; index > 0; index -= 1) {
        const sample = Math.max(0, Math.min(0.999999999, nextRandom()));
        const swapIndex = Math.floor(sample * (index + 1));
        [uniqueIds[index], uniqueIds[swapIndex]] = [uniqueIds[swapIndex], uniqueIds[index]];
    }

    return requested ? [requested, ...uniqueIds] : uniqueIds;
}

function resolveGachaPreviewSeed(previewVariant: string): string | null {
    const segments = previewVariant.trim().split(':').map((part) => part.trim());
    if (segments.length < 3 || segments[1].toLowerCase() !== 'seed') {
        return null;
    }
    return segments.slice(2).join(':') || null;
}

function createSeededRandom(seed: string): () => number {
    let state = 2166136261;
    for (let index = 0; index < seed.length; index += 1) {
        state ^= seed.charCodeAt(index);
        state = Math.imul(state, 16777619);
    }
    return () => {
        state += 0x6D2B79F5;
        let value = state;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
}

export function resolveGachaPreviewContentState(
    content: GachaPreviewContentFile,
    previewVariant = '',
): Record<string, unknown> | null {
    const defaultState = typeof content?.defaultState === 'string' ? content.defaultState : 'bloodline-seed';
    const stateKey = resolveGachaPreviewStateKey(defaultState, previewVariant);
    return content?.states?.[stateKey] ?? content?.states?.[defaultState] ?? null;
}

export function buildGachaPreviewBinderState(state: Record<string, unknown>): UIPreviewBinderState {
    const poolTierLabel = typeof state?.poolTierLabel === 'string' ? state.poolTierLabel : 'SSR';
    const pityTrackWidthPct = resolveGachaPityTrackWidthPct(state);
    const palette = resolveGachaPreviewPalette(state);
    return {
        texts: {
            PoolNameStripValue: toPreviewText(state?.poolNameStripValue),
            TitleLabel: toPreviewText(state?.railTitle),
            PoolSubtitleLabel: toPreviewText(state?.railSubtitle),
            PoolTierLabel: poolTierLabel,
            FeaturedLabel: toPreviewText(state?.featuredLabel),
            BannerHeroName: toPreviewText(state?.bannerHeroName),
            TimerLabel: toPreviewText(state?.bannerHeroSubtitle),
            SmallPityLabel: toPreviewText(state?.smallPityLabel),
            BigPityLabel: toPreviewText(state?.pityValue),
            PoolPositioningTitle: toPreviewText(state?.poolPositioningTitle),
            PoolPositioningBrief: toPreviewText(state?.poolPositioningBrief),
            CostSingleValue: toPreviewText(state?.costSingleValue),
            CostTenValue: toPreviewText(state?.costTenValue),
            CostBalanceValue: toPreviewText(state?.costBalanceValue),
            RulesNote: toPreviewText(state?.rulesNote),
            PullBarPoolValue: toPreviewText(state?.pullBarPoolValue),
            Pull1Label: toPreviewText(state?.pull1Label),
            Pull1Cost: toPreviewText(state?.pull1Cost),
            Pull10Label: toPreviewText(state?.pull10Label),
            Pull10Hint: toPreviewText(state?.pull10Hint),
            Pull10Cost: toPreviewText(state?.pull10Cost),
        },
        spriteColors: {
            PoolTierBadge: palette.poolBadgeColor,
            PoolTierUnderlay: palette.poolBadgeUnderlayColor,
            PityTrackFill: palette.pityFillColor,
            PityTrackBg: palette.pityBorderColor,
            BannerFadeRight: withAlpha(palette.bannerFadeEdgeColor, 158),
        },
        labelColors: {
            FeaturedLabel: palette.eventChipColor,
            BannerHeroName: palette.heroNameColor,
            SmallPityLabel: palette.guaranteeChipColor,
            PoolTierLabel: palette.poolTierTextColor,
            PityScale0: palette.pityScaleColor,
            PityScale25: palette.pityScaleColor,
            PityScale50: palette.pityScaleColor,
            PityScale75: palette.pityScaleColor,
            PityScaleCap: palette.pityScaleColor,
        },
        nodeWidthPercents: {
            PityTrackFill: {
                percent: pityTrackWidthPct,
                relativeTo: 'PityTrackBg',
            },
        },
        rarityDocks: [
            {
                tier: resolveGachaPreviewRarityTier(poolTierLabel),
                binding: {
                    dockNodeName: 'PoolTierDock',
                    underlayNodeName: 'PoolTierUnderlay',
                    badgeNodeName: 'PoolTierBadge',
                    labelNodeName: 'PoolTierLabel',
                },
            },
        ],
    };
}

function resolveGachaPityTrackWidthPct(state: Record<string, unknown>): number {
    const fromState = Number(state?.pityTrackWidthPct);
    if (Number.isFinite(fromState)) {
        return Math.max(0, Math.min(100, Math.round(fromState)));
    }

    const pityValue = typeof state?.pityValue === 'string' ? state.pityValue : '';
    const match = pityValue.match(/(\d+)\s*\/\s*(\d+)/);
    if (match) {
        const cur = Number(match[1]);
        const max = Number(match[2]);
        if (Number.isFinite(cur) && Number.isFinite(max) && max > 0) {
            return Math.max(0, Math.min(100, Math.round((cur / max) * 100)));
        }
    }

    return 70;
}

function resolveGachaPreviewPalette(state: Record<string, unknown>): {
    poolBadgeColor: string;
    poolBadgeUnderlayColor: string;
    pityFillColor: string;
    pityBorderColor: string;
    pityScaleColor: string;
    eventChipColor: string;
    heroNameColor: string;
    guaranteeChipColor: string;
    poolTierTextColor: string;
    bannerFadeEdgeColor: string;
} {
    const theme = typeof state?.poolTheme === 'string' ? state.poolTheme.trim().toLowerCase() : '';
    const accent = typeof state?.poolAccentColor === 'string' ? state.poolAccentColor.trim() : '';

    switch (theme) {
    case 'support':
        return {
            poolBadgeColor: resolveGachaPreviewColor(accent, '#A4D2D0'),
            poolBadgeUnderlayColor: resolveGachaPreviewColor(accent, '#A4D2D0'),
            pityFillColor: resolveGachaPreviewColor(accent, '#A4D2D0'),
            pityBorderColor: resolveGachaPreviewColor(accent, '#A4D2D0'),
            pityScaleColor: resolveGachaPreviewColor(accent, '#A4D2D0'),
            eventChipColor: resolveGachaPreviewColor(accent, '#A4D2D0'),
            heroNameColor: resolveGachaPreviewColor(accent, '#A4D2D0'),
            guaranteeChipColor: resolveGachaPreviewColor(accent, '#A4D2D0'),
            poolTierTextColor: '#2D2926',
            bannerFadeEdgeColor: '#081110',
        };
    case 'legendary':
        return {
            poolBadgeColor: resolveGachaPreviewColor(accent, '#FFD700'),
            poolBadgeUnderlayColor: resolveGachaPreviewColor(accent, '#FFD700'),
            pityFillColor: resolveGachaPreviewColor(accent, '#FFD700'),
            pityBorderColor: resolveGachaPreviewColor(accent, '#FFD700'),
            pityScaleColor: resolveGachaPreviewColor(accent, '#FFD700'),
            eventChipColor: resolveGachaPreviewColor(accent, '#FFD700'),
            heroNameColor: resolveGachaPreviewColor(accent, '#FFD700'),
            guaranteeChipColor: resolveGachaPreviewColor(accent, '#FFD700'),
            poolTierTextColor: '#2D2926',
            bannerFadeEdgeColor: '#120b04',
        };
    case 'general':
    default:
        return {
            poolBadgeColor: resolveGachaPreviewColor(accent, '#9C27B0'),
            poolBadgeUnderlayColor: resolveGachaPreviewColor(accent, '#9C27B0'),
            pityFillColor: resolveGachaPreviewColor(accent, '#9C27B0'),
            pityBorderColor: resolveGachaPreviewColor(accent, '#9C27B0'),
            pityScaleColor: resolveGachaPreviewColor(accent, '#9C27B0'),
            eventChipColor: resolveGachaPreviewColor(accent, '#9C27B0'),
            heroNameColor: resolveGachaPreviewColor(accent, '#CE93D8'),
            guaranteeChipColor: resolveGachaPreviewColor(accent, '#CE93D8'),
            poolTierTextColor: '#FFFFFF',
            bannerFadeEdgeColor: '#0A0612',
        };
    }
}

function withAlpha(hex: string, alpha: number): [number, number, number, number] {
    const formatted = hex.startsWith('#') ? hex.slice(1) : hex;
    const normalized = formatted.length >= 6 ? formatted.slice(0, 6) : 'FFFFFF';
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    const resolvedAlpha = Math.max(0, Math.min(255, Math.round(alpha)));
    return [r, g, b, resolvedAlpha];
}

function resolveGachaPreviewColor(colorToken: string, fallbackHex: string): string {
    const normalized = colorToken.trim();
    if (!normalized) {
        return fallbackHex;
    }

    const tokenMap: Record<string, string> = {
        rarityPurple: '#9C27B0',
        rarityBlue: '#4A8FE7',
        rarityGreen: '#6DBA74',
        rarityWhite: '#F2F0E8',
        'accent.gold.cta': '#FFD700',
        'accent.jade.field': '#A4D2D0',
        textWarmGold: '#F0E68C',
        textSecondary: '#D0C5AF',
        textInk: '#2D2926',
        colorWhite: '#FFFFFF',
    };

    if (normalized.startsWith('#')) {
        return normalized;
    }

    return tokenMap[normalized] ?? fallbackHex;
}

function resolveGachaPreviewRarityTier(poolTierLabel: string): 'common' | 'rare' | 'epic' | 'legendary' | 'mythic' {
    switch (poolTierLabel.trim().toUpperCase()) {
    case 'R':
        return 'common';
    case 'SR':
        return 'rare';
    case 'UR':
        return 'legendary';
    case 'MR':
    case 'LR':
        return 'mythic';
    case 'SSR':
    default:
        return 'epic';
    }
}

function toPreviewText(value: unknown): string {
    if (typeof value === 'string') {
        return value;
    }
    if (typeof value === 'number') {
        return String(value);
    }
    return '';
}
