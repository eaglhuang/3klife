import type { GuidanceRoutePlanResult } from '../guidance/legacy-route-delegation';
import type { LanguageAdapterResolutionReport } from '../guidance/language-adapter-resolver';

export interface PoliceAdapterEvidenceRecord {
  evidenceId: string;
  adapterId?: string;
  routeMode: 'adapter-delegated' | 'generic-fallback';
  summary: string;
  warnings: string[];
}

export interface PoliceGuidanceIntegrationReport {
  ok: boolean;
  routeMode: 'adapter-delegated' | 'generic-fallback';
  adapterId?: string;
  records: PoliceAdapterEvidenceRecord[];
  messages: string[];
}

function summarizeRouteResult(routeResult: GuidanceRoutePlanResult): string {
  const warningText = routeResult.routeReport.warnings?.join(' | ') ?? 'no warnings';
  return `routeId=${routeResult.routeReport.routeId}; steps=${routeResult.routeReport.steps.length}; warnings=${warningText}`;
}

export function buildPoliceGuidanceIntegrationReport(
  routeResult: GuidanceRoutePlanResult,
  resolution: LanguageAdapterResolutionReport
): PoliceGuidanceIntegrationReport {
  const selected = resolution.selected;
  const adapterId = selected?.adapterId;
  const messages: string[] = [];
  const records: PoliceAdapterEvidenceRecord[] = [];

  const primaryRecord: PoliceAdapterEvidenceRecord = {
    evidenceId: `police-evidence-${routeResult.routeReport.routeId}`,
    adapterId,
    routeMode: routeResult.mode,
    summary: summarizeRouteResult(routeResult),
    warnings: routeResult.routeReport.warnings ?? [],
  };
  records.push(primaryRecord);

  if (routeResult.mode === 'adapter-delegated') {
    messages.push(`Police accepted delegated route evidence from adapter ${adapterId ?? 'unknown'}.`);
  } else {
    messages.push('Police accepted generic fallback route evidence with explicit fallback reason.');
  }

  if (resolution.selected && resolution.selected.fallback.unsupported.length > 0) {
    messages.push(
      `Adapter unresolved capabilities: ${resolution.selected.fallback.unsupported.join(', ')}.`
    );
  }

  const ok = records.length > 0 && routeResult.messages.length > 0;
  if (!ok) {
    messages.push('Police integration report is incomplete.');
  }

  return {
    ok,
    routeMode: routeResult.mode,
    adapterId,
    records,
    messages,
  };
}

