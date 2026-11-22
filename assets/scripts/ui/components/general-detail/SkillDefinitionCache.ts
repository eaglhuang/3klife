// @spec-source → 戰法系統.md (doc_spec_0038)、奧義系統.md (doc_spec_0030)
/**
 * SkillDefinitionCache — 武將詳情各分頁共用的戰法／奧義定義快取（同一 Promise 只載一次）。
 *
 * 戰法與奧義的說明資料只從 tactic-library、ultimate-definitions 讀，不在 UI 另寫一份。
 */
import { services } from '../../../core/managers/ServiceLoader';
import {
    buildIdMap,
    type CanonicalTacticDefinition,
    type CanonicalUltimateDefinition,
    type JsonListEnvelope,
} from '../../../shared/SkillRuntimeContract';

let tacticDefinitionMapPromise: Promise<Map<string, CanonicalTacticDefinition>> | null = null;
let ultimateDefinitionMapPromise: Promise<Map<string, CanonicalUltimateDefinition>> | null = null;

export function loadTacticDefinitionMap(): Promise<Map<string, CanonicalTacticDefinition>> {
    if (!tacticDefinitionMapPromise) {
        tacticDefinitionMapPromise = services().resource
            .loadJson<JsonListEnvelope<CanonicalTacticDefinition>>('data/master/tactic-library', { tags: ['ui', 'general-detail'] })
            .then((json) => buildIdMap(json.data));
    }
    return tacticDefinitionMapPromise;
}

export function loadUltimateDefinitionMap(): Promise<Map<string, CanonicalUltimateDefinition>> {
    if (!ultimateDefinitionMapPromise) {
        ultimateDefinitionMapPromise = services().resource
            .loadJson<JsonListEnvelope<CanonicalUltimateDefinition>>('data/master/ultimate-definitions', { tags: ['ui', 'general-detail'] })
            .then((json) => buildIdMap(json.data));
    }
    return ultimateDefinitionMapPromise;
}
