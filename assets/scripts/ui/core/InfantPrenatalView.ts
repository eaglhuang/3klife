// @spec-source → 家族子嗣與血統總規格書 shard-d「幼兒近況小卡」、結緣系統 shard-d「待產倒數與胎教祈福」（PROG-2-10235）
/**
 * InfantPrenatalView — 祠堂畫面「幼兒近況＋摸頭」與「待產倒數＋胎教祈福」兩塊的檢視模型（純邏輯，不依賴 cc）。
 * 次數、好感、扣款都在權威端（family.infantCare／patInfant／prenatalStatus／prenatalBlessing）；這裡只照結果顯示。
 */
import type { FamilyInfantCareResult, FamilyPrenatalStatusResult } from '../../shared/api/ApiCommands';
import { infantAnecdoteLine } from '../../core/systems/BloodlineInfantCare';
import { prenatalCountdownLine } from '../../core/systems/MarriagePrenatalBlessing';
import type { ChildTalkTranslate, ChildTalkView } from './ChildTalkView';

export const INFANT_PAT_BUTTON_ID = 'btnInfantPat';
export const PRENATAL_BLESS_BUTTON_ID = 'btnPrenatalBlessing';
export const INFANT_LINE_ID = 'shrineInfantLine';
export const PRENATAL_LINE_ID = 'shrinePrenatalLine';

export interface InfantPrenatalViewInput {
    infant: FamilyInfantCareResult | null;
    /** 祠堂目前選到的孩子 id（只有 0～4 歲才顯示小卡） */
    childId: string | null;
    /** 剛摸完的回應（只對同一位孩子顯示） */
    lastPat: { childId: string; line: string } | null;
    prenatal: FamilyPrenatalStatusResult | null;
    t: ChildTalkTranslate;
}

export function infantPrenatalView(input: Readonly<InfantPrenatalViewInput>): ChildTalkView {
    const { t } = input;
    const lookup = (key: string): string => t(key);
    const infant = input.infant?.infants.find((c) => c.id === input.childId);
    const mother = input.prenatal?.mothers[0];
    const texts: Record<string, string> = {};
    const actives: Record<string, boolean> = {
        [INFANT_LINE_ID]: !!infant,
        [INFANT_PAT_BUTTON_ID]: !!infant,
        [PRENATAL_LINE_ID]: !!mother,
        [PRENATAL_BLESS_BUTTON_ID]: !!mother,
    };
    const enabled: Record<string, boolean> = { [INFANT_PAT_BUTTON_ID]: false, [PRENATAL_BLESS_BUTTON_ID]: false };
    if (infant && input.infant) {
        const shown = input.lastPat && input.lastPat.childId === infant.id ? input.lastPat.line : '';
        texts[INFANT_LINE_ID] = shown !== '' ? shown : infantAnecdoteLine(lookup, infant.id, infant.name, infant.gender, input.infant.season);
        texts.btnInfantPatLabel = infant.patsLeft > 0 ? t('ui.bloodline.infant_pat_btn') : t('ui.bloodline.infant_pat_done_btn');
        enabled[INFANT_PAT_BUTTON_ID] = infant.patsLeft > 0;
    }
    if (mother && input.prenatal) {
        texts[PRENATAL_LINE_ID] = prenatalCountdownLine(lookup, mother.remainingSeasons, mother.name, mother.gender);
        texts.btnPrenatalBlessingLabel = mother.blessed ? t('ui.marriage.prenatal_bless_done_btn') : t('ui.marriage.prenatal_bless_btn', String(input.prenatal.costSilver));
        enabled[PRENATAL_BLESS_BUTTON_ID] = !mother.blessed;
    }
    return { texts, actives, enabled };
}
