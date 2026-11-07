// @spec-source → 兵種（虎符）系統.md (doc_spec_0012) §G 劇本相關；PROG-2-1768
/**
 * TallyScripts — 虎符產出、升星與傳奇部隊部署時顯示的文字（純邏輯，不依賴 cc）。
 *
 * Unity 對照：像一份 Localization Table 的格式化函式，畫面只拿結果字串。
 */
import { resolveTallyTemplateId } from '../config/TigerTallySpecTactics';
import { formatTallyLine, type TallyLine } from './TallyLineSpec';

const TALLY_NAME_PREFIX = '虎符：';

/** 傳奇部隊部署句的 i18n Key（PROG-2-1987） */
const LEGEND_DEPLOY_KEYS: Readonly<Record<string, string>> = {
    'tiger-tally-bai-ma': 'SCRIPT_TALLY_BAI_MA',
    'tiger-tally-bai-ma-yi-cong': 'SCRIPT_TALLY_BAI_MA',
    'tiger-tally-xian-zhen': 'SCRIPT_TALLY_XIAN_ZHEN',
};

/** 規格句已帶「虎符：」前綴，名稱本身有前綴時不重複 */
/** 規格句已帶「虎符：」前綴，參數只放去掉前綴的名稱 */
export function tallyProducedSpec(generalName: string, tallyName: string): TallyLine {
    const bare = tallyName.startsWith(TALLY_NAME_PREFIX) ? tallyName.slice(TALLY_NAME_PREFIX.length) : tallyName;
    return { key: 'SCRIPT_TALLY_PRODUCED', args: [generalName, bare] };
}

export function tallyProducedLine(generalName: string, tallyName: string): string {
    return formatTallyLine(tallyProducedSpec(generalName, tallyName));
}

export function tallyStarUpSpec(tallyName: string, star: number, troopName: string): TallyLine {
    return { key: 'SCRIPT_TALLY_STAR_UP', args: [tallyName, String(star), troopName] };
}

export function tallyStarUpLine(tallyName: string, star: number, troopName: string): string {
    return formatTallyLine(tallyStarUpSpec(tallyName, star, troopName));
}

/** 傳奇部隊部署句；其他虎符回 null */
export function tallyLegendDeploySpec(templateId: string | null | undefined): TallyLine | null {
    if (!templateId) return null;
    const key = LEGEND_DEPLOY_KEYS[templateId] ?? LEGEND_DEPLOY_KEYS[resolveTallyTemplateId(templateId)];
    return key ? { key, args: [] } : null;
}

export function tallyLegendDeployLine(templateId: string | null | undefined): string | null {
    const spec = tallyLegendDeploySpec(templateId);
    return spec ? formatTallyLine(spec) : null;
}
