import config from '../../../resources/data/master/jealousy-and-dynasty-config.json';

export type JealousyOption = 'A' | 'B' | 'C';

export interface JealousyState {
    favor: number;
    gold: number;
    caughtCount: number;
    unlockedTitles: string[];
}

export interface JealousyResolution {
    option: JealousyOption;
    goldCost: number;
    favorDelta: number;
    newlyUnlockedTitle: string | null;
    nextState: JealousyState;
}

export interface DynastyBadgeCheckResult {
    year: number;
    consecutiveFirstPlaceCount: number;
    unlocked: boolean;
    badgeTitle: string | null;
    note: string;
}

/**
 * 吃醋三選項與三連霸「天下名門」徽章純邏輯服務（PROG-2-10033）
 * 所有價格公式、抓包門檻與三連霸條件皆從 jealousy-and-dynasty-config.json 讀取。
 */
export class JealousyAndDynastyService {
    public static getOptionBPrice(year: number): number {
        const y = Math.max(1, Math.floor(year));
        const { basePrice, yearlyScale } = config.jealousy.optionB;
        return Math.round(basePrice * (1 + yearlyScale * (y - 1)));
    }

    public static resolveJealousyOption(
        state: JealousyState,
        option: JealousyOption,
        year: number,
    ): JealousyResolution {
        if (option === 'A') {
            const delta = config.jealousy.optionA.favorDelta;
            return {
                option,
                goldCost: 0,
                favorDelta: delta,
                newlyUnlockedTitle: null,
                nextState: {
                    ...state,
                    favor: state.favor + delta,
                },
            };
        }

        if (option === 'B') {
            const cost = this.getOptionBPrice(year);
            const delta = config.jealousy.optionB.favorDelta;
            return {
                option,
                goldCost: cost,
                favorDelta: delta,
                newlyUnlockedTitle: null,
                nextState: {
                    ...state,
                    gold: Math.max(0, state.gold - cost),
                    favor: state.favor + delta,
                },
            };
        }

        // Option C: 裝傻打混，抓包 3 次解鎖「府中睡神」
        const nextCaught = state.caughtCount + 1;
        const threshold = config.jealousy.optionC.caughtThresholdForTitle;
        const title = config.jealousy.optionC.unlockedTitle;
        const shouldUnlock = nextCaught >= threshold && !state.unlockedTitles.includes(title);
        const nextTitles = shouldUnlock ? [...state.unlockedTitles, title] : [...state.unlockedTitles];

        return {
            option,
            goldCost: 0,
            favorDelta: config.jealousy.optionC.favorDelta,
            newlyUnlockedTitle: shouldUnlock ? title : null,
            nextState: {
                ...state,
                favor: state.favor + config.jealousy.optionC.favorDelta,
                caughtCount: nextCaught,
                unlockedTitles: nextTitles,
            },
        };
    }

    /**
     * 檢查是否觸發三連霸「天下名門」徽章（首年不會觸發）。
     */
    public static checkDynastyBadge(year: number, consecutiveFirstPlaceCount: number): DynastyBadgeCheckResult {
        if (year <= 1 && config.dynastyBadge.neverTriggersInYearOne) {
            return {
                year,
                consecutiveFirstPlaceCount,
                unlocked: false,
                badgeTitle: null,
                note: '首年不會觸發三連霸「天下名門」徽章。',
            };
        }

        const unlocked = consecutiveFirstPlaceCount >= config.dynastyBadge.requiredConsecutiveFirstPlace;
        return {
            year,
            consecutiveFirstPlaceCount,
            unlocked,
            badgeTitle: unlocked ? config.dynastyBadge.badgeTitle : null,
            note: unlocked
                ? `達成連續 ${consecutiveFirstPlaceCount} 年第一名，解鎖「${config.dynastyBadge.badgeTitle}」徽章！`
                : `目前連霸 ${consecutiveFirstPlaceCount} 年，尚需連續 ${config.dynastyBadge.requiredConsecutiveFirstPlace} 年第一名。`,
        };
    }
}
