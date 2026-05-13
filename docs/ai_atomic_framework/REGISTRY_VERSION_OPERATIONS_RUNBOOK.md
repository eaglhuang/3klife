# Registry Version Operations Runbook

## When To Use

Use this runbook when you need to:

- append a new version into `versions[]`
- promote or realign `currentVersion`
- verify registry consistency before merge

## Step 1: Baseline Snapshot

```bash
npm run validate:registry-version-governance -- --strict
npm run validate:registry-sidecar-convergence -- --strict
npm run validate:registry-backfill-sweep -- --strict
```

If any command reports blockers, stop here.

## Step 2: Edit Registry Version Data

Update `atomic-registry.json`:

1. append version record in `versions[]`
2. set `currentVersion` only when candidate is validated
3. keep previous versions untouched

## Step 3: Re-validate Before Apply

```bash
npm run validate:registry-version-governance -- --strict
npm run validate:registry-sidecar-convergence -- --strict
npm run validate:registry-backfill-sweep -- --strict
npm run validate:atm-any-boundaries -- --strict
```

## Step 4: Apply Managed Alignment

Only after review pass:

```bash
npm run sync:registry-version-governance
```

Then rerun step 3.

## Step 5: Rollback Linkage

If promotion must be reverted:

1. restore target version as `currentVersion`
2. rerun strict validations
3. keep rollback evidence in PR notes and ATM evidence trail

## Step 6: Merge Gate

Required minimum gate:

```bash
npm test
npm run gate:quick
npm run validate:atm-stability-closeout -- --strict
```

