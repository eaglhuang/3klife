<!-- doc_id: doc_other_0728 -->
# ATM Changeset and Release Intent Policy

ATM 可使用 Changesets，也可先使用 `.atm/release-intents/*.md`。無論工具為何，欄位必須可機械化轉成 changelog、release note 與版本判斷。

## 1. Impact Values

| release_impact | Meaning | Version Effect |
| --- | --- | --- |
| `none` | no public release surface change | no version bump |
| `patch` | compatible bugfix or public behavior correction | patch |
| `minor` | backward-compatible feature or additive public API | minor |
| `major` | incompatible public API or contract change | major |

## 2. `none` Is Allowed When

1. docs typo or formatting only。
2. tests only。
3. internal refactor with no public behavior change。
4. local tooling that is not part of release surface。

## 3. Patch Is Required When

1. public bugfix changes runtime behavior in a compatible way。
2. adapter/plugin public behavior correction。
3. docs fix changes adopter instruction for already released behavior。
4. security hardening with no breaking behavior。

## 4. Minor Is Required When

1. public additive API。
2. new CLI flag with backward compatibility。
3. new official adapter/plugin capability。
4. new schema field that old consumers can ignore safely。

## 5. Major Is Required When

1. public API removal or incompatible signature change。
2. schema incompatibility。
3. adapter contract break。
4. migration requires adopter code or data change and cannot be optional。

## 6. File Format

```yaml
package_group: core
public_api: true
release_impact: minor
core_impact: minor
requires_migration: false
requires_release_note: true
```

## 7. Validation

```bash
node tools_node/atm-version-upgrade-flow.js impact --version <next>
node tools_node/atm-version-upgrade-flow.js validate-release
```
