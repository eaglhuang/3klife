// @spec-source → 治理模式他國AI系統 §E-10.1 全球遠征外敵壓力源、External_Power 資料表；大廳系統 World_Sandtable.Expedition_Dossiers（RAI-16，PROG-2-1968）
/**
 * ExternalPowerDossier — S3 全球遠征的異域壓力源與沙盤遠征檔案（純邏輯，不依賴 cc）。
 *
 * - 三類異域壓力源：草原霸權（西北）、海上商盟（海上）、西方遠征軍（西方）。不是完整 AINation。
 * - dossier_state：LOCKED_TEASER（只露方位與剪影）→ REVEALED（名稱與威脅等級）→ ACTIVE（戰線開啟）。
 * - 依沙盤階段推導：S1 或未解鎖不顯示；S2 先以 LOCKED_TEASER 預告（大廳範例 S2_BORDER 已有 teaser）；
 *   S3 起 REVEALED；呼叫端標記開戰後才 ACTIVE。狀態只進不退。
 *
 * 暫定：各壓力源威脅等級與預告文案規格未給；升格成完整 AINation 的條件另卡。
 * Unity 對照：像任務日誌裡「???」→ 揭露 → 進行中的三段式條目。
 */
import type { SandtableStage } from './SandtableMarkers';

export type ExternalPowerId = 'STEPPE_HEGEMONY' | 'SEA_MERCHANT_LEAGUE' | 'WESTERN_EXPEDITION';
export type ExternalFrontier = 'NORTHWEST' | 'SEA' | 'WEST';
export type DossierState = 'LOCKED_TEASER' | 'REVEALED' | 'ACTIVE';

export interface ExternalPowerDef {
    id: ExternalPowerId;
    name: string;
    frontier: ExternalFrontier;
    frontierLabel: string;
    /** 世界沙盤威脅等級（暫定） */
    pressureLevel: number;
}

export const EXTERNAL_POWERS: readonly ExternalPowerDef[] = [
    { id: 'STEPPE_HEGEMONY', name: '草原霸權', frontier: 'NORTHWEST', frontierLabel: '西北', pressureLevel: 3 },
    { id: 'SEA_MERCHANT_LEAGUE', name: '海上商盟', frontier: 'SEA', frontierLabel: '海上', pressureLevel: 2 },
    { id: 'WESTERN_EXPEDITION', name: '西方遠征軍', frontier: 'WEST', frontierLabel: '西方', pressureLevel: 4 },
];

const STATE_ORDER: readonly DossierState[] = ['LOCKED_TEASER', 'REVEALED', 'ACTIVE'];

/** 沙盤階段 + 是否開戰 → 檔案狀態；null 表示不顯示。已記錄的狀態不倒退。 */
export function dossierStateOf(
    stage: SandtableStage | null, engaged: boolean, previous: DossierState | null = null,
): DossierState | null {
    let next: DossierState | null = null;
    if (stage === 'S2') next = 'LOCKED_TEASER';
    if (stage === 'S3') next = engaged ? 'ACTIVE' : 'REVEALED';
    if (!previous) return next;
    if (!next) return previous;
    return STATE_ORDER.indexOf(previous) >= STATE_ORDER.indexOf(next) ? previous : next;
}

export interface ExpeditionDossierView {
    dossierId: string;
    powerId: ExternalPowerId;
    frontier: ExternalFrontier;
    state: DossierState;
    title: string;
    threatText: string;
}

/** 單一檔案的顯示文字：預告只給方位，揭露後給名稱與威脅等級。 */
export function dossierViewOf(power: ExternalPowerDef, state: DossierState): ExpeditionDossierView {
    const teaser = state === 'LOCKED_TEASER';
    return {
        dossierId: `DOSSIER_${power.id}`,
        powerId: power.id,
        frontier: power.frontier,
        state,
        title: teaser ? `${power.frontierLabel}異動（未明）` : power.name,
        threatText: teaser ? '威脅：？' : state === 'ACTIVE' ? `戰線開啟｜威脅 ${power.pressureLevel}` : `威脅 ${power.pressureLevel}`,
    };
}

/** 沙盤檔案列：依階段、開戰清單、既有狀態推導三類壓力源的檔案；不顯示的略過。 */
export function expeditionDossiers(
    stage: SandtableStage | null,
    engagedIds: readonly ExternalPowerId[] = [],
    previous: Readonly<Partial<Record<ExternalPowerId, DossierState>>> = {},
): ExpeditionDossierView[] {
    const views: ExpeditionDossierView[] = [];
    for (const power of EXTERNAL_POWERS) {
        const state = dossierStateOf(stage, engagedIds.includes(power.id), previous[power.id] ?? null);
        if (state) views.push(dossierViewOf(power, state));
    }
    return views;
}
