import fs from 'node:fs';

export interface ServiceRequest {
  mode: string;
  inputPath?: string;
}

export interface ServiceResult {
  ok: boolean;
  output: string;
  processedAt: string;
}

export async function runService(request: ServiceRequest): Promise<ServiceResult> {
  const result: ServiceResult = {
    ok: true,
    output: `processed mode=${request.mode}`,
    processedAt: new Date().toISOString(),
  };
  fs.writeFileSync('artifacts/output.json', JSON.stringify(result, null, 2));
  return result;
}

export function buildServiceConfig(overrides: Partial<ServiceRequest>): ServiceRequest {
  return { mode: 'default', ...overrides };
}
