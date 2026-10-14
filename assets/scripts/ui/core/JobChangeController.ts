// @spec-source → 轉職與宿命系統.md §A/§D（WBS v3 FATE-07 畫面）；PROG-2-0227
/**
 * JobChangeController — 20 歲成人禮轉職選單的流程（純邏輯，不依賴 cc）
 *
 * 職責：
 *   - 列出可轉職的武將（存活、滿 20 歲、有主職、尚無副職），上一位 / 下一位循環挑選
 *   - 列出可選副職（排除與主職相同者），顯示文案與預估副職能力
 *   - 顯示轉職令持有數與資格檢查結果；條件不符時確認鈕不可按，並說明原因
 *   - 確認轉職 → 呼叫 GameSession.changeJob() → 把結果寫進提示
 *
 * Unity 對照：MVP 的 Presenter。按鈕 onClick 只呼叫 SelectGeneral / SelectSubClass / Confirm，
 * 畫面層拿 GetView() 的 ViewModel 一次刷新 Text 與 Button.interactable。
 */
import type { GeneralConfig } from '../../core/models/GeneralUnit';
import { GENERAL_STATUS_DEAD } from '../../core/systems/GeneralAging';
import {
    buildJobChangeChoices,
    checkJobChange,
    JOB_CHANGE_MIN_AGE,
    JobChangeChoice,
    JobChangeRejectReason,
    JobChangeResult,
    JobClass,
} from '../../core/systems/JobChange';
import { primaryAbilityOf, JobWiringGeneral, resolvePrimaryClass } from '../../core/systems/JobChangeWiring';
import { canAffordOffer, JOB_CHANGE_ORDER_OFFER } from '../../core/systems/ItemShopPricing';

export const JOB_CHANGE_REJECT_TEXT: Record<JobChangeRejectReason, string> = {
    'too-young': `未滿 ${JOB_CHANGE_MIN_AGE} 歲，尚不能轉職`,
    'no-order': '轉職令不足',
    'already-has-sub': '此武將已有副職',
    'same-class': '副職不可與主職相同',
};

export interface JobChangeView {
    /** 目前選中的武將；名單為空時為 null */
    generalId: string | null;
    /** 目前選中的副職；尚未選時為 null */
    subClass: JobClass | null;
    /** 可選副職（已排除主職） */
    choices: JobChangeChoice[];
    /** 轉職令持有數 */
    orders: number;
    /** 目前選擇的資格說明；可轉職時為 null */
    blockedText: string | null;
    /** 上一次確認的結果提示；尚未確認為 null */
    notice: string | null;
    /** 確認鈕是否可按 */
    confirmEnabled: boolean;
}

/** 與 BondingView 同形：texts / actives / enabled 的 key 都是 job-change-main.json 的節點 id */
export interface JobChangeFlowView {
    texts: Record<string, string>;
    actives: Record<string, boolean>;
    enabled: Record<string, boolean>;
}

export interface JobChangeDeps {
    roster: { getAll(): GeneralConfig[] };
    /** 目前持有的轉職令數 */
    ordersOwned: () => number;
    /** 正式環境接 GameSession.changeJob；回傳 null 代表找不到武將或沒有主職資料 */
    changeJob: (generalId: string, targetSubClass: JobClass) => Promise<JobChangeResult | null>;
    /** 目前持有的精元（轉職令購買用）；沒有購買入口時可不提供 */
    gems?: () => number;
    /** 購買一張轉職令：扣精元並發道具，成功回傳 true（FATE-07）；沒有購買入口時可不提供 */
    buyOrder?: () => Promise<boolean>;
}

export class JobChangeController {
    private _generalId: string | null = null;
    private _subClass: JobClass | null = null;
    private _notice: string | null = null;

    constructor(private readonly _deps: JobChangeDeps) {}

    /** 可轉職的武將：存活、滿 20 歲、有主職、尚無副職 */
    public eligibleGenerals(): JobWiringGeneral[] {
        return this._deps.roster.getAll()
            .filter((general): general is JobWiringGeneral => {
                const wiring = general as JobWiringGeneral;
                return wiring.status !== GENERAL_STATUS_DEAD
                    && typeof wiring.age === 'number'
                    && wiring.age >= JOB_CHANGE_MIN_AGE
                    && (wiring.subClass ?? null) === null;
            });
    }

    public selectGeneral(generalId: string): void {
        if (!this.eligibleGenerals().some((general) => general.id === generalId)) return;
        this._generalId = generalId;
        this._subClass = null;
        this._notice = null;
    }

    /** 上一位 / 下一位循環；名單為空時不動作 */
    public cycleGeneral(step: 1 | -1): void {
        const list = this.eligibleGenerals();
        if (list.length === 0) return;
        const index = list.findIndex((general) => general.id === this._generalId);
        const next = (index < 0 ? 0 : (index + step + list.length) % list.length);
        this.selectGeneral(list[next].id);
    }

    public selectSubClass(subClass: JobClass): void {
        const general = this._current();
        if (!general) return;
        if (!buildJobChangeChoices(this._candidateOf(general)).some((choice) => choice.subClass === subClass)) return;
        this._subClass = subClass;
        this._notice = null;
    }

    public async confirm(): Promise<JobChangeResult | null> {
        const general = this._current();
        if (!general || !this._subClass || this._blockedReason(general, this._subClass)) return null;
        const result = await this._deps.changeJob(general.id, this._subClass);
        if (!result) {
            this._notice = '找不到武將或缺少主職資料，無法轉職';
            return null;
        }
        this._notice = result.ok
            ? `${general.name} 已追加副職：${this._subClass === 'Warrior' ? '武官' : '文官'}`
            : JOB_CHANGE_REJECT_TEXT[result.reason!];
        if (result.ok) this._subClass = null;
        return result;
    }

    public getView(): JobChangeView {
        const general = this._current();
        if (!general) {
            return {
                generalId: null, subClass: null, choices: [], orders: this._deps.ordersOwned(),
                blockedText: '目前沒有可轉職的武將', notice: this._notice, confirmEnabled: false,
            };
        }
        const choices = buildJobChangeChoices(this._candidateOf(general));
        const blocked = this._subClass ? this._blockedReason(general, this._subClass) : null;
        return {
            generalId: general.id,
            subClass: this._subClass,
            choices,
            orders: this._deps.ordersOwned(),
            blockedText: blocked ? JOB_CHANGE_REJECT_TEXT[blocked] : null,
            notice: this._notice,
            confirmEnabled: this._subClass !== null && blocked === null,
        };
    }

    /**
     * 畫面用的扁平 view：key 與 job-change-main.json 的節點 id 一一對應，
     * 形狀與 BondingSetup 相同，可直接交給 applyFlowView。
     */
    /** 能不能買轉職令：有購買入口、且精元足夠。 */
    public canBuyOrder(): boolean {
        if (!this._deps.buyOrder || !this._deps.gems) return false;
        return canAffordOffer(JOB_CHANGE_ORDER_OFFER, this._deps.gems());
    }

    /** 購買一張轉職令；精元不足或沒有購買入口時不呼叫扣款，回傳 false 並寫入提示。 */
    public async buyOrder(): Promise<boolean> {
        if (!this.canBuyOrder()) {
            this._notice = '精元不足，無法購買轉職令';
            return false;
        }
        const ok = await this._deps.buyOrder!();
        this._notice = ok ? '已購入轉職令 ×1' : '購買失敗，請稍後再試';
        return ok;
    }

    public getFlowView(): JobChangeFlowView {
        const view = this.getView();
        const general = this._current();
        const warrior = view.choices.find((choice) => choice.subClass === 'Warrior');
        const scholar = view.choices.find((choice) => choice.subClass === 'Scholar');
        const pick = (subClass: JobClass, label: string): string =>
            `${view.subClass === subClass ? '✓ ' : ''}${label}`;
        return {
            texts: {
                generalName: general ? general.name : '－',
                generalInfo: general ? `${general.age} 歲　主職：${resolvePrimaryClass(general) === 'Warrior' ? '武官' : '文官'}` : '',
                pager: `${this.eligibleGenerals().findIndex((item) => item.id === general?.id) + 1} / ${this.eligibleGenerals().length}`,
                subInfo: [warrior, scholar]
                    .filter((choice): choice is JobChangeChoice => choice !== undefined)
                    .map((choice) => `${choice.subClass === 'Warrior' ? '武官' : '文官'}能力 ${choice.projectedSubAbility}`)
                    .join('　'),
                ordersLabel: `轉職令 ×${view.orders}`,
                blockedLabel: view.blockedText ?? '',
                noticeLabel: view.notice ?? '',
                btnSubWarriorLabel: pick('Warrior', '追加武官'),
                btnSubScholarLabel: pick('Scholar', '追加文官'),
                emptyHint: view.blockedText ?? '',
                btnBuyOrderLabel: `購買轉職令（精元 ${JOB_CHANGE_ORDER_OFFER.price}）`,
            },
            actives: {
                emptyHint: general === null,
                contentPanel: general !== null,
                blockedLabel: general !== null && view.blockedText !== null,
                noticeLabel: view.notice !== null,
            },
            enabled: {
                btnPrevGeneral: this.eligibleGenerals().length > 1,
                btnNextGeneral: this.eligibleGenerals().length > 1,
                btnSubWarrior: warrior !== undefined,
                btnSubScholar: scholar !== undefined,
                btnConfirmJob: view.confirmEnabled,
                btnBuyOrder: this.canBuyOrder(),
            },
        };
    }

    private _current(): JobWiringGeneral | null {
        const list = this.eligibleGenerals();
        if (list.length === 0) return null;
        return list.find((general) => general.id === this._generalId) ?? list[0];
    }

    private _candidateOf(general: JobWiringGeneral) {
        const primaryClass = resolvePrimaryClass(general);
        return {
            age: general.age as number,
            primaryClass,
            subClass: null,
            primaryAbility: primaryAbilityOf(general, primaryClass),
        };
    }

    private _blockedReason(general: JobWiringGeneral, subClass: JobClass): JobChangeRejectReason | null {
        return checkJobChange(this._candidateOf(general), this._deps.ordersOwned(), subClass);
    }
}
