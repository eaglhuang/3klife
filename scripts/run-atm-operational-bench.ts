import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runOperationalBench } from './lib/operational-bench/runner.ts';
import type { OperationalBenchProfileName } from './lib/operational-bench/types.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv: readonly string[]): { profile: OperationalBenchProfileName; seed: number; out?: string } {
  let profile: OperationalBenchProfileName = 'smoke';
  let seed = 20260627;
  let out: string | undefined;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--profile' || arg === '--mode') {
      profile = argv[++index] as OperationalBenchProfileName;
    } else if (arg.startsWith('--profile=')) {
      profile = arg.slice('--profile='.length) as OperationalBenchProfileName;
    } else if (arg.startsWith('--mode=')) {
      profile = arg.slice('--mode='.length) as OperationalBenchProfileName;
    } else if (arg === '--seed') {
      seed = Number(argv[++index]);
    } else if (arg.startsWith('--seed=')) {
      seed = Number(arg.slice('--seed='.length));
    } else if (arg === '--out') {
      out = argv[++index];
    } else if (arg.startsWith('--out=')) {
      out = arg.slice('--out='.length);
    } else if (arg === '--help' || arg === '-h') {
      console.log('Usage: run-atm-operational-bench.ts --profile smoke|paper|extended [--seed N] [--out DIR]');
      process.exit(0);
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  if (!['smoke', 'paper', 'extended'].includes(profile)) throw new Error(`invalid profile: ${profile}`);
  if (!Number.isInteger(seed) || seed < 0) throw new Error(`invalid seed: ${seed}`);
  return { profile, seed, out };
}

const args = parseArgs(process.argv.slice(2));
const outDir = args.out
  ? path.resolve(root, args.out)
  : path.resolve(root, args.profile === 'paper'
    ? 'artifacts/generated/atm-operational-bench/20260627'
    : `artifacts/generated/atm-operational-bench/${args.profile}-${args.seed}`);

const summary = await runOperationalBench({ root, profile: args.profile, seed: args.seed, outDir });

console.log(JSON.stringify({
  profile: args.profile,
  seed: args.seed,
  outDir: path.relative(root, outDir).replace(/\\/g, '/'),
  scenarioCount: summary.scenarioCount,
  repeatCount: summary.repeatCount,
  warmupCount: summary.warmupCount,
  totalRows: Object.values(summary.routeDistribution).reduce((sum, value) => sum + value, 0),
  fullRegenerationRate: summary.recoveryMetrics.fullRegenerationRate
}, null, 2));
