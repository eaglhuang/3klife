/** 首戰操作第一版：事件推進提示；不改戰鬥規則、不自行發獎。 */
export type OperationStep = 'deploy' | 'clash' | 'ultimate' | 'victory' | 'retreat' | 'stalemate' | 'completed';
export const OPERATION_GUIDE = {
    deploy: { message: '① 部署：選左側兵種卡，拖到我方底線的中路格（第3路）部署；灰色卡表示糧草或條件不足。卡上「糧15」是糧草費用；底部「攻40／命100」是攻擊／生命，不是蓄力。奧義蓄力請看 SP。', target: 'TigerTallyRoot' },
    clash: { message: '② 推進交鋒：部署後按「結束回合」推進部隊；與敵軍接觸會自動交鋒，觀察戰報及怒氣。', target: 'EndTurnBtn' },
    ultimate: { message: '③ SP 是奧義能量：我軍擊殺敵隊可充能，不是每按回合就增加。蓄滿後點「斬／奧義」選技能與目標；成功施放才消耗全部 SP。', target: 'UltimateBtn' },
    victory: { message: '④ 勝負：擊敗敵將或摧毀敵陣地即可勝利；我將陣亡、我方陣地歸零或達一般回合上限會失敗。沒有奧義也能取勝。', target: 'EndTurnBtn' },
    retreat: { message: '⑤ 撤退：隨時點上方「退」或齒輪，再確認撤退，進入敗戰結算；不是直接關閉遊戲。不想看提示可按「收起」，之後仍可展開。', target: 'BattleHudScreen_div_12' },
    stalemate: { message: '⑤ 提示：戰局若陷入膠著，隨時可點擊上方「退」結束教學進入政廳。', target: 'BattleHudScreen_div_12' },
} as const;
export class FirstBattleOperationGuide {
    step: OperationStep = 'deploy';
    advance(event: 'deployed' | 'sp-ready' | 'ultimate-used' | 'won' | 'turn-ended' | 'turn-stalemate' | 'ended' | 'next' | 'previous'): boolean {
        const before = this.step;
        if (event === 'won' || event === 'ended') this.step = 'completed';
        else if ((event === 'next' || event === 'previous') && this.step !== 'completed') {
            const pages: OperationStep[] = ['deploy','clash','ultimate','victory','retreat'];
            const index = this.step === 'stalemate' ? 4 : pages.indexOf(this.step);
            this.step = pages[(index + (event === 'next' ? 1 : pages.length - 1)) % pages.length];
        }
        else if (event === 'turn-stalemate' && this.step !== 'completed') this.step = 'stalemate';
        else if (this.step === 'deploy' && event === 'deployed') this.step = 'clash';
        else if (this.step === 'clash' && (event === 'sp-ready' || event === 'turn-ended')) this.step = 'ultimate';
        else if (this.step === 'ultimate' && event === 'ultimate-used') this.step = 'victory';
        return before !== this.step;
    }
    get hint(): { message: string; target: string } | null { return this.step === 'completed' ? null : OPERATION_GUIDE[this.step]; }
}
