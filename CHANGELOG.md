<!-- doc_id: doc_other_0105 -->
# Changelog

All notable changes are documented in this file.

## Changelog Policy

Use one section per released version and keep entries grouped by contract impact.

Required sections (when applicable):

1. `Breaking Changes`
2. `Deprecated`
3. `Migration Notes`
4. `Added`
5. `Changed`
6. `Fixed`
7. `Security`
8. `Rollback Notes`

Each release section SHOULD include:

1. Version number and date.
2. Release channel.
3. Proposal / decision reference.
4. Validator evidence reference.

## Version Entry Template

```markdown
## [x.y.z] - YYYY-MM-DD

### Release Channel
- alpha0 | alpha1 | beta | stable | lts

### Breaking Changes
- ...

### Deprecated
- ...

### Migration Notes
- ...

### Added
- ...

### Changed
- ...

### Fixed
- ...

### Security
- ...

### Rollback Notes
- window: ...
- trigger: ...
- route: version-pin | hotfix-patch | full-revert
```
