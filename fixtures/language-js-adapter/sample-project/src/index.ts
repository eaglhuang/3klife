import { runService } from './service';
import { ApiFacade } from './api';

async function main(): Promise<void> {
  const api = new ApiFacade();
  const result = await runService({ mode: 'default' });
  api.handleResult(result);
}

main();
