import type { SourceInventoryReport, SourceInventoryRequest } from '../../../plugin-sdk/src/language-adapter';
import type { LanguageAdapterResolutionReport } from './language-adapter-resolver';
import {
  buildCandidateRankingSignalModel,
  type CandidateRankingSignalModelReport,
} from './candidate-ranking-signal-model';
import {
  collectCandidateSourceInventory,
  type SourceInventoryServiceReport,
} from './source-inventory-service';

export interface CandidatesRankServiceRequest {
  languageId: string;
  repositoryRoot: string;
  adapterResolution: LanguageAdapterResolutionReport;
  includeGlobs?: readonly string[];
  excludeGlobs?: readonly string[];
  inventoryArtifactPath?: string;
  adapterScanSourceInventory?: (
    request: SourceInventoryRequest
  ) => SourceInventoryReport | Promise<SourceInventoryReport>;
}

export interface CandidatesRankServiceReport {
  ok: boolean;
  languageId: string;
  selectedAdapterId: string | null;
  inventoryArtifactPath: string;
  inventory: SourceInventoryServiceReport;
  ranking: CandidateRankingSignalModelReport;
  messages: string[];
}

export async function rankCandidatesWithAdapter(
  request: CandidatesRankServiceRequest
): Promise<CandidatesRankServiceReport> {
  const inventoryReport = await collectCandidateSourceInventory({
    languageId: request.languageId,
    repositoryRoot: request.repositoryRoot,
    adapterResolution: request.adapterResolution,
    includeGlobs: request.includeGlobs,
    excludeGlobs: request.excludeGlobs,
    artifactPath: request.inventoryArtifactPath,
    adapterScanSourceInventory: request.adapterScanSourceInventory,
  });

  const rankingReport = buildCandidateRankingSignalModel({
    languageId: request.languageId,
    selectedAdapter: request.adapterResolution.selected,
    inventory: inventoryReport.inventory,
    inventoryMode: inventoryReport.mode,
    inventoryArtifactPath: inventoryReport.artifactPath,
  });

  const selectedAdapterId = request.adapterResolution.selected?.adapterId ?? null;
  const messages = [
    `Candidate ranking language=${request.languageId} selectedAdapter=${selectedAdapterId ?? 'none'}.`,
    ...inventoryReport.messages,
    ...rankingReport.messages,
  ];

  return {
    ok: rankingReport.ok,
    languageId: request.languageId,
    selectedAdapterId,
    inventoryArtifactPath: inventoryReport.artifactPath,
    inventory: inventoryReport,
    ranking: rankingReport,
    messages,
  };
}

