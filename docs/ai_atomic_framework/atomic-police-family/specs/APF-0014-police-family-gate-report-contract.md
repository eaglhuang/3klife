<!-- doc_id: doc_other_0635 -->
# APF-0014 — PoliceFamilyGateReport Contract

## 1. Report shape

```ts
interface PoliceFamilyGateReport {
  schemaId: 'atm.policeFamilyGateReport';
  specVersion: '0.1.0';
  profile: 'standard' | 'full';
  generatedAt: string;
  ok: boolean;
  canPromote: boolean;
  families: PoliceFamilyGateFamilyReport[];
  findings: PoliceFinding[];
  advisoryFindings: PoliceFinding[];
  blockingFindings: PoliceFinding[];
}

interface PoliceFamilyGateFamilyReport {
  family: PoliceFinding['policeFamily'];
  mode: 'fast' | 'slow';
  blocker: boolean;
  advisoryOnly: boolean;
  sourceValidator: string;
  status: 'passed' | 'findings' | 'blocked' | 'skipped' | 'error';
  findingCount: number;
}
```

## 2. Family report rules

- `blocker=true` 表示該 family 在目前 profile 中可造成 deterministic fail。
- `advisoryOnly=true` 表示 finding 必須保留但不得直接 fail gate。
- `sourceValidator` 必須指回實際 adapter / validator，例如 `validate-police-family`, `validate-regression-compare`, `map-curator-adapter`。
- `canPromote=false` 代表尚未滿足 APF-0010 的 advisory→blocker promotion gate。

## 3. ReviewAdvisory bridge

Police finding 預設以現有欄位承載：

```ts
const advisoryFinding = {
  trigger: 'machine-finding',
  metadata: {
    policeFinding,
  },
};
```

`payload` 只可列為未來 additive API proposal；本 contract 不宣稱 upstream 目前已有 `payload` 欄位。

## 4. Evidence/readModel

`PoliceFinding.evidenceRefs` 只能引用 APF-0012 定義的 official evidence type 或 police-local artifact/readModel ref。`readModel` 是重跑入口，不是新的 storage authority。
