/** 虎符為可移交的獨立卡片；來源異動不改寫原始產出季節。 */
export type TigerTallyQuality = 'R' | 'SR' | 'SSR' | 'UR';

export interface TigerTallyCard {
    uid: string;
    templateId: string;
    sourceGeneralUid: string;
    quality: TigerTallyQuality;
    score: number;
    source: 'death' | 'surrender' | 'reward';
    producedSeason: number;
    troopType?: string;
}
