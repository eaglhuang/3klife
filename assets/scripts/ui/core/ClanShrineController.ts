// @spec-source → 祠堂聲望與家族福祉 (doc_spec_0310) §3；PROG-2-1958
/**
 * ClanShrineController — 祠堂聲望畫面
 *
 * 開窗時向宿主取聲望與供奉狀態並刷新；領取供奉走宿主注入的 claim（GameSession.claimShrineOffering）；
 * 聲望變動時刷新並在升階時提示。掛載、套 view 與提示都由宿主注入。
 * 親子談話（PROG-2-10070）：宿主給了 child 依賴時，畫面多一塊「家族孩子」區：顯示目前孩子與親子好感、
 * 「親子談話」（每名孩子每年一次，經 family.talkToChild）與「換一位」按鈕。
 */
import { CLAN_PRESTIGE_TIER_NAMES } from '../../core/systems/GenerationalLegacy';
import type { FamilyChildLedgerResult, FamilyInfantCareResult, FamilyPatInfantResult, FamilyPrenatalBlessingResult, FamilyPrenatalStatusResult, FamilyTalkToChildResult } from '../../shared/api/ApiCommands';
import { clanShrineView, type ClanShrineView } from './ClanShrineView';
import { childTalkView, CHILD_NEXT_BUTTON_ID, CHILD_TALK_BUTTON_ID, clampChildIndex, type ChildTalkTranslate } from './ChildTalkView';
import { infantPatReplyLine } from '../../core/systems/BloodlineInfantCare';
import { prenatalBlessingDoneLine } from '../../core/systems/MarriagePrenatalBlessing';
import { infantPrenatalView, INFANT_PAT_BUTTON_ID, PRENATAL_BLESS_BUTTON_ID } from './InfantPrenatalView';
import type { MentorHoldingsButtonBinding, MentorHoldingsHostLike } from './MentorHoldingsController';

export interface ClanShrineDeps<H extends MentorHoldingsHostLike> {
    mountHost(bindings: MentorHoldingsButtonBinding[]): Promise<H>;
    apply(host: H, view: ClanShrineView): void;
    prestige(): number;
    tier(): number;
    canClaim(epochMs: number): boolean;
    /** 即 GameSession.claimShrineOffering；回傳領到的補元散數，0 表示不符資格 */
    claim(epochMs: number): Promise<number>;
    offeringPills: number;
    now(): number;
    toast(message: string): void;
    /** 親子談話區塊（可省略：沒給就不顯示、不綁按鈕） */
    child?: ClanShrineChildDeps;
}

export interface ClanShrineChildDeps {
    /** 家族孩子與親子好感（family.childLedger）；取不到回 null */
    snapshot(): Promise<FamilyChildLedgerResult | null>;
    /** 談話（family.talkToChild）；失敗回 reason */
    talk(childId: string): Promise<{ ok: true; result: FamilyTalkToChildResult } | { ok: false; reason: 'already-talked' | 'unknown-child' | 'error' }>;
    t: ChildTalkTranslate;
    /** 幼兒近況與摸頭、待產倒數與胎教祈福（PROG-2-10235；可省略） */
    care?: {
        infantCare(): Promise<FamilyInfantCareResult | null>;
        patInfant(childId: string): Promise<FamilyPatInfantResult | null>;
        prenatalStatus(): Promise<FamilyPrenatalStatusResult | null>;
        prenatalBlessing(motherId: string): Promise<FamilyPrenatalBlessingResult | null>;
    };
}

export class ClanShrineController<H extends MentorHoldingsHostLike> {
    private _host: H | null = null;
    private _children: FamilyChildLedgerResult | null = null;
    private _childIndex = 0;
    private _lastTalk: { childId: string; line: string } | null = null;
    private _talking = false;
    private _infant: FamilyInfantCareResult | null = null;
    private _prenatal: FamilyPrenatalStatusResult | null = null;
    private _lastPat: { childId: string; line: string } | null = null;

    constructor(private readonly _deps: ClanShrineDeps<H>) {}

    public async mount(): Promise<void> {
        this._host = await this._deps.mountHost([
            { buttonId: 'btnCloseShrine', handler: () => this.setOpen(false) },
            { buttonId: 'btnClaimShrine', handler: () => { void this.claim(); } },
            ...(this._deps.child ? [
                { buttonId: CHILD_TALK_BUTTON_ID, handler: () => { void this.talkToCurrentChild(); } },
                { buttonId: CHILD_NEXT_BUTTON_ID, handler: () => { this.nextChild(); } },
                ...(this._deps.child.care ? [
                    { buttonId: INFANT_PAT_BUTTON_ID, handler: () => { void this.patCurrentInfant(); } },
                    { buttonId: PRENATAL_BLESS_BUTTON_ID, handler: () => { void this.blessPrenatal(); } },
                ] : []),
            ] : []),
        ]);
        this.setOpen(false);
    }

    public get host(): H | null {
        return this._host;
    }

    public setOpen(open: boolean): void {
        if (open) {
            this.refresh();
            void this.refreshChildren();
        }
        if (this._host) this._host.node.active = open;
    }

    public refresh(): void {
        if (!this._host) return;
        const base = clanShrineView({
            prestige: this._deps.prestige(),
            tier: this._deps.tier(),
            canClaim: this._deps.canClaim(this._deps.now()),
            offeringPills: this._deps.offeringPills,
        });
        const child = this._deps.child;
        if (!child) {
            this._deps.apply(this._host, base);
            return;
        }
        const talk = childTalkView({ snapshot: this._children, index: this._childIndex, lastTalk: this._lastTalk, t: child.t });
        const care = child.care
            ? infantPrenatalView({ infant: this._infant, childId: this._children?.children[clampChildIndex(this._childIndex, this._children.children.length)]?.id ?? null, lastPat: this._lastPat, prenatal: this._prenatal, t: child.t })
            : { texts: {}, actives: {}, enabled: {} };
        this._deps.apply(this._host, {
            texts: { ...base.texts, ...talk.texts, ...care.texts },
            actives: { ...base.actives, ...talk.actives, ...care.actives },
            enabled: { ...base.enabled, ...talk.enabled, ...care.enabled },
        });
    }

    /** 重讀家族孩子與親子好感後刷新（開窗與談話後呼叫） */
    public async refreshChildren(): Promise<void> {
        const child = this._deps.child;
        if (!child) return;
        this._children = await child.snapshot();
        if (child.care) {
            this._infant = await child.care.infantCare();
            this._prenatal = await child.care.prenatalStatus();
        }
        this._childIndex = clampChildIndex(this._childIndex, this._children?.children.length ?? 0);
        this.refresh();
    }

    /** 換下一位孩子（只有一位時不動） */
    public nextChild(): void {
        const count = this._children?.children.length ?? 0;
        if (count <= 1) return;
        this._childIndex = (this._childIndex + 1) % count;
        this.refresh();
    }

    /** 跟目前選到的孩子談話：成功顯示話題與好感增量，今年談過就只提示 */
    public async talkToCurrentChild(): Promise<boolean> {
        const child = this._deps.child;
        const target = this._children?.children[clampChildIndex(this._childIndex, this._children.children.length)];
        if (!child || !target || this._talking) return false;
        this._talking = true;
        try {
            const out = await child.talk(target.id);
            if (!out.ok) {
                this._deps.toast(child.t(out.reason === 'already-talked' ? 'ui.child.talk.already' : 'ui.child.talk.none'));
                await this.refreshChildren();
                return false;
            }
            this._lastTalk = { childId: target.id, line: child.t(out.result.lineKey) };
            this._deps.toast(child.t('ui.child.talk.gain', String(out.result.favorDelta)));
            await this.refreshChildren();
            return true;
        } finally {
            this._talking = false;
        }
    }

    /** 幼兒摸頭：親子好感 +1（每季每名一次）；成功顯示孩子的回應 */
    public async patCurrentInfant(): Promise<boolean> {
        const child = this._deps.child;
        const target = this._children?.children[clampChildIndex(this._childIndex, this._children.children.length)];
        if (!child?.care || !target) return false;
        const out = await child.care.patInfant(target.id);
        if (!out?.ok) {
            this._deps.toast(child.t('ui.bloodline.infant_pat_limit'));
            await this.refreshChildren();
            return false;
        }
        const info = this._infant?.infants.find((c) => c.id === target.id);
        this._lastPat = { childId: target.id, line: out.replyKey ? infantPatReplyLine((key) => child.t(key), out.replyKey, target.name, info?.gender) : '' };
        this._deps.toast(out.favorGain > 0 ? child.t('ui.bloodline.infant_pat_gain', String(out.favorGain)) : child.t('ui.bloodline.infant_pat_shared'));
        await this.refreshChildren();
        return true;
    }

    /** 待產中的母親做胎教祈福：扣家族銀兩、每次待產限 1 次 */
    public async blessPrenatal(): Promise<boolean> {
        const child = this._deps.child;
        const mother = this._prenatal?.mothers[0];
        if (!child?.care || !mother) return false;
        const out = await child.care.prenatalBlessing(mother.id);
        if (!out?.ok) {
            this._deps.toast(child.t(out?.reason === 'silver-low' ? 'ui.marriage.prenatal_bless_silver_low' : 'ui.marriage.prenatal_bless_done_btn'));
            await this.refreshChildren();
            return false;
        }
        this._deps.toast(prenatalBlessingDoneLine((key) => child.t(key), mother.name, mother.gender));
        await this.refreshChildren();
        return true;
    }

    /** 領今天的供奉；不符資格時只提示 */
    public async claim(): Promise<number> {
        const got = await this._deps.claim(this._deps.now());
        this._deps.toast(got > 0 ? `祠堂供奉：獲得補元散 ×${got}` : '今天沒有可領的祠堂供奉');
        this.refresh();
        return got;
    }

    /** ClanPrestigeChanged：升階時提示新階層稱號，畫面開著就跟著刷新 */
    public onPrestigeChanged(payload: { tier: number; tierUp: boolean }): void {
        if (payload.tierUp) {
            const name = CLAN_PRESTIGE_TIER_NAMES[Math.min(CLAN_PRESTIGE_TIER_NAMES.length, Math.max(1, payload.tier)) - 1];
            this._deps.toast(`祠堂升階：Lv.${payload.tier}「${name}」`);
        }
        if (this._host?.node.active) this.refresh();
    }
}
