// @spec-source → 出征極速決戰推演演算法與武將個性單挑演出規格書.md (doc_spec_1170) §一、§三-1；PROG-2-2205（LOOP-02 補完）
/**
 * QuickSortieController — 出征雙軌選擇：「親自指揮」進戰場，「極速決戰」不載入棋盤直接推演並結算。
 *
 * 推演沿用 PROG-2-2202 的 quickResolveOutcome（兵種互克、主將個性特寫、三幕戰報）與新手首戰保證勝；
 * 戰場外沒有部隊與城寨，雙方只比主將五維（暫定，可逆）。
 * 戰後結算交給宿主（寫 AUTO_RESOLVE 快照、recordBattle），本控制器只管彈窗流程與畫面文字。
 *
 * Unity 對照：純 C# Presenter，宿主（LobbyScene）注入切場景與結算；不依賴 cc。
 */
import { applyOpeningWinGuarantee, quickResolveOutcome, type AutoResolveGeneral, type AutoResolveSide, type QuickResolveOutcome } from '../../battle/runtime/BattleAutoResolve';
import type { MentorHoldingsButtonBinding, MentorHoldingsHostLike } from './MentorHoldingsController';

export interface QuickSortieGeneral {
    readonly name?: string;
    readonly str?: number;
    readonly int?: number;
    readonly lea?: number;
    readonly cha?: number;
    readonly hp?: number;
}

/** 戰場外的推演雙方：只有主將（滿血），沒有部隊與城寨 */
export function quickSortieSide(general: QuickSortieGeneral | null | undefined): AutoResolveSide {
    if (!general) return { general: null, troops: [], fortressHp: 0 };
    const hp = typeof general.hp === 'number' && general.hp > 0 ? general.hp : 1;
    const g: AutoResolveGeneral = {
        name: general.name,
        str: general.str ?? 0,
        int: general.int ?? 0,
        lea: general.lea ?? 0,
        ...(typeof general.cha === 'number' ? { cha: general.cha } : {}),
        currentHp: hp,
        maxHp: hp,
    };
    return { general: g, troops: [], fortressHp: 0 };
}

export interface QuickSortieResolution extends QuickResolveOutcome {
    /** 新手首戰保證勝改判時為 true */
    readonly rescued: boolean;
}

/** 極速決戰推演：三幕戰報 + 首戰保證勝（改判時多一行援軍） */
export function resolveQuickSortie(
    player: QuickSortieGeneral | null | undefined,
    enemy: QuickSortieGeneral | null | undefined,
    firstBattleCleared: boolean,
    random: () => number,
): QuickSortieResolution {
    const quick = quickResolveOutcome(quickSortieSide(player), quickSortieSide(enemy), random);
    const outcome = applyOpeningWinGuarantee(quick, firstBattleCleared);
    const rescued = outcome.result !== quick.result;
    return {
        ...quick,
        result: outcome.result,
        playerPower: outcome.playerPower,
        enemyPower: outcome.enemyPower,
        reportLines: rescued ? [...quick.reportLines, '終局定勢：援軍及時趕到，我軍反敗為勝！'] : quick.reportLines,
        rescued,
    };
}

export const QUICK_SORTIE_RESULT_TITLE: Readonly<Record<QuickSortieResolution['result'], string>> = Object.freeze({
    'player-win': '【極速決戰】我軍大捷',
    'enemy-win': '【極速決戰】我軍敗退',
    draw: '【極速決戰】兩軍相持',
});

export interface QuickSortieView {
    texts: Record<string, string>;
    actives: Record<string, boolean>;
    enabled: Record<string, boolean>;
}

const CHOOSE_BUTTONS = ['btnCommandBattle', 'btnQuickBattle', 'btnSortieCancel'] as const;
const REPORT_BUTTONS = ['btnQuickReportClose'] as const;

function buttonStates(mode: 'choose' | 'report'): Pick<QuickSortieView, 'actives' | 'enabled'> {
    const actives: Record<string, boolean> = {};
    for (const id of CHOOSE_BUTTONS) actives[id] = mode === 'choose';
    for (const id of REPORT_BUTTONS) actives[id] = mode === 'report';
    return { actives, enabled: { ...actives } };
}

export function quickSortieChooseView(stageName: string, enemyName: string): QuickSortieView {
    return {
        texts: {
            quickSortieTitle: '選擇戰鬥模式',
            quickSortieBody: `${stageName}　敵將：${enemyName}\n親自指揮：進入五路棋盤戰場。\n極速決戰：不載入棋盤，依雙方主將五維與個性直接推演勝負。`,
            quickSortieDetail: '',
            commandBattleLabel: '親自指揮',
            quickBattleLabel: '極速決戰',
            sortieCancelLabel: '取消',
            quickReportCloseLabel: '收下戰果',
        },
        ...buttonStates('choose'),
    };
}

export function quickSortieReportView(resolution: Pick<QuickSortieResolution, 'result' | 'reportLines'>, details: readonly string[]): QuickSortieView {
    return {
        texts: {
            quickSortieTitle: QUICK_SORTIE_RESULT_TITLE[resolution.result],
            quickSortieBody: resolution.reportLines.join('\n'),
            quickSortieDetail: details.join('\n'),
            commandBattleLabel: '親自指揮',
            quickBattleLabel: '極速決戰',
            sortieCancelLabel: '取消',
            quickReportCloseLabel: '收下戰果',
        },
        ...buttonStates('report'),
    };
}

export interface QuickSortieRequest {
    readonly stageName: string;
    readonly enemyName: string;
    /** 親自指揮：照舊進戰場 */
    command(): void;
    /** 極速決戰：推演並結算，回傳戰報與結算摘要；回傳 null 表示取消（例如偵查詢問按了返回） */
    quick(): Promise<{ resolution: QuickSortieResolution; details: string[] } | null>;
}

export interface QuickSortiePopupDeps<H extends MentorHoldingsHostLike> {
    mountHost(bindings: MentorHoldingsButtonBinding[]): Promise<H>;
    apply(host: H, view: QuickSortieView): void;
}

export class QuickSortiePopupController<H extends MentorHoldingsHostLike> {
    private _host: H | null = null;
    private _request: QuickSortieRequest | null = null;
    private _busy = false;

    constructor(private readonly _deps: QuickSortiePopupDeps<H>) {}

    public async mount(): Promise<void> {
        this._host = await this._deps.mountHost([
            { buttonId: 'btnCommandBattle', handler: () => { this.command(); } },
            { buttonId: 'btnQuickBattle', handler: () => { void this.quick(); } },
            { buttonId: 'btnSortieCancel', handler: () => { this.close(); } },
            { buttonId: 'btnQuickReportClose', handler: () => { this.close(); } },
        ]);
        if (this._host) this._host.node.active = false;
    }

    public get host(): H | null {
        return this._host;
    }

    public get isOpen(): boolean {
        return Boolean(this._host?.node.active);
    }

    /** 打開模式選擇；沒掛好宿主時回傳 false，由呼叫端照舊進戰場 */
    public open(request: QuickSortieRequest): boolean {
        if (!this._host) return false;
        this._request = request;
        this._deps.apply(this._host, quickSortieChooseView(request.stageName, request.enemyName));
        this._host.node.active = true;
        return true;
    }

    public command(): void {
        const request = this._request;
        if (!request || this._busy) return;
        this.close();
        request.command();
    }

    public async quick(): Promise<void> {
        const request = this._request;
        if (!request || this._busy || !this._host) return;
        this._busy = true;
        try {
            const outcome = await request.quick();
            if (!outcome) {
                this.close();
                return;
            }
            this._request = null;
            this._deps.apply(this._host, quickSortieReportView(outcome.resolution, outcome.details));
            this._host.node.active = true;
        } finally {
            this._busy = false;
        }
    }

    public close(): void {
        this._request = null;
        if (this._host) this._host.node.active = false;
    }
}
