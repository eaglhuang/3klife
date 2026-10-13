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
    /** 目前引導進度（存檔內容） */
    state: () => OnboardingState;
    /** 正式環境接 GameSession.acknowledgeOnboarding */
    acknowledge: (segmentId: 'fate' | 'growth' | 'legacy') => Promise<OnboardingResult>;
}

export class OnboardingFlowController {
    constructor(private readonly _deps: OnboardingDeps) {}

    /** 首次進入且尚未看完才顯示 */
    public shouldShow(): boolean {
        return !isOnboardingComplete(this._deps.state());
    }

    /** 按下一步：確認目前段落。已完成或結果失敗時不動作，回傳 null。 */
    public async next(): Promise<OnboardingResult | null> {
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
