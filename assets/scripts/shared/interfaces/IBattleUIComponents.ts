import { Color, Node } from 'cc';

/**
 * 戰場相關 UI 元件的抽象介面集合，用於解除 Battle 模組對 UI 具體實作的依賴。
 */

export interface IBattleHUDLike {
    node: Node;
    setFood(current: number, max: number): void;
    setPlayerGeneralId(generalId: string): void;
    setEnemyGeneralId(generalId: string): void;
    setPlayerName(name: string): void;
    /** 玩家在場 Set 的提示文字（PROG-2-0580）；舊 HUD 不實作 */
    setPlayerTallySetLabels?(labels: string[]): void;
    setEnemyName(name: string): void;
    refresh(turn: number, food: number, maxFood: number, playerHp: number, playerMaxHp: number, enemyHp: number, enemyMaxHp: number): void;
    waitUntilReady(timeoutMs?: number): Promise<boolean>;
    playerSpBarNode: Node | null;
    enemySpBarNode: Node | null;
    showPersistentStatus(msg: string): void;
    clearPersistentStatus(): void;
    clearSceneGambitBadge(): void;
    showSceneGambitBadge(text: string): void;
}

export interface IBattleLogLike {
    node: Node;
    clear(): void;
    append(text: string): void;
    waitUntilReady(timeoutMs?: number): Promise<boolean>;
}

export interface IDuelChallengeLike {
    node: Node;
    show(challengerName: string, defenderName: string, defenderWinRate: number): void;
    waitUntilReady(timeoutMs?: number): Promise<boolean>;
}

export interface IResultPopupLike {
    node: Node;
    /** details：戰後結算摘要（出征軍勢 / 戰損 / 本場戰績），接在描述下方 */
    showResult(result: string, details?: string): Promise<void>;
    show(result: any): Promise<void>;
    hide(): void;
}

export interface IDeployController {
    tryDeployTroop(
        type: string,
        lane: number,
        unitName?: string,
        options?: { tally?: { cardUid: string; templateId: string } },
    ): { ok: boolean; reason?: string; suggestion?: string | null };
    /** 目前流程是否允許玩家施放技能（戰鬥流程鎖定時為 false） */
    canUsePlayerSkills(): boolean;
    /** 施放主將技能；成功回傳 true */
    triggerGeneralSkill(): boolean;
    /** 委任開關（PROG-2-0913）：開啟後玩家部署階段由委任 AI 自動部署 */
    setDelegateEnabled(on: boolean): void;
    isDelegateEnabled(): boolean;
}

/**
 * 部署面板對外曝露的 API（由 BattleScene 呼叫）
 */
export interface IDeployRuntimeLike {
    readonly node: any;
    setController(ctrl: IDeployController): void;
    updateDp(dp: number): void;
    selectLane(lane: number): void;
    deploySelected(): void;
    showToast(message: string, duration?: number, options?: { color?: Color }): void;
    setTroopSlotButtonsVisible(visible: boolean): void;
    registerDragDropCallback(callback: (x: number, y: number) => void): void;
    updateSkillStatus(available: boolean): void;
}

export interface IBattleScenePanelLike {
    node: Node;
    wirePanels(panels: { battleHUD?: any, battleLogPanel?: any }): void;
    setCards(cards: any[]): void;
    setUltimateSkills(skills: any[]): void;
    /** reason：戰法不能施放時的短原因（PROG-2-0408），有值時取代計點行 */
    setTacticSummary(summary: string, points?: { current?: number; max?: number; enabled: boolean }, reason?: string | null): void;
    appendLog(text: string): void;
    actionCommandComposite?: any;
    actionCommandPanel?: any;
}
