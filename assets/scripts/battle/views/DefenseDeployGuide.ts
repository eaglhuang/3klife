// @spec-source → 關卡設計系統 shard-a §C-3（年終守城）；PROG-2-10019 守城部署階段橫幅（只動提示 UI，不動規則）
import { EVENT_NAMES, Faction } from '../../core/config/Constants';
import { defenseBannerKey, type DefenseGuideLookup } from '../../core/systems/DefenseGuide';

/** 守城部署階段橫幅：沿用首戰操作提示面板，未部署顯示部署說明、部署後改顯示開戰說明，開戰後收起 */
export class DefenseDeployGuide {
    private readonly _unsubscribes: Array<() => void> = [];
    private _deployed = 0;

    constructor(events: { on(name: string, handler: (data: any) => void): () => void },
        private readonly _lookup: DefenseGuideLookup,
        private readonly _showGuide: (hint: { message: string; target: string } | null) => void,
        initialTroops: number) {
        this._deployed = initialTroops;
        this._unsubscribes.push(
            events.on(EVENT_NAMES.UnitDeployed, d => { if (d.faction === Faction.Player) { this._deployed += 1; this._show(); } }),
            events.on(EVENT_NAMES.TurnPhaseChanged, d => { if (d.turn > 1) this._showGuide(null); }),
            events.on(EVENT_NAMES.BattleEnded, () => this._showGuide(null)),
        );
        this._show();
    }

    private _show(): void {
        this._showGuide({ message: this._lookup(defenseBannerKey(this._deployed)), target: 'TigerTallyRoot' });
    }

    dispose(): void {
        for (const unsubscribe of this._unsubscribes.splice(0)) unsubscribe();
        this._showGuide(null);
    }
}
