// @spec-source → 傳世名酒宴飲結義與割袍斷義狀態機規格書 doc_spec_0743 §2～§4；好感門檻一律 60（oath-config.json）；PROG-2-10207
/**
 * OathHallController — 大廳「結義堂」（桃園結義、名酒宴飲、割袍斷義）的選取狀態與畫面資料（不依賴 cc）。
 *
 * 以主將為中心：左側列出可結交的武將（顯示與主將的好感），玩家選 1~2 位同伴：
 *   - 桃園結義：主將＋所選同伴成盟（兩兩好感須達門檻）
 *   - 名酒宴飲：主將與第一位同伴對飲，消耗 1 瓶目前選定的名酒
 *   - 割袍斷義：主將與第一位同伴（須同盟）斷義，好感鎖死、互為宿敵
 * 規則在 SwornPact／WineBanquet／GameSession，這裡只負責選取、可按與否與文案。文字走 i18n（oathHall.*），缺字用 zh-TW 預設。
 */
import { WINE_IDS, type OathConfig, type WineId } from '../../core/systems/OathConfig';
import { activePactOf, isSeveredPair, nemesesOf, type SwornState } from '../../core/systems/SwornPact';
import type { BanquetResult } from '../../core/systems/WineBanquet';
import type { FormPactResult, SeverResult } from '../../core/systems/SwornPact';
import { fillOathArgs, type OathTextLookup } from '../../core/systems/MercenaryOath';

export const OATH_HALL_MAX_ROWS = 6;

export const OATH_HALL_TEXTS = {
    title: '結義堂',
    close: '關閉',
    lead: '主將：{0}',
    leadNone: '尚未指定主將',
    noCandidate: '目前沒有可結交的武將',
    rowMeta: '好感 {0}　{1}',
    stateSworn: '義兄弟',
    stateSevered: '宿敵',
    select: '選取',
    selected: '已選',
    selection: '同伴：{0}',
    selectionNone: '請先選 1～2 位同伴',
    pactInfo: '盟約：{0}',
    pactNone: '尚無盟約',
    pactHint: '結義需 2～3 人，兩兩好感達 {0}',
    nemesis: '宿敵：{0}',
    nemesisNone: '宿敵：無',
    wineStock: '名酒庫存　{0}',
    wineChoice: '宴飲用酒：{0}（持有 {1}）',
    btnPact: '桃園結義',
    btnWine: '換酒',
    btnBanquet: '名酒宴飲',
    btnSever: '割袍斷義',
    wine_DUKANG_WINE: '杜康佳釀',
    wine_GREEN_PLUM: '青梅煮酒',
    wine_TUSU_WINE: '屠蘇酒',
    wine_JIUYUN_WINE: '九醞春酒',
    insight_GREEN_PLUM: '煮酒間，你看穿了對方的心思。',
    noteNeedLead: '請先指定主將',
    noteNeedPartner: '請先選取同伴',
    notePactOk: '桃園結義成功：{0}',
    notePactCount: '結義需 2～3 人',
    notePactInPact: '{0} 已在其他盟約中',
    notePactSevered: '{0} 與 {1} 已割袍斷義，無法結義',
    notePactLow: '{0} 與 {1} 好感未達 {2}',
    noteBanquetOk: '與 {0} 共飲{1}，好感 +{2}（現為 {3}）',
    noteBanquetNoWine: '沒有{0}',
    noteBanquetSevered: '已割袍斷義，無法同席宴飲',
    noteSeverOk: '拔劍割袍：{0} 與 {1} 恩斷義絕，好感鎖死 {2}',
    noteSeverNotSworn: '雙方不在同一盟約，無從割袍斷義',
    noteFailed: '操作失敗，請稍後再試',
    ritualPactTitle: '桃園結義',
    ritualSeverTitle: '割袍斷義',
    ritualPact1: '桃園之下，焚香設案，{0}　並肩而立。',
    ritualPact2: '不求同年同月同日生，但求同年同月同日死。',
    ritualSever1: '義字當頭，背義者誅。',
    ritualSever2: '拔劍割袍，{0} 與 {1} 從此恩斷義絕。',
} as const;

export type OathHallTextKey = keyof typeof OATH_HALL_TEXTS;

/** 取結義堂文案：先查 i18n（oathHall.<key>），查不到用 zh-TW 預設，參數代入。 */
export function oathHallText(lookup: OathTextLookup | undefined, key: OathHallTextKey, ...args: Array<string | number>): string {
    const i18nKey = `oathHall.${key}`;
    const found = lookup ? lookup(i18nKey, ...args) : i18nKey;
    return found && found !== i18nKey ? fillOathArgs(found, args) : fillOathArgs(OATH_HALL_TEXTS[key], args);
}

export interface OathHallCandidate {
    id: string;
    name: string;
}

export interface OathHallDeps {
    lead: () => string | null;
    nameOf: (id: string) => string;
    candidates: () => OathHallCandidate[];
    affinity: (a: string, b: string) => number;
    sworn: () => SwornState;
    config: () => OathConfig;
    itemCount: (itemId: string) => number;
    formPact: (memberIds: string[]) => Promise<FormPactResult>;
    sever: (offenderId: string, victimId: string) => Promise<SeverResult>;
    banquet: (wineId: WineId, hostId: string, guestId: string) => Promise<BanquetResult>;
    /** 儀式演出（選填）：結義、斷義成功後由大廳播放；回傳後才繼續 */
    ritual?: (kind: 'pact' | 'sever', lines: string[]) => Promise<void>;
    lookup?: OathTextLookup;
}

export interface OathHallView {
    texts: Record<string, string>;
    actives: Record<string, boolean>;
    enabled: Record<string, boolean>;
}

export class OathHallController {
    private _selected: string[] = [];
    private _wineIndex = 0;
    private _notice = '';
    /** QA 探針：最近一次操作的結果文案 */
    public lastNotice = '';

    constructor(private readonly deps: OathHallDeps) {}

    private t(key: OathHallTextKey, ...args: Array<string | number>): string {
        return oathHallText(this.deps.lookup, key, ...args);
    }

    private rows(): OathHallCandidate[] {
        const lead = this.deps.lead();
        return this.deps.candidates().filter((c) => c.id !== lead).slice(0, OATH_HALL_MAX_ROWS);
    }

    /** 開面板或換資料時清掉過期的選取。 */
    reset(): void {
        this._selected = [];
        this._notice = '';
    }

    selectedIds(): readonly string[] {
        return this._selected;
    }

    /** 點列：切換選取，最多 2 位同伴（加上主將最多 3 人）。 */
    select(index: number): void {
        const row = this.rows()[index];
        if (!row) return;
        const at = this._selected.indexOf(row.id);
        if (at >= 0) this._selected.splice(at, 1);
        else if (this._selected.length < this.deps.config().pact.maxMembers - 1) this._selected.push(row.id);
    }

    currentWine(): WineId {
        return WINE_IDS[this._wineIndex % WINE_IDS.length];
    }

    cycleWine(): void {
        this._wineIndex = (this._wineIndex + 1) % WINE_IDS.length;
    }

    private wineName(id: WineId): string {
        return this.t(`wine_${id}` as OathHallTextKey);
    }

    private wineCount(id: WineId): number {
        return this.deps.itemCount(this.deps.config().wine.wines[id].itemId);
    }

    private say(text: string): void {
        this._notice = text;
        this.lastNotice = text;
    }

    async formPact(): Promise<boolean> {
        const lead = this.deps.lead();
        if (!lead) { this.say(this.t('noteNeedLead')); return false; }
        if (this._selected.length === 0) { this.say(this.t('noteNeedPartner')); return false; }
        const members = [lead, ...this._selected];
        const result = await this.deps.formPact(members);
        if (!result.ok) {
            const a = result.a ? this.deps.nameOf(result.a) : '';
            const b = result.b ? this.deps.nameOf(result.b) : '';
            if (result.reason === 'member-count' || result.reason === 'duplicate-member') this.say(this.t('notePactCount'));
            else if (result.reason === 'already-in-pact') this.say(this.t('notePactInPact', a));
            else if (result.reason === 'severed-pair') this.say(this.t('notePactSevered', a, b));
            else this.say(this.t('notePactLow', a, b, this.deps.config().affinityThreshold));
            return false;
        }
        const names = members.map((id) => this.deps.nameOf(id)).join('、');
        this.say(this.t('notePactOk', names));
        this._selected = [];
        await this.deps.ritual?.('pact', [this.t('ritualPact1', names), this.t('ritualPact2')]);
        return true;
    }

    async banquet(): Promise<boolean> {
        const lead = this.deps.lead();
        if (!lead) { this.say(this.t('noteNeedLead')); return false; }
        const guest = this._selected[0];
        if (!guest) { this.say(this.t('noteNeedPartner')); return false; }
        const wine = this.currentWine();
        const result = await this.deps.banquet(wine, lead, guest);
        if (!result.ok) {
            this.say(result.reason === 'severed-pair' ? this.t('noteBanquetSevered')
                : result.reason === 'no-wine' ? this.t('noteBanquetNoWine', this.wineName(wine))
                    : this.t('noteFailed'));
            return false;
        }
        const insight = wine === 'GREEN_PLUM' ? ' ' + this.t('insight_GREEN_PLUM') : '';
        this.say(this.t('noteBanquetOk', this.deps.nameOf(guest), this.wineName(wine), result.affinityGain, result.affinityAfter) + insight);
        return true;
    }

    async sever(): Promise<boolean> {
        const lead = this.deps.lead();
        if (!lead) { this.say(this.t('noteNeedLead')); return false; }
        const victim = this._selected[0];
        if (!victim) { this.say(this.t('noteNeedPartner')); return false; }
        const result = await this.deps.sever(lead, victim);
        if (!result.ok) {
            this.say(result.reason === 'not-sworn' ? this.t('noteSeverNotSworn') : this.t('noteFailed'));
            return false;
        }
        const a = this.deps.nameOf(lead);
        const b = this.deps.nameOf(victim);
        this.say(this.t('noteSeverOk', a, b, result.lockedAffinity));
        this._selected = [];
        await this.deps.ritual?.('sever', [this.t('ritualSever1'), this.t('ritualSever2', a, b)]);
        return true;
    }

    getView(): OathHallView {
        const lead = this.deps.lead();
        const state = this.deps.sworn();
        const config = this.deps.config();
        const rows = this.rows();
        const texts: Record<string, string> = {
            oathHallTitle: this.t('title'),
            btnCloseLabel: this.t('close'),
            oathLead: lead ? this.t('lead', this.deps.nameOf(lead)) : this.t('leadNone'),
            oathEmpty: rows.length === 0 ? this.t('noCandidate') : '',
            btnOathPactLabel: this.t('btnPact'),
            btnOathWineLabel: this.t('btnWine'),
            btnOathBanquetLabel: this.t('btnBanquet'),
            btnOathSeverLabel: this.t('btnSever'),
            oathNotice: this._notice,
        };
        const actives: Record<string, boolean> = {};
        for (let i = 0; i < OATH_HALL_MAX_ROWS; i += 1) {
            const row = rows[i];
            actives[`oathRow${i}`] = row !== undefined;
            if (!row) continue;
            let state_ = '';
            if (lead) {
                if (isSeveredPair(state, lead, row.id)) state_ = this.t('stateSevered');
                else if (activePactOf(state, lead)?.swornBrotherIds.includes(row.id)) state_ = this.t('stateSworn');
            }
            texts[`oathRow${i}Name`] = row.name;
            texts[`oathRow${i}Meta`] = this.t('rowMeta', lead ? this.deps.affinity(lead, row.id) : 0, state_);
            texts[`btnOathRow${i}Label`] = this._selected.includes(row.id) ? this.t('selected') : this.t('select');
        }
        texts.oathSelection = this._selected.length > 0
            ? this.t('selection', this._selected.map((id) => this.deps.nameOf(id)).join('、'))
            : this.t('selectionNone');
        const pact = lead ? activePactOf(state, lead) : null;
        texts.oathPactInfo = pact
            ? this.t('pactInfo', pact.swornBrotherIds.map((id) => this.deps.nameOf(id)).join('、'))
            : this.t('pactNone') + '\n' + this.t('pactHint', config.affinityThreshold);
        const enemies = lead ? nemesesOf(state, lead) : [];
        texts.oathNemesis = enemies.length > 0 ? this.t('nemesis', enemies.map((id) => this.deps.nameOf(id)).join('、')) : this.t('nemesisNone');
        texts.oathWineStock = this.t('wineStock', WINE_IDS.map((id) => `${this.wineName(id)}×${this.wineCount(id)}`).join('　'));
        const wine = this.currentWine();
        texts.oathWineChoice = this.t('wineChoice', this.wineName(wine), this.wineCount(wine));
        const hasPartner = lead !== null && this._selected.length > 0;
        return {
            texts,
            actives,
            enabled: {
                btnOathPact: hasPartner,
                btnOathBanquet: hasPartner && this.wineCount(wine) > 0,
                btnOathSever: hasPartner && pact !== null,
                btnOathWine: true,
            },
        };
    }
}
