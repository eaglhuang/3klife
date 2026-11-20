/**
 * MissionDefinitionParser — 把 JSON 驗證成 MissionDefinition，一次回報全部問題（不是遇錯即停）
 *
 * 另外保證：每個隱藏變體在情報 0～100 每一點都能選到分支（找不到分支視為定義錯誤）。
 */
import { MISSION_DIFFICULTIES } from './MissionBalance';
import { selectBranch } from './MissionBranch';
import { MISSION_EFFECT_KINDS, MISSION_STAT_KEYS, MISSION_TIERS } from './MissionTypes';
import type { MissionDefinition } from './MissionTypes';

export interface MissionParseIssue { path: string; message: string }
export type MissionParseResult =
    | { ok: true; def: MissionDefinition; issues: [] }
    | { ok: false; def: null; issues: MissionParseIssue[] };

export interface ParseOptions {
    /** 宿主額外註冊的效果種類 */
    extraEffectKinds?: readonly string[];
}

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0;

export function parseMissionDefinition(raw: unknown, opts: ParseOptions = {}): MissionParseResult {
    const issues: MissionParseIssue[] = [];
    const bad = (path: string, message: string): void => { issues.push({ path, message }); };
    const effectKinds = new Set<string>([...MISSION_EFFECT_KINDS, ...(opts.extraEffectKinds ?? [])]);

    if (!isObj(raw)) return { ok: false, def: null, issues: [{ path: '$', message: '定義必須是物件' }] };
    if (raw.schema !== 'mission-def.v1') bad('schema', '必須是 "mission-def.v1"');
    if (!isStr(raw.id)) bad('id', '缺少 id');
    if (!isNum(raw.version)) bad('version', 'version 必須是數字');
    if (!isStr(raw.theme)) bad('theme', '缺少 theme');
    if (!(MISSION_DIFFICULTIES as readonly string[]).includes(raw.difficulty as string)) bad('difficulty', `難度必須是 ${MISSION_DIFFICULTIES.join('/')}`);
    if (!Array.isArray(raw.tags) || raw.tags.some(t => typeof t !== 'string')) bad('tags', 'tags 必須是字串陣列');
    if (!isObj(raw.text) || !isStr(raw.text.title) || !isStr(raw.text.brief)) bad('text', '需要 text.title 與 text.brief');

    const stats = new Set<string>(MISSION_STAT_KEYS);
    const checkStats = (path: string, v: unknown): void => {
        if (!isObj(v)) { bad(path, 'keyStats 必須是物件'); return; }
        for (const k of Object.keys(v)) {
            if (!stats.has(k)) bad(`${path}.${k}`, `不認得的屬性 ${k}`);
            else if (!isNum(v[k]) || (v[k] as number) < 0) bad(`${path}.${k}`, '權重必須是非負數');
        }
    };

    const req = raw.requirement;
    if (!isObj(req)) bad('requirement', '缺少 requirement');
    else {
        if (!isNum(req.slots) || req.slots < 1) bad('requirement.slots', 'slots 必須 >= 1');
        checkStats('requirement.keyStats', req.keyStats);
    }
    const timing = raw.timing;
    if (!isObj(timing) || !isNum(timing.durationSeasons) || timing.durationSeasons < 1 || !isNum(timing.expireSeasons) || timing.expireSeasons < 1) {
        bad('timing', 'timing 需要 durationSeasons、expireSeasons（>= 1）');
    }

    const variantIds: string[] = [];
    if (!Array.isArray(raw.variants) || raw.variants.length === 0) bad('variants', '至少要有一個變體');
    else {
        raw.variants.forEach((v, i) => {
            if (!isObj(v) || !isStr(v.id)) { bad(`variants[${i}]`, '變體需要 id'); return; }
            if (!isNum(v.weight) || v.weight <= 0) bad(`variants[${i}].weight`, '權重必須 > 0');
            if (variantIds.includes(v.id)) bad(`variants[${i}].id`, `變體 id 重複：${v.id}`);
            variantIds.push(v.id);
        });
    }

    const intel = raw.intel;
    if (!isObj(intel) || !isNum(intel.initial) || intel.initial < 0 || intel.initial > 100 || !isNum(intel.jitter) || intel.jitter < 0) {
        bad('intel', 'intel 需要 initial（0～100）與 jitter（>= 0）');
    }

    if (raw.facts !== undefined) {
        if (!Array.isArray(raw.facts)) bad('facts', 'facts 必須是陣列');
        else raw.facts.forEach((f, i) => {
            const p = `facts[${i}]`;
            if (!isObj(f) || !isStr(f.key) || !isStr(f.label)) { bad(p, '事實需要 key、label'); return; }
            if (!Array.isArray(f.levels) || f.levels.length === 0) { bad(`${p}.levels`, '至少一個揭露層'); return; }
            let last = -1;
            f.levels.forEach((lv, j) => {
                if (!isObj(lv) || !isNum(lv.minIntel) || !isStr(lv.text)) bad(`${p}.levels[${j}]`, '需要 minIntel 與 text');
                else {
                    if (lv.minIntel <= last) bad(`${p}.levels[${j}].minIntel`, 'minIntel 必須嚴格遞增');
                    last = lv.minIntel;
                }
            });
            if (f.decoy !== undefined && !isStr(f.decoy)) bad(`${p}.decoy`, 'decoy 必須是非空字串');
        });
    }

    // 結果樹
    const checkEffect = (e: unknown, path: string): void => {
        if (!isObj(e) || !isStr(e.kind)) { bad(path, '效果需要 kind'); return; }
        if (!effectKinds.has(e.kind)) { bad(`${path}.kind`, `未註冊的效果種類 ${e.kind}`); return; }
        const amountOk = (v: unknown): boolean => isNum(v) || (isObj(v) && isNum(v.base) && ['reward', 'risk', 'none'].includes(v.mulKey as string));
        switch (e.kind) {
            case 'resource':
                if (!['grain', 'troops', 'silver'].includes(e.res as string)) bad(`${path}.res`, '資源必須是 grain/troops/silver');
                if (!amountOk(e.amount)) bad(`${path}.amount`, 'amount 必須是數字或 {base,mulKey}');
                break;
            case 'generalExp': case 'fame': case 'officerExp':
                if (!amountOk(e.amount)) bad(`${path}.amount`, 'amount 必須是數字或 {base,mulKey}');
                break;
            case 'morale':
                if (!amountOk(e.delta)) bad(`${path}.delta`, 'delta 必須是數字或 {base,mulKey}');
                break;
            case 'relation':
                if (!isStr(e.target) || !isNum(e.delta)) bad(path, 'relation 需要 target 與 delta');
                break;
            case 'generalState':
                if (!['injured', 'captured', 'exhausted'].includes(e.state as string) || !isNum(e.seasons) || e.seasons < 1) bad(path, 'generalState 需要 state 與 seasons（>= 1）');
                break;
            case 'trait':
                if (!isStr(e.add) && !isStr(e.remove)) bad(path, 'trait 需要 add 或 remove');
                break;
            case 'flag':
                if (!isStr(e.set) && !isStr(e.inc)) bad(path, 'flag 需要 set 或 inc');
                break;
            case 'spawn':
                if (!isStr(e.defId)) bad(`${path}.defId`, 'spawn 需要 defId');
                break;
            case 'intel':
                if (!isObj(e.target) || !isNum(e.delta)) bad(path, 'intel 需要 target 與 delta');
                break;
            case 'unlock': case 'sceneGambit':
                if (!isStr(e.id)) bad(`${path}.id`, '需要 id');
                break;
            case 'memoryNote':
                if (!isStr(e.tag) || !isStr(e.text)) bad(path, 'memoryNote 需要 tag 與 text');
                break;
            default: break;
        }
    };
    const SWITCH_ON = /^(variant|intel|generalTag|flag:\w+|fact:\w+|stat:\w+(?:(?:>=|<=|>|<)-?\d+(?:\.\d+)?)?)$/;
    const ratio = (v: unknown): boolean => isNum(v) && v >= 0 && v <= 1;
    const checkNode = (n: unknown, path: string): void => {
        if (!isObj(n)) { bad(path, '節點必須是物件'); return; }
        switch (n.kind) {
            case 'roll':
                if (n.p !== undefined && !ratio(n.p)) bad(`${path}.p`, 'p 必須在 0～1');
                if (!ratio(n.critRatio)) bad(`${path}.critRatio`, 'critRatio 必須在 0～1');
                if (!ratio(n.disasterRatio)) bad(`${path}.disasterRatio`, 'disasterRatio 必須在 0～1');
                if (!isObj(n.tiers)) bad(`${path}.tiers`, '需要四級 tiers');
                else for (const t of MISSION_TIERS) {
                    if (n.tiers[t] === undefined) bad(`${path}.tiers.${t}`, `缺少 ${t}`);
                    else checkNode(n.tiers[t], `${path}.tiers.${t}`);
                }
                break;
            case 'chance':
                if (!ratio(n.p)) bad(`${path}.p`, 'p 必須在 0～1');
                checkNode(n.hit, `${path}.hit`);
                checkNode(n.miss, `${path}.miss`);
                break;
            case 'switch':
                if (typeof n.on !== 'string' || !SWITCH_ON.test(n.on)) bad(`${path}.on`, `不合法的 on：${String(n.on)}`);
                if (!Array.isArray(n.cases) || n.cases.length === 0) bad(`${path}.cases`, '至少一個 case');
                else n.cases.forEach((c, i) => {
                    if (!isObj(c) || (c.when === undefined && c.eq === undefined && !isNum(c.gte))) bad(`${path}.cases[${i}]`, 'case 需要 when 或 gte');
                    else checkNode(c.then, `${path}.cases[${i}].then`);
                });
                if (n.else !== undefined) checkNode(n.else, `${path}.else`);
                break;
            case 'seq':
                if (!Array.isArray(n.nodes)) bad(`${path}.nodes`, 'seq 需要 nodes 陣列');
                else n.nodes.forEach((c, i) => checkNode(c, `${path}.nodes[${i}]`));
                break;
            case 'effects':
                if (!Array.isArray(n.effects)) bad(`${path}.effects`, 'effects 需要陣列');
                else n.effects.forEach((e, i) => checkEffect(e, `${path}.effects[${i}]`));
                break;
            default:
                bad(`${path}.kind`, `不認得的節點種類 ${String(n.kind)}`);
        }
    };

    // 分支
    const branchIds: string[] = [];
    if (!Array.isArray(raw.branches) || raw.branches.length === 0) bad('branches', '至少一個分支');
    else {
        raw.branches.forEach((b, i) => {
            const p = `branches[${i}]`;
            if (!isObj(b) || !isStr(b.id)) { bad(p, '分支需要 id'); return; }
            if (branchIds.includes(b.id)) bad(`${p}.id`, `分支 id 重複：${b.id}`);
            branchIds.push(b.id);
            const w = b.when;
            if (!isObj(w) || !isNum(w.minIntel) || w.minIntel < 0) bad(`${p}.when`, 'when.minIntel 必填（>= 0）');
            else {
                if (w.maxIntel !== undefined && (!isNum(w.maxIntel) || w.maxIntel < w.minIntel)) bad(`${p}.when.maxIntel`, 'maxIntel 必須 >= minIntel');
                if (w.variant !== undefined) {
                    if (!Array.isArray(w.variant)) bad(`${p}.when.variant`, 'variant 必須是陣列');
                    else for (const v of w.variant) if (!variantIds.includes(v as string)) bad(`${p}.when.variant`, `未定義的變體 ${String(v)}`);
                }
            }
            if (!isObj(b.objective) || !isStr(b.objective.id) || !isStr(b.objective.text)) bad(`${p}.objective`, '需要 objective.id 與 text');
            else if (b.objective.keyStats !== undefined) checkStats(`${p}.objective.keyStats`, b.objective.keyStats);
            if (!isObj(b.presented)) bad(`${p}.presented`, '需要 presented');
            const m = b.modifiers;
            if (!isObj(m) || !isNum(m.successDelta) || !isNum(m.rewardMul) || m.rewardMul < 0 || !isNum(m.riskMul) || m.riskMul < 0) {
                bad(`${p}.modifiers`, 'modifiers 需要 successDelta、rewardMul（>= 0）、riskMul（>= 0）');
            }
            checkNode(b.outcome, `${p}.outcome`);
        });
    }

    if (issues.length > 0) return { ok: false, def: null, issues };

    // 覆蓋檢查：每個變體在情報 0～100 每一點、無旗標／特質下都要選得到分支
    const def = raw as unknown as MissionDefinition;
    for (const v of def.variants) {
        for (let intelV = 0; intelV <= 100; intelV += 1) {
            if (!selectBranch(def, { variant: v.id, intel: intelV, flags: {}, generalTags: [] })) {
                bad('branches', `變體 ${v.id} 在情報 ${intelV} 找不到分支（每個變體須有 minIntel:0 的保底分支並涵蓋 0～100）`);
                break;
            }
        }
    }
    if (issues.length > 0) return { ok: false, def: null, issues };
    return { ok: true, def, issues: [] };
}
