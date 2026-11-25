export type BloodlineStatKey = 'str' | 'int' | 'lea' | 'pol' | 'cha';

export interface BloodlineEpithetDef {
    id: string;
    name: string;
    statKey: BloodlineStatKey;
    hiddenBonus: number; // 固定 +2，且只算一次
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

const EPITHET_NAMES_48: string[] = [
    '小霸王', '玉麒麟', '小諸葛', '白馬兒', '錦帆兒', '虎痴兒', '鳳雛兒', '臥龍兒',
    '鐵壁郎', '神算子', '飛將兒', '美周郎', '常勝兒', '忠義郎', '驍勇兒', '奇謀兒',
    '鎮岳郎', '清流兒', '仁德郎', '梟雄兒', '鬼才兒', '毒士兒', '儒將兒', '國士兒',
    '先登兒', '陷陣兒', '無雙兒', '神射兒', '破軍兒', '七星兒', '天機兒', '經世郎',
    '濟民郎', '安邦兒', '定國兒', '扶漢兒', '江東郎', '西涼兒', '荊襄兒', '巴蜀兒',
    '河北郎', '關中兒', '中原郎', '南蠻兒', '青龍兒', '白虎兒', '朱雀兒', '玄武兒',
];

export const BLOODLINE_EPITHET_POOL_48: BloodlineEpithetDef[] = EPITHET_NAMES_48.map((name, idx) => {
    const statKey = STAT_KEYS[idx % STAT_KEYS.length];
    return {
        id: `epithet_${String(idx + 1).padStart(2, '0')}`,
        name,
        statKey,
        hiddenBonus: 2,
        omen8: `8歲徵兆：舉止隱約有「${name}」之氣韻。`,
        trait12: `12歲顯露：在同儕中展現「${name}」的天賦傾向（${statKey.toUpperCase()}）。`,
        reveal15: `15歲揭曉：正式覺醒天賦小名「${name}」（${statKey.toUpperCase()} +2，只算一次）。`,
    };
});

/**
 * 血統天賦小名與成長拆解服務（PROG-2-10029）
 * - 天賦小名 48 池
 * - 出生抽取
 * - 8 / 12 / 15 歲階段揭曉
 * - 成長拆解表（註明小名隱藏 +2 只算一次）
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
        if (age >= 15) {
            return {
                age,
                stage: 'revealed_15',
                displayText: epithet.reveal15,
                isBonusActive: true,
            };
        }
        if (age >= 12) {
            return {
                age,
                stage: 'trait_12',
                displayText: epithet.trait12,
                isBonusActive: false,
            };
        }
        if (age >= 8) {
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
            note: '小名隱藏 +2 只算一次（不重複疊加）',
        };
    }
}
