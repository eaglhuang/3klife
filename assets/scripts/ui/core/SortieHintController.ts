// @spec-source → 新手體驗稽核 artifacts/newbie-audit-1126.md K1；PROG-2-10067
/**
 * SortieHintController — 教學結束後「去出征」提示的開關邏輯（純邏輯，不依賴 cc）
 *
 * 只管「新手教學結束 → 第一戰」這一段：教學完成後大廳出征鈕脈動、史小境說一句話；
 * 玩家點出征或進入戰鬥後關閉並存檔標記。之後的「下一步」提示由首年目標清單接手，這裡不再出聲。
 *
 * Unity 對照：Presenter。View（SortieHintPulseView）只收 setPulse(bool)；存檔走 GameSession。
 */
import { isSortieHintActive, type OnboardingState } from '../../core/systems/OnboardingTutorial';

export interface SortieHintDeps {
    /** 目前引導進度（存檔內容） */
    onboarding: () => OnboardingState;
    /** 已通關關卡數；有戰績的玩家不再提示 */
    clearedStageCount: () => number;
    /** 大廳是否顯示中且沒有開場面板蓋著；不可見時不脈動也不說話 */
    hallVisible: () => boolean;
    /** 開關脈動（重用同一個節點，不新建） */
    setPulse: (on: boolean) => void;
    /** 史小境一句話；每個階段只會呼叫一次 */
    say: () => void;
    /** 存檔標記完成（GameSession.completeSortieHint） */
    markDone: () => Promise<void>;
}

export class SortieHintController {
    private _said = false;

    constructor(private readonly _deps: SortieHintDeps) {}

    /** 目前是否該提示 */
    public isActive(): boolean {
        return isSortieHintActive(this._deps.onboarding(), this._deps.clearedStageCount());
    }

    /** 狀態可能改變時呼叫（教學結束、開大廳、讀檔）：同步脈動，並在首次可見時說一句話。 */
    public refresh(): void {
        const on = this.isActive() && this._deps.hallVisible();
        this._deps.setPulse(on);
        if (on && !this._said) {
            this._said = true;
            this._deps.say();
        }
    }

    /** 玩家點了出征或進了戰鬥：立刻關脈動並標記完成。沒有待辦提示時不動作。 */
    public async complete(): Promise<void> {
        if (!this.isActive()) return;
        this._deps.setPulse(false);
        await this._deps.markDone();
    }
}
