// @spec-source → 新手開場規格書.md §18.3（3 段式引導）；PROG-2-2226（大堂開啟後引導目標被遮）
/**
 * OnboardingTargetResolver — 新手 3 段引導的聚焦目標要指向「玩家眼前那一層」的入口（純邏輯，不依賴 cc）
 *
 * 幕府大堂（lobby-hall-screen）是全螢幕主大廳，開啟後城市畫面（city hub）整個被蓋住；
 * 這時引導若仍指向城市畫面的資源列與底列按鈕，框會畫在大堂的圖上、真正的按鈕看不到也點不到。
 * 規則：大堂顯示時改指大堂上的同功能入口；大堂沒開時維持城市畫面的目標。
 * 大堂上找不到對應入口就不畫框，絕不回頭指向被蓋住的城市按鈕。
 *
 * Unity 對照：依目前最上層的 Canvas 決定 tutorial highlight 要綁哪個 RectTransform。
 */
import { ONBOARDING_ACTIONS } from './OnboardingFlowController';
import { findUcufNode, type UcufLookupNode } from './UcufNodeLookup';

export type OnboardingActionId = keyof typeof ONBOARDING_ACTIONS;

/**
 * 大堂上的對應入口。anchor 為 layout 的 _ucufId；
 * pick 'siblings'：取錨點的兄弟節點（大堂頂列的金／玉／糧／兵沒有自己的 id，以同列的「返回」為錨點）。
 */
export interface HallTutorialTargetSpec {
    readonly anchor: string;
    readonly pick: 'self' | 'siblings';
}

export const ONBOARDING_HALL_TARGETS: Readonly<Record<OnboardingActionId, HallTutorialTargetSpec>> = {
    fate: { anchor: 'lobby-hall-screen.back', pick: 'siblings' },
    growth: { anchor: 'lobby-hall-screen.dock-sortie', pick: 'self' },
    legacy: { anchor: 'lobby-hall-screen.dock-generals', pick: 'self' },
};

export interface TutorialTargetNode extends UcufLookupNode {
    readonly parent: TutorialTargetNode | null;
    readonly activeInHierarchy: boolean;
}

export interface TutorialTargetSurfaces<T extends TutorialTargetNode> {
    /** 幕府大堂根節點；大堂沒開（或沒掛）時給 null */
    readonly hallRoot: T | null;
    /** 依 ONBOARDING_ACTIONS 的 target 名稱找城市畫面節點 */
    readonly cityTarget: (name: string) => T | null;
}

/** 依引導步驟序號（0 起算）取段落 id；超出範圍回傳 null */
export function onboardingActionIdAt(step: number): OnboardingActionId | null {
    return (Object.keys(ONBOARDING_ACTIONS) as OnboardingActionId[])[step] ?? null;
}

/** 回傳要框起來的節點（可能多個，聚焦框取合併邊界）；空陣列代表不畫框。 */
export function resolveTutorialTargets<T extends TutorialTargetNode>(actionId: OnboardingActionId, surfaces: TutorialTargetSurfaces<T>): T[] {
    const hall = surfaces.hallRoot;
    if (hall?.activeInHierarchy) {
        const spec = ONBOARDING_HALL_TARGETS[actionId];
        const anchor = findUcufNode(hall, spec.anchor);
        if (!anchor) return [];
        const picked = spec.pick === 'self'
            ? [anchor]
            : ((anchor.parent?.children ?? []) as readonly T[]).filter(node => node !== anchor);
        return picked.filter(node => node.activeInHierarchy);
    }
    const city = surfaces.cityTarget(ONBOARDING_ACTIONS[actionId].target);
    return city ? [city] : [];
}
