// @spec-source → 戰場部署系統.md (doc_spec_0040) §出征前編制槽（參謀官 / 後勤官）；PROG-2-0070 邏輯、PROG-2-0083 畫面
/**
 * SortieSetupController — 出征編制畫面的流程（純邏輯，不依賴 cc）
 *
 * 職責：
 *   - 以目前出戰主將為中心，挑選參謀官與後勤官（上一位 / 下一位循環，含「不派」）
 *   - 候選人：可出戰、不是主將、不是另一個支援角色；同名血統衝突的會被跳過
 *   - 顯示加成：參謀官計謀點上限 / 開局補點、後勤官軍糧加成，以及本場出征軍勢上限與糧草
 *
 * 所有 texts / actives / enabled 的 key 都等於 sortie-setup-main.json 的節點 id，
 * tests/M5ViewSpec.test.ts 會逐一比對。
 *
 * Unity 對照：隊伍編成畫面的 Presenter，Support Slot 的左右切換只改 session 狀態，再整頁刷新。
 */
import type { GeneralConfig } from '../../core/models/GeneralUnit';
import type { SortieSupport, SortieSupportSummary } from '../../core/managers/GameSession';
import type { MilitaryReserve } from '../../core/systems/MilitaryReserve';
import {
    computeSortiePoolMax,
    SORTIE_LOADOUT_ISSUE_TEXT,
    type CreateSortieInput,
    type SortieLoadoutCheck,
} from '../../core/systems/SortieDeploy';

export type SortieRole = 'strategist' | 'deputy';

export interface SortieSetupView {
    commanderId: string | null;
    texts: Record<string, string>;
    actives: Record<string, boolean>;
    enabled: Record<string, boolean>;
}

export interface SortieSetupDeps {
    session: {
        readonly leadGeneralId: string | null;
        readonly sortieSupport: SortieSupport;
        readonly military: MilitaryReserve;
        getDeployableGenerals(): GeneralConfig[];
        setSortieSupport(strategistUid: string | null, deputyUid: string | null): SortieLoadoutCheck;
        getSortieSupportSummary(commanderUid: string): SortieSupportSummary;
        getSortieInput(generalId: string): CreateSortieInput | null;
    };
}

/** 計謀點已進戰場（PROG-2-0084）：上限與開局補點會套進本場帳本 */
export const TACTIC_POINTS_NOTE = '（進戰場後生效）';

function statOf(g: GeneralConfig, key: 'int' | 'pol' | 'lea'): number {
    return Math.floor(g[key] ?? g.stats?.[key] ?? 0);
}

export class SortieSetupController {
    private _notice = '';

    constructor(private readonly _deps: SortieSetupDeps) {}

    open(): void {
        this._notice = '';
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
        const commander = this.commander();
        const texts: Record<string, string> = {
            sortieTitle: '出征編制',
            sortieEmptyHint: '請先在大廳指定出戰主將，再編制參謀官與後勤官。',
            sortieCommander: '主將：－',
            strategistTitle: '參謀官',
            strategistName: '不派',
            strategistInfo: '提供計謀點上限與開局補點（看智力、政治）',
            deputyTitle: '後勤官',
            deputyName: '不派',
            deputyInfo: '提供軍糧上限與開局補給（看統率、政治）',
            sortieSummary: '',
            sortieNotice: this._notice,
        };
        const actives: Record<string, boolean> = {
            sortiePanel: commander !== null,
            sortieEmptyHint: commander === null,
        };
        const enabled: Record<string, boolean> = {
            btnCloseSortie: true,
            btnPrevStrategist: false,
            btnNextStrategist: false,
            btnClearStrategist: false,
            btnPrevDeputy: false,
            btnNextDeputy: false,
            btnClearDeputy: false,
        };
        if (!commander) {
            return { commanderId: null, texts, actives, enabled };
        }

        const summary = this._deps.session.getSortieSupportSummary(commander.id);
        texts.sortieCommander = `主將：${commander.name}（統率 ${statOf(commander, 'lea')}）`;
        if (summary.strategist) {
            const s = summary.strategist;
            const b = summary.strategistBonus;
            texts.strategistName = s.name;
            texts.strategistInfo = `智力 ${statOf(s, 'int')} · 政治 ${statOf(s, 'pol')} → 計謀點上限 +${b.maxTacticBonus}、開局 +${b.startTacticBonus}${TACTIC_POINTS_NOTE}`;
        }
        if (summary.deputy) {
            const d = summary.deputy;
            texts.deputyName = d.name;
            texts.deputyInfo = `統率 ${statOf(d, 'lea')} · 政治 ${statOf(d, 'pol')} → 軍糧 +${summary.deputyBonus.startingFoodBonus}`;
        }

        const input = this._deps.session.getSortieInput(commander.id);
        if (input) {
            const pool = computeSortiePoolMax(input.commandCapacity, input.cityTroops, input.stageSortieCap);
            const bonus = input.foodBonus ?? 0;
            texts.sortieSummary = `出征軍勢上限 ${pool} · 糧草 ${input.food + bonus}${bonus > 0 ? `（後勤 +${bonus}）` : ''} · 城市兵源 ${input.cityTroops}`;
        }

        const strategistOptions = this.options('strategist').length;
        const deputyOptions = this.options('deputy').length;
        enabled.btnPrevStrategist = strategistOptions > 1;
        enabled.btnNextStrategist = strategistOptions > 1;
        enabled.btnClearStrategist = summary.strategist !== null;
        enabled.btnPrevDeputy = deputyOptions > 1;
        enabled.btnNextDeputy = deputyOptions > 1;
        enabled.btnClearDeputy = summary.deputy !== null;
        return { commanderId: commander.id, texts, actives, enabled };
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
