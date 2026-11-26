/**
 * 史境天下風雲榜 AI 武將受祝賀互動控制器（PROG-2-9601 PR3）
 * 職責：
 * 1. 處理玩家對上榜 AI 武將點擊「祝賀」
 * 2. 頻率限制校驗（每屆年終盛典每位武將限 1 次，使用者 11/22 裁決）
 * 3. 呼叫 FriendshipService 增加友誼值（+5，上限 100）
 * 4. 派發武將心智事件 MindEvent(PRAISED)
 * 5. 依性格分類分流回傳專屬性格感謝回話
 */

import { FriendshipService } from '../../services/FriendshipService';
import type { BoardRankResult } from './AnnualRankingTypes';
import { selfOf, type VoiceProfile } from '../../mind/SpeakerVoice';

export interface CongratulationDialogues {
    categories: Record<string, {
        desc: string;
        templates: string[];
    }>;
}

export interface CongratulateResult {
    success: boolean;
    generalId: string;
    reason?: 'ALREADY_CONGRATULATED' | 'NOT_ELIGIBLE' | 'INVALID_GENERAL';
    newFriendship?: number;
    friendshipDelta?: number;
    barkText?: string;
    characterCategory?: string;
}

export class AnnualRankingCongratulation {
    private _congratulatedByYear: Map<number, Set<string>> = new Map();
    private _dialogueData: CongratulationDialogues | null = null;
    private _praiseDelta: number = 5;

    constructor(dialogueData?: CongratulationDialogues, praiseDelta: number = 5) {
        if (dialogueData) {
            this._dialogueData = dialogueData;
        }
        this._praiseDelta = praiseDelta;
    }

    /**
     * 載入已祝賀名單快照
     */
    public loadSnapshot(data?: Record<number, string[]>): void {
        this._congratulatedByYear.clear();
        if (!data || typeof data !== 'object') return;

        for (const [yearStr, list] of Object.entries(data)) {
            const year = parseInt(yearStr, 10);
            if (Number.isFinite(year) && Array.isArray(list)) {
                this._congratulatedByYear.set(year, new Set(list));
            }
        }
    }

    /**
     * 導出已祝賀名單快照
     */
    public exportSnapshot(): Record<number, string[]> {
        const out: Record<number, string[]> = {};
        for (const [year, set] of this._congratulatedByYear.entries()) {
            out[year] = Array.from(set);
        }
        return out;
    }

    /**
     * 檢查特定年度某武將是否已受祝賀
     */
    public hasCongratulated(year: number, generalId: string): boolean {
        const set = this._congratulatedByYear.get(year);
        return set ? set.has(generalId) : false;
    }

    /**
     * 執行祝賀操作
     * @param year 典禮所屬年份
     * @param generalId 武將 ID
     * @param characterCategory 武將性格分類 ('fierce' | 'scholar' | 'commander' | 'cunning')
     * @param eligibleGeneralIds 當年度獲獎/前十名武將候選名單（若提供則執行資格檢驗）
     * @param voice 說話者性別／性格／年齡；回話模板的 {self} 依此代入自稱（缺值視為男成年）
     */
    public congratulate(
        year: number,
        generalId: string,
        characterCategory: string = 'default',
        eligibleGeneralIds?: readonly string[],
        voice: Readonly<VoiceProfile> = {}
    ): CongratulateResult {
        if (!generalId) {
            return { success: false, generalId: '', reason: 'INVALID_GENERAL' };
        }

        // 資格檢驗：若指定了獲獎名單，必須在名單內
        if (eligibleGeneralIds && !eligibleGeneralIds.includes(generalId)) {
            return { success: false, generalId, reason: 'NOT_ELIGIBLE' };
        }

        // 頻率限制檢驗：每屆限 1 次
        if (this.hasCongratulated(year, generalId)) {
            return { success: false, generalId, reason: 'ALREADY_CONGRATULATED' };
        }

        // 增加友誼度
        const friendshipSvc = FriendshipService.getInstance();
        const oldVal = friendshipSvc.get(generalId);
        const newVal = friendshipSvc.add(generalId, this._praiseDelta, `annual_congratulation_year_${year}`);
        const delta = newVal - oldVal;

        // 標記為已祝賀
        let yearSet = this._congratulatedByYear.get(year);
        if (!yearSet) {
            yearSet = new Set();
            this._congratulatedByYear.set(year, yearSet);
        }
        yearSet.add(generalId);

        // 隨機選取性格回話台詞
        const barkText = this._pickBark(characterCategory, generalId, year).split('{self}').join(selfOf(voice));

        return {
            success: true,
            generalId,
            newFriendship: newVal,
            friendshipDelta: delta,
            barkText,
            characterCategory
        };
    }

    /**
     * 從設定中挑選該性格的回話
     */
    private _pickBark(category: string, generalId: string, year: number): string {
        if (!this._dialogueData || !this._dialogueData.categories) {
            return '多謝閣下賀喜！';
        }

        const cat = this._dialogueData.categories[category] || this._dialogueData.categories['default'];
        if (!cat || !cat.templates || cat.templates.length === 0) {
            return '多謝閣下賀喜！';
        }

        // 採用武將 ID 與年份產生確定性索引，避免無意義晃動
        let hash = year;
        for (let i = 0; i < generalId.length; i++) {
            hash = (hash * 31 + generalId.charCodeAt(i)) >>> 0;
        }
        const index = hash % cat.templates.length;
        return cat.templates[index];
    }
}
