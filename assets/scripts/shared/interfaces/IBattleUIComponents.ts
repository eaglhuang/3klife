import { Node } from 'cc';

/**
 * 戰場相關 UI 元件的抽象介面集合，用於解除 Battle 模組對 UI 具體實作的依賴。
 */

export interface IBattleHUDLike {
    node: Node;
    setFood(current: number, max: number): void;
    setPlayerGeneralId(generalId: string): void;
    setEnemyGeneralId(generalId: string): void;
    setPlayerName(name: string): void;
    setEnemyName(name: string): void;
    refresh(turn: number, food: number, maxFood: number, playerHp: number, playerMaxHp: number, enemyHp: number, enemyMaxHp: number): void;
    waitUntilReady(timeoutMs?: number): Promise<boolean>;
    playerSpBarNode: Node | null;
    enemySpBarNode: Node | null;
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
    showResult(result: string): Promise<void>;
    show(result: any): Promise<void>;
    hide(): void;
}

export interface IDeployController {
    tryDeployTroop(type: string, lane: number, unitName?: string): { ok: boolean; reason?: string };
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
    showToast(message: string): void;
    setTroopSlotButtonsVisible(visible: boolean): void;
    registerDragDropCallback(callback: (x: number, y: number) => void): void;
    updateSkillStatus(available: boolean): void;
}

export interface IBattleScenePanelLike {
    node: Node;
    wirePanels(panels: { battleHUD?: any, battleLogPanel?: any }): void;
    setCards(cards: any[]): void;
    setUltimateSkills(skills: any[]): void;
    setTacticSummary(summary: string): void;
    appendLog(text: string): void;
    actionCommandComposite?: any;
    actionCommandPanel?: any;
}
