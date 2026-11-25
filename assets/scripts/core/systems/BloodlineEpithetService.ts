import epithetConfig from '../../../resources/data/master/bloodline-epithets-config.json';

export type BloodlineStatKey = 'str' | 'int' | 'lea' | 'pol' | 'cha';

export interface BloodlineEpithetDef {
    id: string;
    name: string;
    statKey: BloodlineStatKey;
    hiddenBonus: number; // 由資料檔設定（固定 +2），且只算一次
    omen8: string;
    trait12: string;
    reveal15: string;
}

export interface EpithetRevealState {
    age: number;
    stage: 'hidden' | 'omen_8' | 'trait_12' | 'revealed_15';
    displayText: string;
    isBonusActive: boolean;
}

export interface GrowthBreakdown {
    baseTotal: number;
    epithetBonusApplied: number;
    finalTotal: number;
    note: string;
}

const STAT_KEYS: BloodlineStatKey[] = ['str', 'int', 'lea', 'pol', 'cha'];

export const BLOODLINE_EPITHET_POOL_48: BloodlineEpithetDef[] = epithetConfig.epithets.map((name, idx) => {
    const statKey = STAT_KEYS[idx % STAT_KEYS.length];
    const bonus = epithetConfig.hiddenBonusPerEpithet;
    return {
        id: `epithet_${String(idx + 1).padStart(2, '0')}`,
        name,
        statKey,
        hiddenBonus: bonus,
        omen8: `${epithetConfig.revealAges.omen}歲徵兆：舉止隱約有「${name}」之氣韻。`,
        trait12: `${epithetConfig.revealAges.trait}歲顯露：在同儕中展現「${name}」的天賦傾向（${statKey.toUpperCase()}）。`,
        reveal15: `${epithetConfig.revealAges.awakened}歲揭曉：正式覺醒天賦小名「${name}」（${statKey.toUpperCase()} +${bonus}，只算一次）。`,
    };
});

/**
 * 血統天賦小名與成長拆解服務（PROG-2-10029）
 * 數值與 48 池皆從 assets/resources/data/master/bloodline-epithets-config.json 讀取。
 */
export class BloodlineEpithetService {
    public static getPool(): readonly BloodlineEpithetDef[] {
        return BLOODLINE_EPITHET_POOL_48;
    }

    public static drawBirthEpithet(seedIndex?: number): BloodlineEpithetDef {
        const pool = BLOODLINE_EPITHET_POOL_48;
        const idx = typeof seedIndex === 'number'
            ? Math.abs(Math.floor(seedIndex)) % pool.length
            : Math.floor(Math.random() * pool.length);
        return pool[idx];
    }

    public static getRevealStateAtAge(age: number, epithet: BloodlineEpithetDef): EpithetRevealState {
        const ages = epithetConfig.revealAges;
        if (age >= ages.awakened) {
            return {
                age,
                stage: 'revealed_15',
                displayText: epithet.reveal15,
                isBonusActive: true,
            };
        }
        if (age >= ages.trait) {
            return {
                age,
                stage: 'trait_12',
                displayText: epithet.trait12,
                isBonusActive: false,
            };
        }
        if (age >= ages.omen) {
            return {
                age,
                stage: 'omen_8',
                displayText: epithet.omen8,
                isBonusActive: false,
            };
        }
        return {
            age,
            stage: 'hidden',
            displayText: '尚在襁褓，天賦未顯。',
            isBonusActive: false,
        };
    }

    /**
     * 計算成長拆解表，嚴格保證小名隱藏 +2 只算一次。
     */
    public static buildGrowthBreakdown(
        baseStatValue: number,
        epithet: BloodlineEpithetDef,
        alreadyApplied: boolean,
    ): GrowthBreakdown {
        const bonus = alreadyApplied ? 0 : epithet.hiddenBonus;
        return {
            baseTotal: baseStatValue,
            epithetBonusApplied: bonus,
            finalTotal: baseStatValue + bonus,
            note: `小名隱藏 +${epithetConfig.hiddenBonusPerEpithet} 只算一次（不重複疊加）`,
        };
    }
}
