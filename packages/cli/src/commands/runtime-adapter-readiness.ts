import {
  resolveLanguageAdapter,
  type LanguageAdapterResolutionReport,
  type LanguageAdapterResolutionRequest,
} from '../../../core/src/guidance/language-adapter-resolver';

export interface RuntimeAdapterReadinessReport {
  ok: boolean;
  summaryLines: string[];
  resolution: LanguageAdapterResolutionReport;
}

export function runtimeAdapterReadiness(
  request: LanguageAdapterResolutionRequest
): RuntimeAdapterReadinessReport {
  const resolution = resolveLanguageAdapter(request);
  const summaryLines: string[] = [];

  if (!resolution.selected) {
    summaryLines.push(`No adapter can currently serve language "${request.languageId}".`);
  } else {
    summaryLines.push(
      `Selected ${resolution.selected.adapterId} from ${resolution.selected.source} (${resolution.selected.moduleName}).`
    );
    if (resolution.selected.fallback.unsupported.length > 0) {
      summaryLines.push(
        `Unsupported capabilities: ${resolution.selected.fallback.unsupported.join(', ')}.`
      );
    } else if (resolution.selected.fallback.advisory.length > 0) {
      summaryLines.push(
        `Advisory capabilities: ${resolution.selected.fallback.advisory.join(', ')}.`
      );
    } else {
      summaryLines.push('All required capabilities are fully supported.');
    }
  }

  if (resolution.rejected.length > 0) {
    summaryLines.push(`Rejected candidates: ${resolution.rejected.length}.`);
  }

  return {
    ok: resolution.ok,
    summaryLines,
    resolution,
  };
}

