'use strict';

const fs = require('fs');
const path = require('path');

const {
  ROOT,
  LIFECYCLE_MODES,
  default3KLifeGovernanceConfig,
  _default3KLifeGovernanceLayout,
  threeKLifeGovernancePhaseMatrix,
  build3KLifeGovernanceMappingMatrix,
  create3KLifeGovernanceAdapter,
  createCapabilityResult,
  createArtifact,
  createEvidence,
  mergeGovernanceConfig,
  relativeToRoot,
  resolveRelative,
} = require('./governance-adapter');

const default3KLifeProjectAdapterConfig = Object.freeze({
  repositoryRoot: ROOT,
  adapterName: '@3klife/project-adapter-shadow',
  adapterVersion: '0.1.0-shadow',
  materializeArtifacts: true,
  governance: default3KLifeGovernanceConfig,
});

function mergeProjectAdapterConfig(overrides = {}) {
  return Object.assign({}, default3KLifeProjectAdapterConfig, overrides, {
    governance: mergeGovernanceConfig(Object.assign({}, default3KLifeProjectAdapterConfig.governance, overrides.governance || {})),
  });
}

function toCapabilityDescriptor(entry) {
  return {
    capabilityId: entry.capabilityId,
    kind: entry.kind,
    required: entry.required !== false,
    lifecycleModes: LIFECYCLE_MODES,
    description: `${entry.phase1.mode}: ${entry.phase1.behavior}`,
  };
}

function build3KLifeCapabilityMatrix(config) {
  return {
    generatedAt: new Date().toISOString(),
    adapterName: config.adapterName,
    adapterVersion: config.adapterVersion,
    lifecycleModes: LIFECYCLE_MODES,
    giantAtomDecision: 'rejected',
    clarification: [
      'Phase 1 keeps the runtime boundary capability-oriented because upstream ProjectAdapter/GovernanceStores are capability/store interfaces.',
      'Phase 2 atomizes each governance tool or gate family behind those interfaces; ProjectAdapter remains a router facade, not the final opaque implementation.',
      'compute-gate is modeled as an atom-map candidate, not as a single giant governance atom.'
    ],
    capabilities: threeKLifeGovernancePhaseMatrix.map((entry) => ({
      capability: toCapabilityDescriptor(entry),
      phase1: entry.phase1,
      phase2: entry.phase2,
    })),
  };
}

function buildShadowModeReport(governanceAdapter, workItem) {
  const workItemId = workItem ? workItem.workItemId : 'ATM-3-0001';
  return {
    generatedAt: new Date().toISOString(),
    adapterName: governanceAdapter.adapterName,
    workItemId,
    summary: 'ATM-3-0001 Phase 1 implements thin adapter wrappers in shadow mode while preserving Phase 2 atom-compatible boundaries for governance tool atomization.',
    architectureDecision: {
      phase1: 'ProjectAdapter facade + GovernanceStores wrappers delegate to existing 3KLife tools without replacing their CLI entrypoints.',
      phase2: 'Each GovernanceStore implementation is planned to move behind an ATM-GOV-* governed atom or atom map.',
      giantAtomDecision: 'rejected',
      reason: 'Capability-by-capability evolution, validation, reuse, and police governance would be lost in a monolithic governance atom.'
    },
    taskCard: governanceAdapter.buildTaskCardSnapshot(workItemId),
    phaseMatrix: governanceAdapter.phaseMatrix,
  };
}

function renderShadowModeReportMarkdown(report) {
  const lines = [
    '# ATM-3-0001 Shadow-Mode Report',
    '',
    `- Generated At: ${report.generatedAt}`,
    `- Adapter: ${report.adapterName}`,
    `- Work Item: ${report.workItemId}`,
    '',
    '## Summary',
    '',
    report.summary,
    '',
    '## Architecture Decision',
    '',
    `- Phase 1: ${report.architectureDecision.phase1}`,
    `- Phase 2: ${report.architectureDecision.phase2}`,
    `- Giant Atom: ${report.architectureDecision.giantAtomDecision}`,
    `- Reason: ${report.architectureDecision.reason}`,
    '',
    '## Stores',
    '',
  ];

  for (const entry of report.phaseMatrix) {
    lines.push(`### ${entry.storeId}`);
    lines.push('');
    lines.push(`- Phase 1: ${entry.phase1.mode}`);
    lines.push(`- Delegate: ${entry.phase1.delegates.join(', ')}`);
    lines.push(`- Phase 2: ${entry.phase2.mode}`);
    lines.push(`- Planned Series: ${entry.phase2.plannedSeries}`);
    if (entry.phase2.proposedAtomMapId) {
      lines.push(`- Proposed Atom Map: ${entry.phase2.proposedAtomMapId}`);
    }
    if (entry.phase2.proposedAtomSlug) {
      lines.push(`- Proposed Atom: ${entry.phase2.proposedAtomSlug}`);
    }
    lines.push(`- Rationale: ${entry.phase2.rationale}`);
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

function ensureParentDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeJson(filePath, value) {
  ensureParentDir(filePath);
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function writeText(filePath, value) {
  ensureParentDir(filePath);
  fs.writeFileSync(filePath, value, 'utf8');
}

function materialize3KLifeAdapterArtifacts(governanceAdapter, workItem) {
  const repositoryRoot = governanceAdapter.config.repositoryRoot;
  const artifactRoot = governanceAdapter.config.artifactRoot;
  const capabilityMatrix = build3KLifeCapabilityMatrix({
    adapterName: governanceAdapter.adapterName,
    adapterVersion: governanceAdapter.adapterVersion,
  });
  const mappingMatrix = build3KLifeGovernanceMappingMatrix(governanceAdapter.config);
  const shadowReport = buildShadowModeReport(governanceAdapter, workItem);
  const outputSpecs = [
    {
      fileName: 'adapter-capability-matrix.json',
      artifactKind: 'report',
      payload: capabilityMatrix,
      write: (absolutePath) => writeJson(absolutePath, capabilityMatrix),
    },
    {
      fileName: 'governance-mapping-matrix.json',
      artifactKind: 'report',
      payload: mappingMatrix,
      write: (absolutePath) => writeJson(absolutePath, mappingMatrix),
    },
    {
      fileName: 'shadow-mode-report.json',
      artifactKind: 'report',
      payload: shadowReport,
      write: (absolutePath) => writeJson(absolutePath, shadowReport),
    },
    {
      fileName: 'shadow-mode-report.md',
      artifactKind: 'report',
      payload: renderShadowModeReportMarkdown(shadowReport),
      write: (absolutePath) => writeText(absolutePath, renderShadowModeReportMarkdown(shadowReport)),
    },
  ];

  return outputSpecs.map((spec) => {
    const absolutePath = resolveRelative(repositoryRoot, path.join(artifactRoot, spec.fileName));
    spec.write(absolutePath);
    return createArtifact(relativeToRoot(repositoryRoot, absolutePath), spec.artifactKind, '@3klife/project-adapter-shadow');
  });
}

function createLifecycleHookResult(stage, context) {
  return {
    ok: true,
    messages: [`Lifecycle hook ${stage} acknowledged for ${context.atomId}.`],
    evidence: [
      createEvidence('validation', `Lifecycle hook ${stage} completed for ${context.atomId}.`, []),
    ],
  };
}

function create3KLifeProjectAdapter(configOverrides = {}) {
  const config = mergeProjectAdapterConfig(configOverrides);
  const governanceAdapter = create3KLifeGovernanceAdapter(config.governance);
  const capabilities = [
    {
      capabilityId: '3klife.project-adapter.shadow',
      kind: 'project-adapter',
      required: true,
      lifecycleModes: LIFECYCLE_MODES,
      description: 'ProjectAdapter facade for 3KLife governance tools in Phase 1 shadow mode.',
    },
    ...threeKLifeGovernancePhaseMatrix.map(toCapabilityDescriptor),
  ];

  function ensureRepositoryRoot(context) {
    const repositoryRoot = path.resolve(context.repositoryRoot || ROOT);
    const expectedRoot = path.resolve(governanceAdapter.config.repositoryRoot);
    if (repositoryRoot !== expectedRoot) {
      return createCapabilityResult(false, [
        `Repository root mismatch: expected ${expectedRoot}, received ${repositoryRoot}.`,
      ], [], [
        createEvidence('validation', '3KLife ProjectAdapter is repository-specific in Phase 1 shadow mode.', []),
      ]);
    }
    return null;
  }

  function buildAdapterResult(context, action, workItem) {
    const mismatch = ensureRepositoryRoot(context);
    if (mismatch) {
      return Object.assign({
        adapterName: config.adapterName,
        lifecycleMode: context.lifecycleMode,
      }, mismatch);
    }

    const artifacts = config.materializeArtifacts
      ? materialize3KLifeAdapterArtifacts(governanceAdapter, workItem)
      : [];
    const evidence = [
      createEvidence(
        'validation',
        `${action} executed through Phase 1 shadow adapter; Phase 2 remains atom-compatible.`,
        artifacts.map((artifact) => artifact.artifactPath)
      ),
    ];
    return {
      adapterName: config.adapterName,
      lifecycleMode: context.lifecycleMode,
      ok: true,
      messages: [
        `${action} completed via ${config.adapterName}.`,
        'Phase 1 = capability-oriented shadow adapter; Phase 2 = governance tool atomization.',
      ],
      artifacts,
      evidence,
    };
  }

  return {
    adapterName: config.adapterName,
    adapterVersion: config.adapterVersion,
    capabilities,
    defaultConfig: config,
    lifecycle: {
      beforeBirth(context) {
        return createLifecycleHookResult('beforeBirth', context);
      },
      afterBirth(context) {
        return createLifecycleHookResult('afterBirth', context);
      },
      beforeEvolution(context) {
        return createLifecycleHookResult('beforeEvolution', context);
      },
      afterEvolution(context) {
        return createLifecycleHookResult('afterEvolution', context);
      },
    },
    stores: governanceAdapter.stores,
    governanceAdapter,
    initialize(context) {
      return buildAdapterResult(context, 'initialize');
    },
    prepareWorkItem(context, workItem) {
      governanceAdapter.stores.contextSummaryStore.writeSummary({
        workItemId: workItem.workItemId,
        summary: `Prepare ${workItem.workItemId} through 3KLife shadow adapter façade.`,
        nextActions: [
          'Keep existing CLI behavior intact.',
          'Validate parity on low-risk helper paths.',
          'Preserve Phase 2 atom-compatible boundaries.',
        ],
      });
      return buildAdapterResult(context, 'prepareWorkItem', workItem);
    },
    finalizeWorkItem(context, workItem) {
      return buildAdapterResult(context, 'finalizeWorkItem', workItem);
    },
  };
}

module.exports = {
  ROOT,
  LIFECYCLE_MODES,
  default3KLifeProjectAdapterConfig,
  build3KLifeCapabilityMatrix,
  buildShadowModeReport,
  renderShadowModeReportMarkdown,
  materialize3KLifeAdapterArtifacts,
  create3KLifeProjectAdapter,
};