import type {
  LanguageProjectProfile,
  LegacyRoutePlanReport,
  LegacyRoutePlanRequest,
  LegacyRoutePlanStep,
} from '../../../plugin-sdk/src/language-adapter';
import {
  collectCSharpProjectEvidence,
  detectCSharpProjectProfile,
  type CSharpProjectEvidence,
} from './csharp-profile';
import {
  buildCSharpSolutionProjectGraph,
  type CSharpSolutionProjectGraph,
} from './csharp-solution-graph';
import {
  buildCSharpCsprojRiskModel,
  type CSharpCsprojRiskReport,
} from './csharp-csproj-risk';

export interface CSharpLegacyRouteIntent {
  action: 'atomize' | 'infect' | 'inventory' | 'validate' | 'plan';
  focus: string[];
}

interface CSharpLegacyRouteContext {
  profile: LanguageProjectProfile;
  projectEvidence: CSharpProjectEvidence;
  solutionGraph: CSharpSolutionProjectGraph;
  csprojRisk: CSharpCsprojRiskReport;
}

const CSHARP_ROUTE_ACTION_KEYWORDS: readonly CSharpLegacyRouteIntent['action'][] = [
  'atomize',
  'infect',
  'inventory',
  'validate',
  'plan',
];

function normalizeIntentText(intent: string): string {
  return intent
    .toLowerCase()
    .replace(/[^a-z0-9_\-\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseCSharpLegacyRouteIntent(intent: string): CSharpLegacyRouteIntent {
  const normalized = normalizeIntentText(intent);
  const tokens = normalized.split(' ').filter(Boolean);
  const action =
    CSHARP_ROUTE_ACTION_KEYWORDS.find((keyword) => tokens.includes(keyword)) ?? 'plan';
  const focus = tokens.filter((token) => token !== action);
  return {
    action,
    focus,
  };
}

function buildCSharpRouteSteps(
  parsed: CSharpLegacyRouteIntent,
  context: CSharpLegacyRouteContext
): LegacyRoutePlanStep[] {
  const focusLabel = parsed.focus.length > 0 ? parsed.focus.join(', ') : 'workspace scope';
  const steps: LegacyRoutePlanStep[] = [
    {
      phase: 'collect-profile',
      description: `Collect .sln/.csproj profile evidence for ${focusLabel}; profile=${context.profile.profileId} confidence=${context.profile.confidence.toFixed(2)}.`,
    },
  ];

  if (context.solutionGraph.summary.projectCount > 1) {
    steps.push({
      phase: 'solution-graph',
      description: `Resolve solution/project graph across ${context.solutionGraph.summary.projectCount} projects and ${context.solutionGraph.summary.projectReferenceCount} references.`,
    });
  }

  steps.push(
    {
      phase: 'inventory-scan',
      description: `Scan C# source inventory and stabilize symbol identifiers (cs files detected=${context.projectEvidence.hasCSharpSource ? 'yes' : 'no'}).`,
    },
    {
      phase: 'risk-evaluation',
      description: `Evaluate csproj/source risk; findings=${context.csprojRisk.summary.findingCount}, blocking=${context.csprojRisk.hasBlockingRisk ? 'yes' : 'no'}.`,
    },
  );

  if (parsed.action === 'atomize' || parsed.action === 'infect') {
    steps.push({
      phase: 'map-threshold-plan',
      description:
        'Derive decomposition threshold profile from project scale before dry-run proposal.',
    });
  }

  steps.push(
    {
      phase: 'dry-run-proposal',
      description: `Draft ${parsed.action} dry-run proposal without mutating .cs or .csproj files.`,
    },
    {
      phase: 'review-gate',
      description: context.csprojRisk.hasBlockingRisk
        ? 'Require dual review (human + police) before any host-level apply operation.'
        : 'Require human review before any host-level apply operation.',
    },
  );

  return steps;
}

function buildRouteId(
  parsed: CSharpLegacyRouteIntent,
  profile: LanguageProjectProfile
): string {
  const profileLabel = profile.profileId.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  return `csharp-future-${parsed.action}-${profileLabel}`;
}

export function buildCSharpLegacyRoutePlan(request: LegacyRoutePlanRequest): LegacyRoutePlanReport {
  const profile = detectCSharpProjectProfile(request.repositoryRoot);
  const projectEvidence = collectCSharpProjectEvidence(request.repositoryRoot);
  const solutionGraph = buildCSharpSolutionProjectGraph(request.repositoryRoot, projectEvidence);
  const csprojRisk = buildCSharpCsprojRiskModel(
    request.repositoryRoot,
    projectEvidence,
    solutionGraph
  );

  const parsed = parseCSharpLegacyRouteIntent(request.intent);
  const steps = buildCSharpRouteSteps(parsed, {
    profile,
    projectEvidence,
    solutionGraph,
    csprojRisk,
  });
  return {
    routeId: buildRouteId(parsed, profile),
    steps,
    warnings: [
      'C# adapter is future-stage and route planning remains advisory-only.',
      `Profile: ${profile.profileId} (${profile.confidence.toFixed(2)})`,
      `Solution graph projects=${solutionGraph.summary.projectCount}, references=${solutionGraph.summary.projectReferenceCount}, orphans=${solutionGraph.summary.orphanProjectCount}.`,
      `CSProj risk findings=${csprojRisk.summary.findingCount}, errors=${csprojRisk.summary.errorCount}.`,
      `Repository root: ${request.repositoryRoot}`,
      ...solutionGraph.warnings.slice(0, 3),
      ...csprojRisk.warnings.slice(0, 3),
    ],
  };
}
