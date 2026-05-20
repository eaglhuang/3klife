import type {
  LegacyRoutePlanReport,
  LegacyRoutePlanRequest,
  LegacyRoutePlanStep,
} from '../../../plugin-sdk/src/language-adapter';

export interface CSharpLegacyRouteIntent {
  action: 'atomize' | 'infect' | 'inventory' | 'validate' | 'plan';
  focus: string[];
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

function buildCSharpRouteSteps(parsed: CSharpLegacyRouteIntent): LegacyRoutePlanStep[] {
  const focusLabel = parsed.focus.length > 0 ? parsed.focus.join(', ') : 'workspace scope';
  return [
    {
      phase: 'collect-profile',
      description: `Collect .sln/.csproj profile evidence for ${focusLabel}.`,
    },
    {
      phase: 'inventory-scan',
      description: 'Scan C# source inventory and stabilize symbol identifiers before planning.',
    },
    {
      phase: 'risk-evaluation',
      description: 'Evaluate partial declarations and generated-file risk as review-gate evidence.',
    },
    {
      phase: 'dry-run-proposal',
      description: `Draft ${parsed.action} dry-run proposal without mutating .cs or .csproj files.`,
    },
    {
      phase: 'review-gate',
      description: 'Require human review before any host-level apply operation.',
    },
  ];
}

export function buildCSharpLegacyRoutePlan(request: LegacyRoutePlanRequest): LegacyRoutePlanReport {
  const parsed = parseCSharpLegacyRouteIntent(request.intent);
  const steps = buildCSharpRouteSteps(parsed);
  return {
    routeId: `csharp-future-${parsed.action}`,
    steps,
    warnings: [
      'C# adapter is future-stage and route planning remains advisory-only.',
      `Repository root: ${request.repositoryRoot}`,
    ],
  };
}
