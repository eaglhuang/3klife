// @spec-source → 新手開場規格書.md §18.3（3 段式引導）；MVP遊戲驗證規格書.md §E #11；PROG-2-0229（WBS MVP-11 接線）
/**
 * OnboardingFlowController — 新手 3 段式引導的顯示與觸發（純邏輯，不依賴 cc）
 *
 * 職責：
 *   - 首次進大廳且引導未完成時顯示；目前段落的文字與進度（1 / 3）
 *   - 按「下一步」→ GameSession.acknowledgeOnboarding() 存檔 → 下一段；第三段後關閉
 *
 * 不負責開場流程本身（先做什麼、何時開獎）：那是 OPEN-01 開場流程控制器的範圍。
 *
 * Unity 對照：Presenter。畫面只讀 getFlowView()，按鈕只呼叫 Next()。
 */
import { currentOnboardingSegment, isOnboardingComplete, ONBOARDING_SEGMENTS, OnboardingResult, OnboardingState } from '../../core/systems/OnboardingTutorial';
import type { FlowViewState } from './NurtureFlowViewApplier';

export interface OnboardingDeps {
    /** 開場先完成宿命選將；未提供時維持既有存檔的顯示行為。 */
    ready?: () => boolean;
    /** 目前引導進度（存檔內容） */
    state: () => OnboardingState;
    /** 正式環境接 GameSession.acknowledgeOnboarding */
    acknowledge: (segmentId: 'fate' | 'growth' | 'legacy') => Promise<OnboardingResult>;
}

export const ONBOARDING_ACTIONS = {
    fate: { target: 'ResourceBar', label: '資源列', text: '右上資源列：金是銅錢，用於日常養成；玉是玉璧，用於召喚與購物；糧供出征部署；兵是城池可用兵力。數量以畫面即時顯示為準。' },
    growth: { target: 'btnCatSortie', label: '出征', text: '下方「出征」開啟出征選單；先看戰前偵查與推薦對策，再選戰鬥。首次請選需要棋盤操作的戰鬥，學習部署、推進與奧義。' },
    legacy: { target: 'btnCatGenerals', label: '武將', text: '下方「武將」查看名冊；選主將後可看「技」的戰法與「命」的血統。完成本頁後，從「出征」開始第一戰。' },
} as const;

export class OnboardingFlowController {
    constructor(private readonly _deps: OnboardingDeps) {}

    /** 首次進入且尚未看完才顯示 */
    public shouldShow(): boolean {
        return (this._deps.ready?.() ?? true) && !isOnboardingComplete(this._deps.state());
    }

    /** 按下一步：確認目前段落。已完成或結果失敗時不動作，回傳 null。 */
    public async next(): Promise<OnboardingResult | null> {
        if (!this.shouldShow()) return null;
        const segment = currentOnboardingSegment(this._deps.state());
        if (!segment) return null;
        const result = await this._deps.acknowledge(segment.id);
        return result.ok ? result : null;
    }

    /** 扁平 view：key 與 onboarding-tutorial-main.json 的節點 id 一一對應 */
    public getFlowView(): FlowViewState {
        const state = this._deps.state();
        const segment = currentOnboardingSegment(state);
        const total = ONBOARDING_SEGMENTS.length;
        const shown = Math.min(state.nextIndex + 1, total);
        return {
            texts: {
                tutorialText: segment ? segment.text : '',
                tutorialAction: segment ? ONBOARDING_ACTIONS[segment.id].text : '',
                tutorialPointer: segment ? `▲ ${ONBOARDING_ACTIONS[segment.id].label}` : '',
                tutorialStep: segment ? `${shown} / ${total}` : '',
                btnNextTutorialLabel: shown >= total ? '開始遊戲' : '下一步',
            },
            actives: {
                tutorialCard: segment !== null,
            },
            enabled: {
                btnNextTutorial: segment !== null,
            },
        };
    }
}
