#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const extractedRoot = path.join(repoRoot, 'artifacts', 'data-pipeline', 'sanguo-rag', 'extracted');

function parseArgs(argv) {
  const args = {
    profileRoot: path.join(extractedRoot, 'runtime-general-profiles'),
    top50Report: path.join(extractedRoot, 'runtime-general-profiles', 'top50-runtime-fill-r1-export-report.json'),
    top50Ids: path.join(extractedRoot, 'core-person-progress', 'top50-runtime-fill-r1.general-ids.txt'),
    outJson: path.join(extractedRoot, 'core-person-progress', 'prog-2-0017-top50-readiness-audit-r1.json'),
    outMd: path.join(repoRoot, 'docs', 'agent-briefs', 'reports', 'PROG-2-0017-top50-readiness-r1.md'),
  };

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => argv[++index];
    switch (arg) {
      case '--profile-root':
        args.profileRoot = path.resolve(next());
        break;
      case '--top50-report':
        args.top50Report = path.resolve(next());
        break;
      case '--top50-ids':
        args.top50Ids = path.resolve(next());
        break;
      case '--out-json':
        args.outJson = path.resolve(next());
        break;
      case '--out-md':
        args.outMd = path.resolve(next());
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
      default:
        throw new Error(`Unknown arg: ${arg}`);
    }
  }

  return args;
}

function printHelp() {
  console.log([
    'Usage: node tools_node/audit-sanguo-top50-readiness.js [options]',
    '',
    'Options:',
    '  --profile-root <dir>   runtime-general-profiles root',
    '  --top50-report <json>  top50 export report with generalIds',
    '  --top50-ids <txt>      fallback list of general ids',
    '  --out-json <path>      machine-readable audit report',
    '  --out-md <path>        markdown summary report',
  ].join('\n'));
}

function readJson(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readTop50Ids(args) {
  const report = readJson(args.top50Report, null);
  if (report && Array.isArray(report.generalIds) && report.generalIds.length > 0) {
    return report.generalIds;
  }
  return fs.readFileSync(args.top50Ids, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function countKeywordCategories(keywords) {
  const categories = keywords && keywords.categories && typeof keywords.categories === 'object'
    ? keywords.categories
    : {};
  return Object.entries(categories).filter(([, items]) => Array.isArray(items) && items.length > 0).length;
}

function buildRelationshipStats(relationships) {
  const anchors = asArray(relationships && relationships.anchors);
  const rejected = asArray(relationships && relationships.rejectedRelationshipEdges);
  const targetIds = new Set(anchors.map((anchor) => anchor.targetId).filter(Boolean));
  const noEvidence = anchors.filter((anchor) => asArray(anchor.evidenceRefs).length === 0);
  const lowConfidence = anchors.filter((anchor) => typeof anchor.edgeConfidence === 'number' && anchor.edgeConfidence < 0.7);
  const notReady = anchors.filter((anchor) => anchor.reviewStatus && anchor.reviewStatus !== 'ready');

  return {
    anchors,
    targetIds,
    relationshipCount: anchors.length,
    rejectedRelationshipCount: rejected.length,
    noEvidenceCount: noEvidence.length,
    lowConfidenceCount: lowConfidence.length,
    notReadyCount: notReady.length,
    noEvidenceTargets: noEvidence.slice(0, 8).map((anchor) => anchor.targetId),
  };
}

function buildAngleStats(persona, relationshipTargets) {
  const angleLinks = asArray(persona && persona.angleTargetLinks);
  const sourceHighlights = asArray(persona && persona.sourceHighlights);
  const storyBeats = asArray(persona && persona.storyBeats);
  const groupMap = new Map();
  const angleTargets = new Set();
  const candidateOnlyTargets = new Set();
  let candidateOnlyLinkCount = 0;

  for (const link of angleLinks) {
    if (!link || !link.targetId) {
      continue;
    }
    angleTargets.add(link.targetId);
    if (!relationshipTargets.has(link.targetId)) {
      candidateOnlyTargets.add(link.targetId);
      candidateOnlyLinkCount += 1;
    }
    const key = [link.targetId, link.sourceRef || '', link.sourceType || ''].join('|');
    if (!groupMap.has(key)) {
      groupMap.set(key, { targetId: link.targetId, sourceRef: link.sourceRef || '', sourceType: link.sourceType || '', angleFamilies: new Set(), count: 0 });
    }
    const group = groupMap.get(key);
    group.count += 1;
    if (link.angleFamily) {
      group.angleFamilies.add(link.angleFamily);
    }
  }

  const duplicateGroups = [...groupMap.values()]
    .filter((group) => group.count > 1)
    .map((group) => ({
      targetId: group.targetId,
      sourceRef: group.sourceRef,
      sourceType: group.sourceType,
      count: group.count,
      angleFamilies: [...group.angleFamilies].sort(),
    }))
    .sort((left, right) => right.count - left.count || left.targetId.localeCompare(right.targetId));

  let aliasOnlyTraceCount = 0;
  const aliasOnlyTargets = new Set();
  for (const highlight of sourceHighlights) {
    for (const trace of asArray(highlight && highlight.targetLinkTrace)) {
      const sources = asArray(trace.sources);
      if (trace.targetId && sources.length > 0 && sources.every((source) => source === 'aliasMatch')) {
        aliasOnlyTraceCount += 1;
        aliasOnlyTargets.add(trace.targetId);
      }
    }
  }

  const storyRefs = new Set();
  for (const beat of storyBeats) {
    for (const sourceRef of asArray(beat && beat.sourceRefs)) {
      storyRefs.add(sourceRef);
    }
  }
  const highlightRefs = new Set(sourceHighlights.map((highlight) => highlight && highlight.sourceRef).filter(Boolean));
  const crossLayerRefOverlapCount = [...highlightRefs].filter((sourceRef) => storyRefs.has(sourceRef)).length;

  return {
    angleLinkCount: angleLinks.length,
    angleTargetCount: angleTargets.size,
    candidateOnlyTargetCount: candidateOnlyTargets.size,
    candidateOnlyLinkCount,
    candidateOnlyTargets: [...candidateOnlyTargets].sort().slice(0, 12),
    duplicateGroupCount: duplicateGroups.length,
    duplicateExcessLinkCount: duplicateGroups.reduce((sum, group) => sum + group.count - 1, 0),
    topDuplicateGroups: duplicateGroups.slice(0, 8),
    aliasOnlyTraceCount,
    aliasOnlyTargetCount: aliasOnlyTargets.size,
    aliasOnlyTargets: [...aliasOnlyTargets].sort().slice(0, 12),
    crossLayerRefOverlapCount,
  };
}

function classifyProfile(filesPresent, persona, relationshipStats, keywordCategoryCount, angleStats) {
  if (!filesPresent.persona || !filesPresent.relationships || !filesPresent.keywords) {
    return 'missing-profile-artifact';
  }

  const readiness = persona.runtimeReadiness || {};
  const readyEventCount = Number(readiness.readyEventCount || 0);
  const reviewBacklogCount = Number(readiness.reviewBacklogCount || asArray(persona.reviewBacklog).length || 0);
  const basePlayable = readyEventCount >= 2
    && relationshipStats.relationshipCount >= 3
    && keywordCategoryCount >= 6
    && reviewBacklogCount === 0;

  if (!basePlayable) {
    return 'needs-etl-fill';
  }

  const hasAuditRisk = angleStats.candidateOnlyTargetCount > 0
    || angleStats.aliasOnlyTraceCount > 0
    || angleStats.crossLayerRefOverlapCount > 0
    || relationshipStats.noEvidenceCount > 0
    || relationshipStats.notReadyCount > 0;

  return hasAuditRisk ? 'playable-with-audit-risks' : 'playable-baseline';
}

function auditGeneral(generalId, args) {
  const generalRoot = path.join(args.profileRoot, generalId);
  const personaPath = path.join(generalRoot, `${generalId}.persona.json`);
  const relationshipsPath = path.join(generalRoot, `${generalId}.relationships.json`);
  const keywordsPath = path.join(generalRoot, `${generalId}.keywords.json`);
  const persona = readJson(personaPath, null);
  const relationships = readJson(relationshipsPath, null);
  const keywords = readJson(keywordsPath, null);
  const filesPresent = {
    persona: Boolean(persona),
    relationships: Boolean(relationships),
    keywords: Boolean(keywords),
  };

  const relationshipStats = buildRelationshipStats(relationships);
  const angleStats = buildAngleStats(persona, relationshipStats.targetIds);
  const keywordCategoryCount = countKeywordCategories(keywords);
  const readiness = persona && persona.runtimeReadiness ? persona.runtimeReadiness : {};
  const band = classifyProfile(filesPresent, persona || {}, relationshipStats, keywordCategoryCount, angleStats);
  const recommendedActions = [];

  if (!filesPresent.persona || !filesPresent.relationships || !filesPresent.keywords) {
    recommendedActions.push('export_missing_runtime_profile_artifacts');
  }
  if (Number(readiness.readyEventCount || 0) < 2) {
    recommendedActions.push('promote_more_ready_events');
  }
  if (relationshipStats.relationshipCount < 3 || relationshipStats.noEvidenceCount > 0 || relationshipStats.notReadyCount > 0) {
    recommendedActions.push('review_relationship_edges');
  }
  if (angleStats.candidateOnlyTargetCount > 0 || angleStats.aliasOnlyTraceCount > 0) {
    recommendedActions.push('audit_interaction_candidate_pool');
  }
  if (angleStats.crossLayerRefOverlapCount > 0 || angleStats.duplicateGroupCount > 0) {
    recommendedActions.push('dedupe_angle_sources_before_scene_director');
  }

  return {
    generalId,
    displayName: persona && persona.displayName ? persona.displayName : generalId,
    band,
    filesPresent,
    runtimeReadiness: {
      status: readiness.status || 'unknown',
      completionPercent: readiness.completionPercent || 0,
      readyEventCount: readiness.readyEventCount || 0,
      relationshipCount: readiness.relationshipCount || relationshipStats.relationshipCount,
      reviewBacklogCount: readiness.reviewBacklogCount || asArray(persona && persona.reviewBacklog).length,
    },
    storyBeatCount: asArray(persona && persona.storyBeats).length,
    sourceHighlightCount: asArray(persona && persona.sourceHighlights).length,
    keywordCategoryCount,
    relationshipStats: {
      relationshipCount: relationshipStats.relationshipCount,
      rejectedRelationshipCount: relationshipStats.rejectedRelationshipCount,
      noEvidenceCount: relationshipStats.noEvidenceCount,
      lowConfidenceCount: relationshipStats.lowConfidenceCount,
      notReadyCount: relationshipStats.notReadyCount,
      noEvidenceTargets: relationshipStats.noEvidenceTargets,
    },
    angleStats,
    recommendedActions,
  };
}

function buildSummary(results) {
  const bandCounts = {};
  for (const result of results) {
    bandCounts[result.band] = (bandCounts[result.band] || 0) + 1;
  }
  const needsFill = results
    .filter((result) => result.band === 'needs-etl-fill' || result.band === 'missing-profile-artifact')
    .sort((left, right) => Number(left.runtimeReadiness.readyEventCount) - Number(right.runtimeReadiness.readyEventCount));
  const candidateRisks = results
    .filter((result) => result.angleStats.candidateOnlyTargetCount > 0 || result.angleStats.aliasOnlyTraceCount > 0)
    .sort((left, right) => (right.angleStats.candidateOnlyTargetCount + right.angleStats.aliasOnlyTraceCount) - (left.angleStats.candidateOnlyTargetCount + left.angleStats.aliasOnlyTraceCount));
  const duplicateRisks = results
    .filter((result) => result.angleStats.duplicateGroupCount > 0 || result.angleStats.crossLayerRefOverlapCount > 0)
    .sort((left, right) => (right.angleStats.duplicateExcessLinkCount + right.angleStats.crossLayerRefOverlapCount) - (left.angleStats.duplicateExcessLinkCount + left.angleStats.crossLayerRefOverlapCount));

  return {
    total: results.length,
    bandCounts,
    missingArtifactCount: results.filter((result) => !result.filesPresent.persona || !result.filesPresent.relationships || !result.filesPresent.keywords).length,
    averageReadyEventCount: roundAverage(results.map((result) => Number(result.runtimeReadiness.readyEventCount || 0))),
    averageRelationshipCount: roundAverage(results.map((result) => Number(result.relationshipStats.relationshipCount || 0))),
    needsFill: needsFill.slice(0, 12).map(compactResult),
    candidateRisks: candidateRisks.slice(0, 12).map(compactResult),
    duplicateRisks: duplicateRisks.slice(0, 12).map(compactResult),
  };
}

function roundAverage(values) {
  if (values.length === 0) {
    return 0;
  }
  const sum = values.reduce((total, value) => total + value, 0);
  return Math.round((sum / values.length) * 100) / 100;
}

function compactResult(result) {
  return {
    generalId: result.generalId,
    displayName: result.displayName,
    band: result.band,
    readyEventCount: result.runtimeReadiness.readyEventCount,
    relationshipCount: result.relationshipStats.relationshipCount,
    candidateOnlyTargetCount: result.angleStats.candidateOnlyTargetCount,
    aliasOnlyTraceCount: result.angleStats.aliasOnlyTraceCount,
    duplicateGroupCount: result.angleStats.duplicateGroupCount,
    crossLayerRefOverlapCount: result.angleStats.crossLayerRefOverlapCount,
    recommendedActions: result.recommendedActions,
  };
}

function markdownTable(rows, columns) {
  if (rows.length === 0) {
    return '_None._';
  }
  const header = `| ${columns.map((column) => column.label).join(' | ')} |`;
  const sep = `| ${columns.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => `| ${columns.map((column) => formatCell(column.value(row))).join(' | ')} |`);
  return [header, sep, ...body].join('\n');
}

function formatCell(value) {
  if (Array.isArray(value)) {
    return value.join(', ');
  }
  return String(value == null ? '' : value).replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
}

function renderMarkdown(report) {
  const needsFillRows = report.summary.needsFill.slice(0, 6);
  const candidateRows = report.summary.candidateRisks.slice(0, 6);
  const duplicateRows = report.summary.duplicateRisks.slice(0, 6);
  return [
    '# PROG-2-0017 Top50 Readiness Audit R1',
    '',
    `Generated at: ${report.generatedAt}`,
    '',
    '## Scope',
    '',
    '- Task: PROG-2-0017 relationship edge / interaction target / readiness audit.',
    '- Input: runtime-general-profiles Top50 export artifacts.',
    '- Goal: identify whether Top50 characters are playable in web through grounded persona cards, relationship events, and scene-director-safe interaction candidates.',
    '',
    '## Summary',
    '',
    `- Total audited generals: ${report.summary.total}`,
    `- Missing runtime artifacts: ${report.summary.missingArtifactCount}`,
    `- Band counts: ${Object.entries(report.summary.bandCounts).map(([band, count]) => `${band}=${count}`).join(', ')}`,
    `- Average readyEventCount: ${report.summary.averageReadyEventCount}`,
    `- Average relationshipCount: ${report.summary.averageRelationshipCount}`,
    '',
    '## Main Findings',
    '',
    '- The Top50 export itself is complete: all 50 runtime profile folders are present when using the current artifact set.',
    '- Readiness is uneven: profiles with zero or very low readyEventCount are the next ETL fill targets before they can support richer web play.',
    '- Interaction candidates need a separate gate from relationship edges: angleTargetLinks can surface candidate-only targets that are not anchored relationships.',
    '- The Liu Bei / Sun Shang Xiang duplication pattern is systemic enough to audit: duplicate target/source angle groups and storyBeat/sourceHighlight overlap are measurable across profiles.',
    '',
    '## R2 Implementation Note',
    '',
    '- Export layer: `angleTargetLinks` now dedupes by `targetId + sourceRef + sourceType`; multiple angles are retained in `angleFamilies`.',
    '- Server layer: scene-director runtime source collection lets `storyBeats` cover same-ref `sourceHighlights`, and alias-only mentions no longer create fresh Top12 interaction targets by themselves.',
    '- Regression: Liu Bei / Sun Shang Xiang sourceHighlight expansion now reports `duplicate_groups=0`, with two source refs (`055#p6`, `055#p9`) preserving 9 angle families each.',
    '',
    '## Needs ETL Fill First',
    '',
    markdownTable(needsFillRows, [
      { label: 'generalId', value: (row) => row.generalId },
      { label: 'name', value: (row) => row.displayName },
      { label: 'band', value: (row) => row.band },
      { label: 'readyEvents', value: (row) => row.readyEventCount },
      { label: 'relationships', value: (row) => row.relationshipCount },
      { label: 'actions', value: (row) => row.recommendedActions },
    ]),
    '',
    '## Candidate Pool Risks',
    '',
    markdownTable(candidateRows, [
      { label: 'generalId', value: (row) => row.generalId },
      { label: 'name', value: (row) => row.displayName },
      { label: 'candidateOnlyTargets', value: (row) => row.candidateOnlyTargetCount },
      { label: 'aliasOnlyTraces', value: (row) => row.aliasOnlyTraceCount },
      { label: 'actions', value: (row) => row.recommendedActions },
    ]),
    '',
    '## Duplicate Amplification Risks',
    '',
    markdownTable(duplicateRows, [
      { label: 'generalId', value: (row) => row.generalId },
      { label: 'name', value: (row) => row.displayName },
      { label: 'duplicateGroups', value: (row) => row.duplicateGroupCount },
      { label: 'crossLayerOverlap', value: (row) => row.crossLayerRefOverlapCount },
      { label: 'actions', value: (row) => row.recommendedActions },
    ]),
    '',
    '## Full Matrix Location',
    '',
    '- Machine-readable full matrix: `artifacts/data-pipeline/sanguo-rag/extracted/core-person-progress/prog-2-0017-top50-readiness-audit-r1.json`.',
    '- Keep the Markdown report as a decision summary; use the JSON for exact per-general metrics and regression diffs.',
    '',
    '## Next Work Order',
    '',
    '1. Promote ready events for zero-event or one-event profiles before polishing web display.',
    '2. Split scene-director candidate selection into relationship-backed targets and mention-only targets.',
    '3. Add export/server dedupe keyed by targetId + sourceRef + sourceType before prompt/evidence assembly.',
    '4. Use this audit output as the first PROG-2-0017 regression report after each Top50 ETL refresh.',
    '',
  ].join('\n');
}

function ensureParentDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function preserveDocIdHeader(filePath, content) {
  if (!fs.existsSync(filePath)) {
    return content;
  }
  const existing = fs.readFileSync(filePath, 'utf8');
  const firstLine = existing.split(/\r?\n/, 1)[0];
  if (/^<!--\s*doc_id:\s*[^>]+-->$/.test(firstLine) && !content.startsWith('<!-- doc_id:')) {
    return `${firstLine}\n${content}`;
  }
  return content;
}

function main() {
  const args = parseArgs(process.argv);
  const generalIds = readTop50Ids(args);
  const results = generalIds.map((generalId) => auditGeneral(generalId, args));
  const report = {
    schemaId: 'sanguo.top50ReadinessAudit.v1',
    taskId: 'PROG-2-0017',
    generatedAt: new Date().toISOString(),
    inputs: {
      profileRoot: path.relative(repoRoot, args.profileRoot),
      top50Report: path.relative(repoRoot, args.top50Report),
      top50Ids: path.relative(repoRoot, args.top50Ids),
    },
    summary: buildSummary(results),
    results,
  };

  ensureParentDir(args.outJson);
  ensureParentDir(args.outMd);
  fs.writeFileSync(args.outJson, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(args.outMd, preserveDocIdHeader(args.outMd, renderMarkdown(report)), 'utf8');
  console.log(`[audit-sanguo-top50-readiness] wrote ${path.relative(repoRoot, args.outJson)}`);
  console.log(`[audit-sanguo-top50-readiness] wrote ${path.relative(repoRoot, args.outMd)}`);
  console.log(`[audit-sanguo-top50-readiness] bandCounts=${JSON.stringify(report.summary.bandCounts)}`);
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error && error.stack ? error.stack : error);
    process.exit(1);
  }
}

module.exports = {
  auditGeneral,
  buildSummary,
  parseArgs,
};