// @spec-source → WBS v3 MERC-07（傭兵介面：倒數、結義進度、名牌、確認視窗）；傭兵系統規格書：試用轉永久 §3、§4、§5
/**
 * MercenaryPoolPresenter — 傭兵列表的顯示資料（倒數、結義進度、按鈕可否），純 TS，不依賴 cc。
 *
 * View 只把這裡的列資料套到 Label、ProgressBar 與按鈕；判斷規則集中在這裡並有 headless 測試。
 * 按鈕可否沿用既有規則：結義看 canBondMercenary，出戰與教官看 canDeploy / canTeach（凍結或離隊不可）。
 * 文字是暫定的繁中字串，正式字串表定案後改用 key。
 */
import { canBondMercenary, MercenaryState, TRIAL_DAYS } from './MercenaryBond';
import { canDeployMercenary, canTeachMercenary, UpkeepState } from './MercenaryUpkeep';
import { MercenarySaveBundle } from './MercenarySaveModel';

export const BOND_MAX = 60;

export interface MercenaryPoolRow {
    uid: string;
    statusText: string;
    daysLeftText: string;
    /** 0~1，給 ProgressBar 用；倒數以已過天數計。 */
    trialProgress: number;
    /** 0~1，好感 / 60。 */
    bondProgress: number;
    canBond: boolean;
    canDeploy: boolean;
    canTeach: boolean;
}

const STATUS_TEXT: Record<MercenaryState['status'], string> = {
    Trial: '試用中',
    Bonded: '已結義',
    Expired: '已離隊',
};

function clamp01(value: number): number {
    if (!Number.isFinite(value)) return 0;
    return Math.min(1, Math.max(0, value));
}

/** 依傭兵 uid 找出薪水狀態；找不到視為沒有薪水紀錄（不可出戰以外的判斷由規則函式決定）。 */
function findUpkeep(bundle: MercenarySaveBundle, uid: string): UpkeepState | undefined {
    return bundle.upkeep.find(u => u.uid === uid);
}

/**
 * 每個傭兵一列。沒有薪水紀錄時，出戰與教官依 Active 預設判斷，這裡視為不可用，避免誤開按鈕。
 */
export function buildMercenaryPoolRows(bundle: MercenarySaveBundle): MercenaryPoolRow[] {
    return bundle.mercenaries.map(merc => {
        const upkeep = findUpkeep(bundle, merc.uid);
        const elapsed = TRIAL_DAYS - merc.daysLeft;
        const trialProgress = clamp01(elapsed / TRIAL_DAYS);
        return {
            uid: merc.uid,
            statusText: STATUS_TEXT[merc.status],
            daysLeftText: merc.status === 'Trial' ? `剩餘 ${merc.daysLeft} 日` : '',
            trialProgress,
            bondProgress: clamp01(merc.bond / BOND_MAX),
            canBond: canBondMercenary(merc),
            canDeploy: upkeep ? canDeployMercenary(upkeep) : false,
            canTeach: upkeep ? canTeachMercenary(upkeep) : false,
        };
    });
}
