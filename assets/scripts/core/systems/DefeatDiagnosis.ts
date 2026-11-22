// @spec-source → PROG-2-9712（第一年連敗：戰敗結算加軍師敗因診斷與「下一步建議」）
/**
 * DefeatDiagnosis — 戰敗後的軍師敗因診斷（純邏輯，不依賴 cc）
 *
 * 依整場統計挑出最主要的 1～2 條敗因，用口語講給玩家聽，並附一個「下一步建議」：
 *   - replay：打法問題（主將沒出陣、兵派太少、奧義沒放……），照建議再戰一次；
 *   - prepare：實力差距（敵軍明顯較強），先回大廳整備。
 * 敗因順序依 PROG-2-9712 模擬結論：主將出陣（全軍攻擊加倍）影響最大，其次是部署額度、奧義。
 *
 * Unity 對照：戰後 Analytics 規則表，輸入一場的統計，輸出排序後的提示清單。
 */

export interface DefeatStats {
    /** 我方經過的回合數 */
    playerTurns: number;
    /** 我方部署的部隊數（不含主將） */
    playerDeploys: number;
    /** 每回合可部署幾隊 */
    deployLimitPerTurn: number;
    /** 主將有沒有出陣過 */
    generalSortied: boolean;
    /** 結束原因（BattleVictoryResolver 的 BattleEndCause）：general＝主將倒下、time-up＝時限到 */
    cause?: string;
    /** 放過幾次奧義 */
    ultimatesUsed: number;
    /** 奧義怒氣滿了卻沒放的回合數 */
    spFullIdleTurns: number;
    /** 敵方部署的部隊數 */
    enemyDeploys: number;
    /** 雙方主將三圍總和（武力＋智力＋統率） */
    playerGeneralStats: number;
    enemyGeneralStats: number;
}

export type DefeatAdvice = 'replay' | 'prepare';

export interface DefeatReason {
    id: 'no-sortie' | 'general-fell' | 'under-deploy' | 'idle-ultimate' | 'outmatched' | 'time-up' | 'close-fight';
    /** 越大越主要 */
    score: number;
    /** 口語敗因 */
    text: string;
    advice: DefeatAdvice;
    /** 照建議再戰時，開場給玩家的提醒 */
    tip: string;
}

/** 部署額度用不到這個比例就算「兵派太少」 */
const UNDER_DEPLOY_RATE = 0.6;
/** 奧義滿了閒置幾回合以上才算敗因 */
const IDLE_ULTIMATE_TURNS = 2;
/** 敵方兵力或主將三圍是我方幾倍以上算「實力差距」 */
const OUTMATCHED_RATIO = 1.3;

/** 列出所有成立的敗因，依主要程度排序 */
export function listDefeatReasons(s: DefeatStats): DefeatReason[] {
    const reasons: DefeatReason[] = [];
    if (!s.generalSortied) {
        reasons.push({
            id: 'no-sortie', score: 90, advice: 'replay',
            text: '主將一直待在後方沒出陣——主將上場全軍攻擊加倍，少了這招很吃虧。',
            tip: '軍師提醒：記得讓主將出陣，全軍攻擊會加倍！',
        });
    } else if (s.cause === 'general') {
        reasons.push({
            id: 'general-fell', score: 85, advice: 'replay',
            text: '主將衝太前面被打倒，全軍跟著潰散。血量剩一半以下就先退到後面。',
            tip: '軍師提醒：主將血量剩一半以下就別硬衝，先讓部隊頂著。',
        });
    }
    const turns = Math.max(1, s.playerTurns);
    const capacity = turns * Math.max(1, s.deployLimitPerTurn);
    const deployRate = s.playerDeploys / capacity;
    if (deployRate < UNDER_DEPLOY_RATE) {
        const avg = (s.playerDeploys / turns).toFixed(1).replace(/\.0$/, '');
        reasons.push({
            id: 'under-deploy', score: Math.round(50 + 40 * (1 - deployRate)), advice: 'replay',
            text: `兵派太少：每回合能派 ${s.deployLimitPerTurn} 隊，平均只派了 ${avg} 隊，路上被敵軍以多打少。`,
            tip: `軍師提醒：每回合能派 ${s.deployLimitPerTurn} 隊，盡量派滿，別讓空路被打穿。`,
        });
    }
    if (s.spFullIdleTurns >= IDLE_ULTIMATE_TURNS) {
        reasons.push({
            id: 'idle-ultimate', score: 55 + Math.min(15, s.spFullIdleTurns * 3), advice: 'replay',
            text: `奧義怒氣滿了 ${s.spFullIdleTurns} 回合都沒放，等於白白浪費一張王牌。`,
            tip: '軍師提醒：怒氣滿了就放奧義，留著不會變多。',
        });
    }
    const troopRatio = s.enemyDeploys / Math.max(1, s.playerDeploys);
    const statRatio = s.enemyGeneralStats / Math.max(1, s.playerGeneralStats);
    if (statRatio >= OUTMATCHED_RATIO || (troopRatio >= OUTMATCHED_RATIO && deployRate >= UNDER_DEPLOY_RATE)) {
        const ratio = Math.max(statRatio, troopRatio);
        reasons.push({
            id: 'outmatched', score: Math.round(50 + Math.min(40, (ratio - 1) * 50)), advice: 'prepare',
            text: statRatio >= OUTMATCHED_RATIO
                ? `敵將實力約是我方主將的 ${statRatio.toFixed(1)} 倍，硬拚吃虧，先回去培養武將再來。`
                : `敵軍兵力約是我方的 ${troopRatio.toFixed(1)} 倍，先回去補兵、整備編成再來。`,
            tip: '',
        });
    }
    if (s.cause === 'time-up') {
        reasons.push({
            id: 'time-up', score: 55, advice: 'replay',
            text: '打得太保守，時限到了還沒攻破敵陣。兵派滿、主將上場才能在時限內打穿。',
            tip: '軍師提醒：這關有回合時限，要主動進攻。',
        });
    }
    if (reasons.length === 0) {
        reasons.push({
            id: 'close-fight', score: 10, advice: 'replay',
            text: '雙方差距不大，換一條主攻路線、集中兵力再試一次。',
            tip: '軍師提醒：試著換一條主攻路線。',
        });
    }
    return reasons.sort((a, b) => b.score - a.score);
}

/** 結算畫面要顯示的敗因：最多 2 條 */
export function diagnoseDefeat(s: DefeatStats): DefeatReason[] {
    return listDefeatReasons(s).slice(0, 2);
}

/** 敗因寫進結算明細的行（「軍師診斷：……」歸到戰況區） */
export function defeatDiagnosisLines(reasons: readonly DefeatReason[]): string[] {
    return reasons.map((reason) => `軍師診斷：${reason.text}`);
}

/** 「下一步建議」按鈕文字 */
export function defeatAdviceLabel(advice: DefeatAdvice): string {
    return advice === 'prepare' ? '回去整備' : '照建議再戰';
}

/** 照建議再戰時，下一場開場要顯示的提醒（重打流程取用一次即清空） */
let pendingBattleTip: string | null = null;

export function queueBattleTip(tip: string): void {
    pendingBattleTip = tip.trim().length > 0 ? tip : null;
}

export function consumeBattleTip(): string | null {
    const tip = pendingBattleTip;
    pendingBattleTip = null;
    return tip;
}
