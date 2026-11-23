// @spec-source → 戰場部署系統.md (doc_spec_0040) §出征前編制槽（參謀官 / 後勤官）；PROG-2-0070 邏輯、PROG-2-0083 畫面；PROG-2-9911 戰前編成視窗（一鍵推薦、卡組槽、文案 i18n）
/**
 * SortieSetupController — 出征編制畫面的流程（純邏輯，不依賴 cc）
 *
 * 職責：
 *   - 以目前出戰主將為中心，挑選參謀官與後勤官（上一位 / 下一位循環，含「不派」）
 *   - 候選人：可出戰、不是主將、不是另一個支援角色；同名血統衝突的會被跳過
 *   - 顯示加成：參謀官計謀點上限 / 開局補點、後勤官軍糧加成，以及本場出征軍勢上限與糧草
 *   - 一鍵推薦編制（PROG-2-9911）：呼叫 PreBattleRecommend，依序寫入主將、參謀官、後勤官與出戰卡組，並列出每個選擇的理由
 *   - 出戰卡組 4 槽只顯示；更換主將與卡組走既有的選擇畫面（由宿主開啟）
 *
 * 所有 texts / actives / enabled 的 key 都等於 sortie-setup-main.json 的節點 id，
 * tests/M5ViewSpec.test.ts 會逐一比對。文案一律經 lookup（services().i18n.t）取得，不寫死中文。
 *
 * Unity 對照：隊伍編成畫面的 Presenter，Support Slot 的左右切換只改 session 狀態，再整頁刷新。
 */
import type { GeneralConfig } from '../../core/models/GeneralUnit';
import type { SortieSupport, SortieSupportSummary } from '../../core/managers/GameSession';
import type { MilitaryReserve } from '../../core/systems/MilitaryReserve';
import type { PendingSceneGambit } from '../../core/systems/HallSceneGambit';
import { sceneGambitToggleText } from './HallSceneGambitText';
import {
    computeSortiePoolMax,
    sortieGuaranteeOf,
    sortieShortageNotice,
    SORTIE_LOADOUT_ISSUE_TEXT,
    type CreateSortieInput,
    type SortieLoadoutCheck,
} from '../../core/systems/SortieDeploy';
import { sortiePredictText } from '../../core/systems/SortiePrediction';
import { hasUsablePreset, resolvePreset, savePresetFor, type SortiePresetStore } from '../../core/systems/SortieLoadoutPreset';
import {
    recommendForEncounter,
    recommendPreBattleLoadout,
    type PreBattleCommanderCandidate,
    type PreBattleEncounterRef,
    type PreBattleRecommendation,
    type PreBattleRosterInput,
    type PreBattleWeights,
} from '../../core/systems/PreBattleRecommend';
import { PLAYER_DECK_MAX_SIZE } from '../../core/services/PlayerDeckRules';

export type SortieRole = 'strategist' | 'deputy';

export interface SortieSetupView {
    commanderId: string | null;
    texts: Record<string, string>;
    actives: Record<string, boolean>;
    enabled: Record<string, boolean>;
}

/** 虎符卡目錄的一筆（推薦與卡組槽顯示用） */
export interface SortieDeckCardInfo {
    cardId: string;
    name: string;
    unitType: string;
    rarity: PreBattleRosterInput['tallies'][number]['rarity'];
}

/** 一鍵推薦所需的資料（PROG-2-9911）；weights 未載入時推薦鈕停用 */
export interface SortiePrebattleDeps {
    weights: PreBattleWeights | null;
    encounters(): readonly PreBattleEncounterRef[];
    currentEncounterId(): string | null;
    cards(): readonly SortieDeckCardInfo[];
}

export interface SortieSetupDeps {
    session: {
        readonly leadGeneralId: string | null;
        readonly sortieSupport: SortieSupport;
        readonly military: MilitaryReserve;
        readonly pendingSceneGambit: PendingSceneGambit | null;
        readonly deck: readonly string[];
        setPendingSceneGambitArmed(armed: boolean): Promise<boolean>;
        getDeployableGenerals(): GeneralConfig[];
        setSortieSupport(strategistUid: string | null, deputyUid: string | null): SortieLoadoutCheck;
        getSortieSupportSummary(commanderUid: string): SortieSupportSummary;
        getSortieInput(generalId: string): CreateSortieInput | null;
        setLeadGeneral(generalId: string | null): Promise<boolean>;
        setDeck(ids: readonly string[], catalogIds?: readonly string[]): Promise<string[]>;
    };
    /** 大廳開戰時的守方敵將（第一個關卡）；未載入時回傳 null，畫面顯示資料未載入 */
    getEnemyGeneral?: () => GeneralConfig | null;
    /** 編制預設（DEP-14）：每位主將一組；未提供時不能儲存、也沒有推薦 */
    presets?: {
        get(): SortiePresetStore;
        set(store: SortiePresetStore): void;
    };
    /** 文案查詢（services().i18n.t，支援 {0}{1} 佔位符）；未提供時直接回傳 key */
    lookup?: (key: string, ...args: string[]) => string;
    /** 一鍵推薦（PROG-2-9911）；未提供時推薦鈕停用 */
    prebattle?: SortiePrebattleDeps;
}

/** 計謀點已進戰場（PROG-2-0084）：上限與開局補點會套進本場帳本；文案 key */
const TACTIC_POINTS_NOTE_KEY = 'sortie.strategist.note';

function statOf(g: GeneralConfig, key: 'str' | 'int' | 'pol' | 'lea'): number {
    return Math.floor(g[key] ?? g.stats?.[key] ?? 0);
}

export class SortieSetupController {
    private _notice = '';
    private _reasonLines: string[] = [];

    constructor(private readonly _deps: SortieSetupDeps) {}

    private _t(key: string, ...args: string[]): string {
        return this._deps.lookup ? this._deps.lookup(key, ...args) : key;
    }

    open(): void {
        this._notice = '';
        this._reasonLines = [];
    }

    /** 主將（必須仍可出戰），沒有指定或不能出戰時回傳 null */
    commander(): GeneralConfig | null {
        const lead = this._deps.session.leadGeneralId;
        if (!lead) return null;
        return this._deps.session.getDeployableGenerals().find((g) => g.id === lead) ?? null;
    }

    /** 某角色的候選清單（不含主將與另一個角色），第一格是「不派」 */
    options(role: SortieRole): Array<GeneralConfig | null> {
        const commander = this.commander();
        if (!commander) return [null];
        const support = this._effective(commander.id);
        const other = role === 'strategist' ? support.deputyUid : support.strategistUid;
        const list = this._deps.session.getDeployableGenerals().filter((g) => g.id !== commander.id && g.id !== other);
        return [null, ...list];
    }

    cycle(role: SortieRole, step = 1): void {
        const options = this.options(role);
        if (options.length <= 1) return;
        const commander = this.commander();
        if (!commander) return;
        const support = this._effective(commander.id);
        const currentId = role === 'strategist' ? support.strategistUid : support.deputyUid;
        const start = Math.max(0, options.findIndex((g) => (g?.id ?? null) === currentId));
        // 同名血統衝突的候選會被 session 拒絕，往下一位找，最多繞一圈
        for (let tries = 1; tries < options.length; tries += 1) {
            const next = options[(((start + step * tries) % options.length) + options.length) % options.length];
            const check = this._assign(role, next?.id ?? null);
            if (check.ok) {
                this._notice = '';
                return;
            }
            this._notice = check.issues.map((i) => SORTIE_LOADOUT_ISSUE_TEXT[i]).join('、');
        }
    }

    clear(role: SortieRole): void {
        this._assign(role, null);
        this._notice = '';
    }

    getView(): SortieSetupView {
        const t = (key: string, ...args: string[]) => this._t(key, ...args);
        const commander = this.commander();
        const texts: Record<string, string> = {
            sortieTitle: t('sortie.title'),
            closeSortieLabel: t('sortie.close'),
            sortieEmptyHint: t('sortie.emptyHint'),
            sortieCommander: t('sortie.commander.none'),
            pickLeadLabel: t('sortie.commander.pick'),
            deckTitleLabel: t('sortie.deck.title', String(this._deps.session.deck.length), String(PLAYER_DECK_MAX_SIZE)),
            pickDeckLabel: t('sortie.deck.pick'),
            strategistTitle: t('sortie.strategist.title'),
            strategistName: t('sortie.none'),
            strategistInfo: t('sortie.strategist.info'),
            prevStrategistLabel: t('sortie.prev'),
            clearStrategistLabel: t('sortie.none'),
            nextStrategistLabel: t('sortie.next'),
            deputyTitle: t('sortie.deputy.title'),
            deputyName: t('sortie.none'),
            deputyInfo: t('sortie.deputy.info'),
            prevDeputyLabel: t('sortie.prev'),
            clearDeputyLabel: t('sortie.none'),
            nextDeputyLabel: t('sortie.next'),
            sortieSummary: '',
            sortiePredict: '',
            sortieNotice: this._notice,
            recommendLabel: t('sortie.recommend'),
            recommendReasonLabel: this._reasonLines.length > 0 ? this._reasonLines.join('\n') : t('sortie.recommend.hint'),
            savePresetLabel: t('sortie.preset.save'),
            applyPresetLabel: t('sortie.preset.apply'),
            confirmSortieLabel: t('sortie.confirm'),
            sceneGambitToggleLabel: '',
        };
        this._deckSlotTexts(texts);
        const actives: Record<string, boolean> = {
            sortiePanel: commander !== null,
            sortieEmptyHint: commander === null,
            btnToggleSceneGambit: false,
        };
        const enabled: Record<string, boolean> = {
            btnCloseSortie: true,
            btnToggleSceneGambit: true,
            btnPickLead: true,
            btnPickDeck: true,
            btnRecommend: this._canRecommend(),
            btnConfirmSortie: commander !== null,
            btnPrevStrategist: false,
            btnNextStrategist: false,
            btnClearStrategist: false,
            btnPrevDeputy: false,
            btnNextDeputy: false,
            btnClearDeputy: false,
            btnSavePreset: false,
            btnApplyPreset: false,
        };
        if (!commander) {
            return { commanderId: null, texts, actives, enabled };
        }

        const summary = this._deps.session.getSortieSupportSummary(commander.id);
        texts.sortieCommander = t('sortie.commander', commander.name, String(statOf(commander, 'lea')));
        if (summary.strategist) {
            const s = summary.strategist;
            const b = summary.strategistBonus;
            texts.strategistName = s.name;
            texts.strategistInfo = t(
                'sortie.strategist.detail',
                String(statOf(s, 'int')),
                String(statOf(s, 'pol')),
                String(b.maxTacticBonus),
                String(b.startTacticBonus),
                t(TACTIC_POINTS_NOTE_KEY),
            );
        }
        if (summary.deputy) {
            const d = summary.deputy;
            texts.deputyName = d.name;
            texts.deputyInfo = t(
                'sortie.deputy.detail',
                String(statOf(d, 'lea')),
                String(statOf(d, 'pol')),
                String(summary.deputyBonus.startingFoodBonus),
            );
        }

        const input = this._deps.session.getSortieInput(commander.id);
        if (input) {
            const pool = computeSortiePoolMax(input.commandCapacity, input.cityTroops, input.stageSortieCap);
            const bonus = input.foodBonus ?? 0;
            const shortage = sortieShortageNotice(pool);
            texts.sortieSummary = t(
                'sortie.summary',
                String(pool + sortieGuaranteeOf(pool)),
                String(input.food + bonus),
                bonus > 0 ? t('sortie.summary.foodBonus', String(bonus)) : '',
                String(input.cityTroops),
            ) + (shortage ? `\n${shortage}` : '');
        }

        texts.sortiePredict = sortiePredictText(commander, this._deps.getEnemyGeneral?.() ?? null);

        const gambit = this._deps.session.pendingSceneGambit;
        if (gambit) {
            actives.btnToggleSceneGambit = true;
            texts.sceneGambitToggleLabel = sceneGambitToggleText(gambit.tactic, !gambit.disarmed);
        }

        const strategistOptions = this.options('strategist').length;
        const deputyOptions = this.options('deputy').length;
        enabled.btnPrevStrategist = strategistOptions > 1;
        enabled.btnNextStrategist = strategistOptions > 1;
        enabled.btnClearStrategist = summary.strategist !== null;
        enabled.btnPrevDeputy = deputyOptions > 1;
        enabled.btnNextDeputy = deputyOptions > 1;
        enabled.btnClearDeputy = summary.deputy !== null;
        enabled.btnSavePreset = this._deps.presets !== undefined;
        enabled.btnApplyPreset = this._deps.presets !== undefined && this._deps.presets.get()[commander.id] !== undefined;
        return { commanderId: commander.id, texts, actives, enabled };
    }

    /** 出戰卡組 4 槽的文字：有手動卡組就依序顯示；沒有時顯示預設（目錄前幾張）並標註「預設」 */
    private _deckSlotTexts(texts: Record<string, string>): void {
        const cards = this._deps.prebattle?.cards() ?? [];
        const manual = this._deps.session.deck;
        const useDefault = manual.length === 0;
        const ids = useDefault ? cards.slice(0, PLAYER_DECK_MAX_SIZE).map((c) => c.cardId) : manual;
        for (let slot = 0; slot < PLAYER_DECK_MAX_SIZE; slot += 1) {
            const id = ids[slot];
            const card = id === undefined ? undefined : cards.find((c) => c.cardId === id);
            if (!card) {
                texts[`deckSlotLabel${slot}`] = this._t('sortie.deck.empty');
                continue;
            }
            texts[`deckSlotLabel${slot}`] = useDefault ? `${card.name}（${this._t('sortie.deck.default')}）` : card.name;
        }
    }

    private _canRecommend(): boolean {
        const prebattle = this._deps.prebattle;
        return prebattle !== undefined && prebattle.weights !== null && this._deps.session.getDeployableGenerals().length > 0;
    }

    /** 切換任務戰法加成的勾選；沒有待發動時不變更 */
    async toggleSceneGambit(): Promise<void> {
        const gambit = this._deps.session.pendingSceneGambit;
        if (gambit) await this._deps.session.setPendingSceneGambitArmed(Boolean(gambit.disarmed));
    }

    /**
     * 一鍵推薦編制（PROG-2-9911）：依 PreBattleRecommend 推薦主將、參謀官、後勤官與出戰卡組，寫入 session，並記下每個選擇的理由。
     * 候選不足時仍套用能填的部分，並把缺口列在通知裡；沒有可出戰主將時不改動任何東西。
     */
    async recommend(): Promise<boolean> {
        const t = (key: string, ...args: string[]) => this._t(key, ...args);
        const prebattle = this._deps.prebattle;
        this._reasonLines = [];
        if (!prebattle || !prebattle.weights) {
            this._notice = t('sortie.recommend.unavailable');
            return false;
        }
        const generals = this._deps.session.getDeployableGenerals();
        const cards = prebattle.cards();
        const toCandidate = (g: GeneralConfig): PreBattleCommanderCandidate => ({
            id: g.id,
            str: statOf(g, 'str'),
            int: statOf(g, 'int'),
            lea: statOf(g, 'lea'),
            pol: statOf(g, 'pol'),
            bloodlineId: g.bloodlineId,
        });
        const roster: PreBattleRosterInput = {
            commanders: generals.map(toCandidate),
            strategists: generals.map(toCandidate),
            deputies: generals.map(toCandidate),
            tallies: cards.map((c) => ({ cardId: c.cardId, unitType: c.unitType, rarity: c.rarity })),
        };
        const encounterId = prebattle.currentEncounterId();
        const rec: PreBattleRecommendation = encounterId
            ? recommendForEncounter(encounterId, roster, prebattle.encounters(), prebattle.weights)
            : recommendPreBattleLoadout(roster, prebattle.weights);
        const issueText = rec.issues.map((i) => t(`prebattle.issue.${i}`)).join('、');
        if (!rec.commander) {
            this._notice = issueText || t('sortie.recommend.failed');
            return false;
        }
        const nameOf = (id: string): string => generals.find((g) => g.id === id)?.name ?? id;
        const line = (role: string, name: string, reasonKey: string): string => t('sortie.recommend.line', role, name, t(reasonKey));

        if (this._deps.session.leadGeneralId !== rec.commander.id && !(await this._deps.session.setLeadGeneral(rec.commander.id))) {
            this._notice = t('sortie.recommend.failed');
            return false;
        }
        this._reasonLines.push(line(t('prebattle.role.commander'), nameOf(rec.commander.id), rec.commander.reasonKey));
        const check = this._deps.session.setSortieSupport(rec.strategist?.id ?? null, rec.deputy?.id ?? null);
        if (rec.strategist) this._reasonLines.push(line(t('prebattle.role.strategist'), nameOf(rec.strategist.id), rec.strategist.reasonKey));
        if (rec.deputy) this._reasonLines.push(line(t('prebattle.role.deputy'), nameOf(rec.deputy.id), rec.deputy.reasonKey));
        if (rec.tallyCards.length > 0) {
            const names = rec.tallyCards.map((p) => cards.find((c) => c.cardId === p.cardId)?.name ?? p.cardId);
            await this._deps.session.setDeck(rec.tallyCards.map((p) => p.cardId), cards.map((c) => c.cardId));
            this._reasonLines.push(line(t('sortie.deck.label'), names.join('、'), rec.tallyCards[0].reasonKey));
        }
        const supportIssue = check.ok ? '' : check.issues.map((i) => SORTIE_LOADOUT_ISSUE_TEXT[i]).join('、');
        const gaps = [issueText, supportIssue].filter((s) => s.length > 0).join('、');
        this._notice = gaps ? `${t('sortie.recommend.done')}（${gaps}）` : t('sortie.recommend.done');
        return true;
    }

    /** 把目前的參謀官 / 後勤官存成這位主將的編制預設（DEP-14）；沒有預設儲存時回傳 false */
    savePreset(): boolean {
        const commander = this.commander();
        const store = this._deps.presets;
        if (!commander || !store) return false;
        store.set(savePresetFor(store.get(), commander.id, this._effective(commander.id)));
        this._notice = this._t('sortie.preset.saved');
        return true;
    }

    /**
     * 套用這位主將的編制預設（DEP-14 推薦）：只保留仍可出戰的人選，失效的欄位改為不派。
     * 回傳是否套用成功；沒有預設或預設全部失效時回傳 false，不改動目前編制。
     */
    applyPreset(): boolean {
        const commander = this.commander();
        const store = this._deps.presets;
        if (!commander || !store) return false;
        const deployableIds = new Set(this._deps.session.getDeployableGenerals().map((g) => g.id));
        const resolved = resolvePreset(store.get()[commander.id], commander.id, deployableIds);
        if (!hasUsablePreset(resolved)) {
            this._notice = this._t('sortie.preset.unavailable');
            return false;
        }
        const check = this._deps.session.setSortieSupport(resolved.strategistUid, resolved.deputyUid);
        this._notice = check.ok ? this._t('sortie.preset.applied') : check.issues.map((i) => SORTIE_LOADOUT_ISSUE_TEXT[i]).join('、');
        return check.ok;
    }

    /** 實際生效的支援（存著但已失效的人，例如後來被改成主將，視為不派） */
    private _effective(commanderId: string): SortieSupport {
        const summary = this._deps.session.getSortieSupportSummary(commanderId);
        return { strategistUid: summary.strategist?.id ?? null, deputyUid: summary.deputy?.id ?? null };
    }

    private _assign(role: SortieRole, uid: string | null): SortieLoadoutCheck {
        const commander = this.commander();
        const support = commander ? this._effective(commander.id) : { strategistUid: null, deputyUid: null };
        return role === 'strategist'
            ? this._deps.session.setSortieSupport(uid, support.deputyUid)
            : this._deps.session.setSortieSupport(support.strategistUid, uid);
    }
}
