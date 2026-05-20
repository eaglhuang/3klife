import type { SourceRange } from '../../../plugin-sdk/src/language-adapter';
import type { CSharpModuleAnalysis } from './csharp-inventory';

export interface CSharpRiskFinding {
  riskId: string;
  kind: 'partial-declaration' | 'generated-file' | 'auto-generated-header';
  severity: 'warning' | 'error';
  filePath: string;
  symbolId?: string;
  location?: SourceRange;
  evidence: string;
}

export interface CSharpRiskModelReport {
  findings: CSharpRiskFinding[];
  warnings: string[];
  hasBlockingRisk: boolean;
}

function buildLocation(filePath: string, line: number): SourceRange {
  return {
    filePath,
    startLine: line,
    startColumn: 0,
    endLine: line,
    endColumn: 0,
  };
}

export function buildCSharpRiskModel(moduleAnalyses: readonly CSharpModuleAnalysis[]): CSharpRiskModelReport {
  const findings: CSharpRiskFinding[] = [];

  for (const moduleAnalysis of moduleAnalyses) {
    for (const type of moduleAnalysis.typeEvidence) {
      if (!type.isPartial) {
        continue;
      }
      findings.push({
        riskId: `partial:${type.symbolId}`,
        kind: 'partial-declaration',
        severity: 'warning',
        filePath: type.filePath,
        symbolId: type.symbolId,
        location: buildLocation(type.filePath, type.line),
        evidence: `${type.filePath}:${type.line} partial ${type.kind} ${type.displayName}`,
      });
    }

    for (const generated of moduleAnalysis.generatedEvidence) {
      findings.push({
        riskId: `${generated.kind}:${generated.filePath}:${generated.line}`,
        kind: generated.kind === 'generated-file-name' ? 'generated-file' : 'auto-generated-header',
        severity: 'error',
        filePath: generated.filePath,
        location: buildLocation(generated.filePath, generated.line),
        evidence: generated.evidence,
      });
    }
  }

  const warnings = findings.map((finding) => `${finding.kind} ${finding.severity}: ${finding.evidence}`);
  return {
    findings,
    warnings,
    hasBlockingRisk: findings.some((finding) => finding.severity === 'error'),
  };
}
