import type { SourceInventoryReport, SourceInventoryRequest } from '../../../plugin-sdk/src/language-adapter';
import {
  resolveLanguageAdapter,
  type LanguageAdapterResolutionRequest,
} from '../../../core/src/guidance/language-adapter-resolver';
import {
  rankCandidatesWithAdapter,
  type CandidatesRankServiceReport,
} from '../../../core/src/guidance/candidates-rank-service';

export interface CandidatesRankCommandRequest extends LanguageAdapterResolutionRequest {
  repositoryRoot: string;
  includeGlobs?: readonly string[];
  excludeGlobs?: readonly string[];
  inventoryArtifactPath?: string;
  adapterScanSourceInventory?: (
    request: SourceInventoryRequest
  ) => SourceInventoryReport | Promise<SourceInventoryReport>;
}

export interface CandidatesRankCommandReport {
  ok: boolean;
  summaryLines: string[];
  report: CandidatesRankServiceReport;
}

export async function candidatesRank(
  request: CandidatesRankCommandRequest
): Promise<CandidatesRankCommandReport> {
  const resolution = resolveLanguageAdapter(request);
  const report = await rankCandidatesWithAdapter({
    languageId: request.languageId,
    repositoryRoot: request.repositoryRoot,
    adapterResolution: resolution,
    includeGlobs: request.includeGlobs,
    excludeGlobs: request.excludeGlobs,
    inventoryArtifactPath: request.inventoryArtifactPath,
    adapterScanSourceInventory: request.adapterScanSourceInventory,
  });

  const summaryLines: string[] = [];
  if (!report.selectedAdapterId) {
    summaryLines.push(`No adapter was resolved for language "${request.languageId}".`);
  } else {
    summaryLines.push(
      `Selected ${report.selectedAdapterId}; inventory mode=${report.inventory.mode}; score=${report.ranking.score.total}/${report.ranking.score.max}.`
    );
  }
  summaryLines.push(`Inventory artifact path: ${report.inventoryArtifactPath}`);
  if (report.ranking.advisorySignalIds.length > 0) {
    summaryLines.push(`Advisory signals: ${report.ranking.advisorySignalIds.join(', ')}.`);
  }
  if (report.ranking.unsupportedSignalIds.length > 0) {
    summaryLines.push(
      `Unsupported signals (advisory-only): ${report.ranking.unsupportedSignalIds.join(', ')}.`
    );
  }

  return {
    ok: report.ok,
    summaryLines,
    report,
  };
}

