/** 首戰操作第一版：事件推進提示；不改戰鬥規則、不自行發獎。 */
export type OperationStep = 'deploy' | 'clash' | 'ultimate' | 'victory' | 'completed';
export const OPERATION_GUIDE = {
    deploy: { message: '① 部署：選左側兵種卡，拖到我方底線的中路格（第3路）部署；灰色卡表示糧草或條件不足。', target: 'TigerTallyRoot' },
    clash: { message: '② 推進交鋒：部署後按「結束回合」推進部隊；與敵軍接觸會自動交鋒，觀察戰報及怒氣。', target: 'EndTurnBtn' },
    ultimate: { message: '③ 奧義：怒氣已滿，點「斬」開啟技能選單，再依提示選擇技能與目標；未蓄滿時會顯示原因。', target: 'BattleHudScreen_div_136' },
    victory: { message: '④ 收尾：奧義已施放，繼續部署與結束回合，擊敗敵將後完成結算。', target: 'EndTurnBtn' },
} as const;
export class FirstBattleOperationGuide {
    step: OperationStep = 'deploy';
    advance(event: 'deployed' | 'sp-ready' | 'ultimate-used' | 'won'): boolean {
        const before = this.step;
        if (event === 'won') this.step = 'completed';
        else if (this.step === 'deploy' && event === 'deployed') this.step = 'clash';
        else if (this.step === 'clash' && event === 'sp-ready') this.step = 'ultimate';
        else if (this.step === 'ultimate' && event === 'ultimate-used') this.step = 'victory';
        return before !== this.step;
    }
    get hint(): { message: string; target: string } | null { return this.step === 'completed' ? null : OPERATION_GUIDE[this.step]; }
}
