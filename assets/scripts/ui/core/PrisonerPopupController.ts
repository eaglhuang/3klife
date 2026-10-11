// @spec-source → 俘虜處理系統（POW_Record、四選一處置、監獄）；PROG-2-0073 邏輯、PROG-2-0082 畫面
/**
 * PrisonerPopupController — 俘虜四選一彈窗的流程（純邏輯，不依賴 cc）
 *
 * 職責：
 *   - 列出 session.prison.pending 的待處置俘虜，上一位 / 下一位切換
 *   - 四個選項：勸降 / 招募 / 無期徒刑 / 放走，文字取自 powOptionLabels
 *   - 依目前資源決定按鈕能不能按：已勸降失敗不能再勸降；黃金或城市兵源不足不能招募；監獄滿不能關押
 *   - 選定後 → GameSession.resolvePrisoner()，招募花的黃金由這裡從錢包扣（session 不管錢包）
 *
 * 所有 texts / actives / enabled 的 key 都等於 prisoner-popup-main.json 的節點 id，
 * tests/M5ViewSpec.test.ts 會逐一比對。
 *
 * Unity 對照：MVP 的 Presenter。按鈕 onClick 只呼叫 Cycle / Decide，畫面層拿 GetView() 一次刷新。
 */
import type { MilitaryReserve } from '../../core/systems/MilitaryReserve';
import {
    PRISON_SLOTS_INITIAL,
    powOptionLabels,
    powResultLine,
    type PendingPrisoner,
    type PowDecision,
    type PowResolution,
    type PrisonState,
} from '../../core/systems/PrisonerOfWar';

export interface PrisonerPopupView {
    targetUid: string | null;
    texts: Record<string, string>;
    actives: Record<string, boolean>;
    enabled: Record<string, boolean>;
}

export interface PrisonerPopupDeps {
    session: {
        readonly prison: PrisonState;
        readonly military: MilitaryReserve;
        resolvePrisoner(targetUid: string, decision: PowDecision, options?: { gold?: number }): Promise<PowResolution | null>;
    };
    wallet: {
        gold(): number;
        /** 扣黃金；餘額不足回傳 false */
        spendGold(amount: number): boolean;
    };
}

const RARITY_TEXT: Record<string, string> = { R: 'R', SR: 'SR', SSR: 'SSR' };

export class PrisonerPopupController {
    private _targetUid: string | null = null;
    private _notice = '';

    constructor(private readonly _deps: PrisonerPopupDeps) {}

    pending(): PendingPrisoner[] {
        return this._deps.session.prison.pending;
    }

    hasPending(): boolean {
        return this.pending().length > 0;
    }

    get targetUid(): string | null {
        return this._resolve()?.record.targetUid ?? null;
    }

    open(): void {
        this._notice = '';
    }

    cycle(step = 1): void {
        const list = this.pending();
        if (list.length === 0) return;
        const current = list.findIndex((p) => p.record.targetUid === this.targetUid);
        const base = current < 0 ? 0 : current;
        this._targetUid = list[(((base + step) % list.length) + list.length) % list.length].record.targetUid;
        this._notice = '';
    }

    async decide(decision: PowDecision): Promise<PowResolution | null> {
        const current = this._resolve();
        if (!current) return null;
        const resolution = await this._deps.session.resolvePrisoner(current.record.targetUid, decision, { gold: this._deps.wallet.gold() });
        if (!resolution) return null;
        if (resolution.goldSpent > 0) this._deps.wallet.spendGold(resolution.goldSpent);
        this._notice = powResultLine(resolution);
        // 處置完的俘虜會從清單移除，指標交給 _resolve 落到下一位
        return resolution;
    }

    getView(): PrisonerPopupView {
        const list = this.pending();
        const current = this._resolve();
        const prison = this._deps.session.prison;
        const military = this._deps.session.military;
        const gold = this._deps.wallet.gold();
        const slots = prison.slots ?? PRISON_SLOTS_INITIAL;

        const texts: Record<string, string> = {
            powTitle: '俘虜處置',
            powPager: current ? `${list.findIndex((p) => p.record.targetUid === current.record.targetUid) + 1} / ${list.length}` : '0 / 0',
            powEmptyHint: '目前沒有待處置的俘虜。',
            powResource: `黃金 ${gold} · 城市兵源 ${military.cityTroops} · 監獄 ${prison.prisoners.length}/${slots} · 名聲 ${prison.fame}`,
            powNotice: this._notice,
            powTarget: '敵將：－',
            persuadeLabel: '勸降',
            recruitLabel: '招募',
            imprisonLabel: '無期徒刑',
            releaseLabel: '放走',
        };
        const actives: Record<string, boolean> = {
            powPanel: current !== null,
            powEmptyHint: current === null,
        };
        const enabled: Record<string, boolean> = {
            btnClosePow: true,
            btnPrevPow: list.length > 1,
            btnNextPow: list.length > 1,
            btnPersuade: false,
            btnRecruit: false,
            btnImprison: false,
            btnRelease: false,
        };
        if (!current) {
            return { targetUid: null, texts, actives, enabled };
        }

        const record = current.record;
        const labels = powOptionLabels(record);
        const persuadeFailed = record.decision === 'persuade';
        texts.powTarget = `敵將：${record.targetName}（${RARITY_TEXT[record.rarity] ?? record.rarity}）`;
        texts.persuadeLabel = persuadeFailed ? '勸降（已失敗，寧死不屈）' : labels.persuade;
        texts.recruitLabel = labels.recruit;
        texts.imprisonLabel = prison.prisoners.length >= slots ? '無期徒刑（監獄已滿）' : labels.imprison;
        texts.releaseLabel = labels.release;

        const open = record.decision === null || persuadeFailed;
        enabled.btnPersuade = record.decision === null;
        enabled.btnRecruit = open && gold >= record.options.recruitCost.gold && military.cityTroops >= record.options.recruitCost.troops;
        enabled.btnImprison = open && prison.prisoners.length < slots;
        enabled.btnRelease = open;
        return { targetUid: record.targetUid, texts, actives, enabled };
    }

    private _resolve(): PendingPrisoner | null {
        const list = this.pending();
        if (list.length === 0) return null;
        const found = list.find((p) => p.record.targetUid === this._targetUid);
        if (found) return found;
        this._targetUid = list[0].record.targetUid;
        return list[0];
    }
}
