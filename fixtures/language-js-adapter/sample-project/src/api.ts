import { buildServiceConfig, ServiceResult } from './service';

export interface ApiHealthResponse {
  status: string;
  timestamp: string;
}

export class ApiFacade {
  getHealth(): ApiHealthResponse {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  handleResult(result: ServiceResult): void {
    const config = buildServiceConfig({ mode: 'api' });
    console.log(`handled result for mode=${config.mode}: ok=${result.ok}`);
  }
}

export function createApiFacade(): ApiFacade {
  return new ApiFacade();
}
