import type {
  LegacyRoutePlanReport,
  LegacyRoutePlanRequest,
  LegacyRoutePlanStep,
} from '../../../plugin-sdk/src/language-adapter';
import type { LanguageAdapterResolutionReport } from './language-adapter-resolver';

export type GuidanceRouteMode = 'adapter-delegated' | 'generic-fallback';

export interface GuidanceRoutePlanRequest {
  intent: string;
  repositoryRoot: string;
  languageId: string;
  adapterResolution: LanguageAdapterResolutionReport;
  adapterDelegate?: (request: LegacyRoutePlanRequest) => LegacyRoutePlanReport | Promise<LegacyRoutePlanReport>;
}

export interface GuidanceRouteEvidence {
  kind: GuidanceRouteMode;
  adapterId?: string;
  reason: string;
}

export interface GuidanceRoutePlanResult {
  mode: GuidanceRouteMode;
  routeReport: LegacyRoutePlanReport;
  evidence: GuidanceRouteEvidence;
  messages: string[];
}

export interface GenericRouteIntent {
  action: string;
  targets: string[];
}

const GENERIC_ACTION_KEYWORDS = [
  'atomize',
  'infect',
  'validate',
  'inventory',
  'rank',
  'plan',
  'route',
  'audit',
];

const LEGACY_ROUTE_PLANNING_CAPABILITY = 'legacyRoutePlanning';

function normalizeIntentText(intent: string): string {
  return intent.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ');
}

export function parseGenericRouteIntent(intent: string): GenericRouteIntent {
  const normalized = normalizeIntentText(intent);
  const tokens = normalized
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

  const action =
    GENERIC_ACTION_KEYWORDS.find((keyword) => tokens.includes(keyword)) ??
    (tokens.length > 0 ? tokens[0] : 'plan');
  const targets = tokens.filter((token) => token !== action);

  return {
    action,
    targets,
  };
}

function buildGenericFallbackRouteSteps(parsed: GenericRouteIntent): LegacyRoutePlanStep[] {
  const targetLabel = parsed.targets.length > 0 ? parsed.targets.join(', ') : 'workspace scope';
  return [
    {
      phase: 'collect-context',
      description: `Collect evidence for ${targetLabel}.`,
    },
    {
      phase: 'propose-route',
      description: `Propose generic ${parsed.action} route using adapter-neutral guidance rules.`,
    },
    {
      phase: 'review-gate',
      description: 'Require review gate before mutation-capable operations.',
    },
  ];
}

export function buildGenericFallbackRoutePlan(
  intent: string,
  languageId: string,
  repositoryRoot: string
): LegacyRoutePlanReport {
  const parsed = parseGenericRouteIntent(intent);
  const steps = buildGenericFallbackRouteSteps(parsed);

  return {
    routeId: `fallback-${languageId}-${parsed.action}`,
    steps,
    warnings: [
      `Adapter route planning is unavailable; guidance used generic fallback for ${languageId}.`,
      `Repository root: ${repositoryRoot}`,
    ],
  };
}

function canDelegateLegacyRoute(request: GuidanceRoutePlanRequest): { ok: boolean; reason: string } {
  const selected = request.adapterResolution.selected;
  if (!selected) {
    return {
      ok: false,
      reason: 'no adapter was resolved',
    };
  }
  if (!request.adapterDelegate) {
    return {
      ok: false,
      reason: 'adapter delegate function is not provided',
    };
  }
  if (selected.fallback.unsupported.includes(LEGACY_ROUTE_PLANNING_CAPABILITY)) {
    return {
      ok: false,
      reason: 'resolved adapter reports legacy route planning as unsupported',
    };
  }
  return {
    ok: true,
    reason: 'adapter supports legacy route planning',
  };
}

export async function planLegacyRouteWithAdapter(
  request: GuidanceRoutePlanRequest
): Promise<GuidanceRoutePlanResult> {
  const eligibility = canDelegateLegacyRoute(request);
  const selected = request.adapterResolution.selected;
  const messages = [...request.adapterResolution.messages];

  if (eligibility.ok && request.adapterDelegate && selected) {
    const routeReport = await request.adapterDelegate({
      intent: request.intent,
      repositoryRoot: request.repositoryRoot,
    });

    messages.push(`Delegated legacy route planning to adapter ${selected.adapterId}.`);
    return {
      mode: 'adapter-delegated',
      routeReport,
      evidence: {
        kind: 'adapter-delegated',
        adapterId: selected.adapterId,
        reason: eligibility.reason,
      },
      messages,
    };
  }

  const fallbackRouteReport = buildGenericFallbackRoutePlan(
    request.intent,
    request.languageId,
    request.repositoryRoot
  );
  messages.push(`Used generic fallback route plan because ${eligibility.reason}.`);

  return {
    mode: 'generic-fallback',
    routeReport: fallbackRouteReport,
    evidence: {
      kind: 'generic-fallback',
      adapterId: selected?.adapterId,
      reason: eligibility.reason,
    },
    messages,
  };
}

