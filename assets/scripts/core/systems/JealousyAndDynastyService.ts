import config from '../../../resources/data/master/jealousy-and-dynasty-config.json';

export type JealousyOption = 'A' | 'B' | 'C';

export interface JealousyState {
    favor: number;
    stamina: number;
    gold: number;
    caughtCount: number;
    unlockedTitles: string[];
    /** 記錄每位配偶每年已觸發次數：key = `${spouseId}_y${year}` */
    spouseYearTriggerCount: Record<string, number>;
}

export interface JealousyResolution {
    option: JealousyOption;
    blockedByYearlyLimit: boolean;
    goldCost: number;
    favorDelta: number;
    staminaDelta: number;
    triggeredComedyStory: boolean;
    newlyUnlockedTitle: string | null;
    nextState: JealousyState;
}

export interface DynastyBadgeCheckResult {
    year: number;
    consecutiveFirstPlaceCount: number;
    unlocked: boolean;
    badgeTitle: string | null;
    academyBonusPct: number;
    salaryBonusPct: number;
    note: string;
}

/**
 * 吃醋三選項與三連霸「天下名門」徽章純邏輯服務（PROG-2-10033）
 * 所有機率、價格公式、精力變化、每年每配偶上限與徽章效果皆從 jealousy-and-dynasty-config.json 讀取。
 */
export class JealousyAndDynastyService {
    public static getOptionBPrice(year: number): number {
        const y = Math.max(1, Math.floor(year));
        const { basePrice, yearlyScale } = config.jealousy.optionB;
        return Math.round(basePrice * (1 + yearlyScale * (y - 1)));
    }

    /** 這位配偶本年是否還有吃醋名額（上限見 config.jealousy.maxPerSpousePerYear） */
    public static hasQuotaLeft(state: JealousyState, spouseId: string, year: number): boolean {
        return (state.spouseYearTriggerCount[`${spouseId}_y${year}`] ?? 0) < config.jealousy.maxPerSpousePerYear;
    }

    public static resolveJealousyOption(
        state: JealousyState,
        option: JealousyOption,
        year: number,
        spouseId: string,
        rollPercent: number = 0,
    ): JealousyResolution {
        const triggerKey = `${spouseId}_y${year}`;
        const prevCount = state.spouseYearTriggerCount[triggerKey] ?? 0;
        if (prevCount >= config.jealousy.maxPerSpousePerYear) {
            return {
                option,
                blockedByYearlyLimit: true,
                goldCost: 0,
                favorDelta: 0,
                staminaDelta: 0,
                triggeredComedyStory: false,
                newlyUnlockedTitle: null,
                nextState: state,
            };
        }

        const nextTriggers = {
            ...state.spouseYearTriggerCount,
            [triggerKey]: prevCount + 1,
        };

        if (option === 'A') {
            const success = rollPercent < config.jealousy.optionA.successRate;
            const delta = success ? config.jealousy.optionA.successFavorDelta : config.jealousy.optionA.failFavorDelta;
            return {
                option,
                blockedByYearlyLimit: false,
                goldCost: 0,
                favorDelta: delta,
                staminaDelta: 0,
                triggeredComedyStory: false,
                newlyUnlockedTitle: null,
                nextState: {
                    ...state,
                    favor: state.favor + delta,
                    spouseYearTriggerCount: nextTriggers,
                },
            };
        }

        if (option === 'B') {
            const cost = this.getOptionBPrice(year);
            const delta = config.jealousy.optionB.favorDelta;
            return {
                option,
                blockedByYearlyLimit: false,
                goldCost: cost,
                favorDelta: delta,
                staminaDelta: 0,
                triggeredComedyStory: false,
                newlyUnlockedTitle: null,
                nextState: {
                    ...state,
                    gold: Math.max(0, state.gold - cost),
                    favor: state.favor + delta,
                    spouseYearTriggerCount: nextTriggers,
                },
            };
        }

        // Option C: 50% 得 0 並精力 +10；50% 得 -6 並觸發搞笑劇情（抓包 3 次解鎖「府中睡神」）
        const sleepSuccess = rollPercent < config.jealousy.optionC.sleepSuccessRate;
        if (sleepSuccess) {
            return {
                option,
                blockedByYearlyLimit: false,
                goldCost: 0,
                favorDelta: config.jealousy.optionC.sleepFavorDelta,
                staminaDelta: config.jealousy.optionC.sleepStaminaDelta,
                triggeredComedyStory: false,
                newlyUnlockedTitle: null,
                nextState: {
                    ...state,
                    stamina: state.stamina + config.jealousy.optionC.sleepStaminaDelta,
                    spouseYearTriggerCount: nextTriggers,
                },
            };
        }

        const nextCaught = state.caughtCount + 1;
        const threshold = config.jealousy.optionC.caughtThresholdForTitle;
        const title = config.jealousy.optionC.unlockedTitle;
        const shouldUnlock = nextCaught >= threshold && !state.unlockedTitles.includes(title);
        const nextTitles = shouldUnlock ? [...state.unlockedTitles, title] : [...state.unlockedTitles];

        return {
            option,
            blockedByYearlyLimit: false,
            goldCost: 0,
            favorDelta: config.jealousy.optionC.caughtFavorDelta,
            staminaDelta: 0,
            triggeredComedyStory: true,
            newlyUnlockedTitle: shouldUnlock ? title : null,
            nextState: {
                ...state,
                favor: state.favor + config.jealousy.optionC.caughtFavorDelta,
                caughtCount: nextCaught,
                unlockedTitles: nextTitles,
                spouseYearTriggerCount: nextTriggers,
            },
        };
    }

    /**
     * 檢查是否觸發三連霸「天下名門」徽章（首年不會觸發；解鎖後私塾 +5%、俸祿 +10%）。
     */
    public static checkDynastyBadge(year: number, consecutiveFirstPlaceCount: number): DynastyBadgeCheckResult {
        if (year <= 1 && config.dynastyBadge.neverTriggersInYearOne) {
            return {
                year,
                consecutiveFirstPlaceCount,
                unlocked: false,
                badgeTitle: null,
                academyBonusPct: 0,
                salaryBonusPct: 0,
                note: '首年不會觸發三連霸「天下名門」徽章。',
            };
        }

        const unlocked = consecutiveFirstPlaceCount >= config.dynastyBadge.requiredConsecutiveFirstPlace;
        return {
            year,
            consecutiveFirstPlaceCount,
            unlocked,
            badgeTitle: unlocked ? config.dynastyBadge.badgeTitle : null,
            academyBonusPct: unlocked ? config.dynastyBadge.academyBonusPct : 0,
            salaryBonusPct: unlocked ? config.dynastyBadge.salaryBonusPct : 0,
            note: unlocked
                ? `達成連續 ${consecutiveFirstPlaceCount} 年第一名，解鎖「${config.dynastyBadge.badgeTitle}」徽章（私塾 +${config.dynastyBadge.academyBonusPct}%、俸祿 +${config.dynastyBadge.salaryBonusPct}%）！`
                : `目前連霸 ${consecutiveFirstPlaceCount} 年，尚需連續 ${config.dynastyBadge.requiredConsecutiveFirstPlace} 年第一名。`,
        };
    }
}
