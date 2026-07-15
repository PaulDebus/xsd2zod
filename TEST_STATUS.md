# Test Suite Status

## Levels
- **fast** (`npm test`): runs on every push/PR
- **extended** (`npm run test:extended`): runs on merge to main, releases
- **nightly** (`npm run test:nightly`): runs on demand / scheduled

## Phase 1 — Fast suite (current)
- [x] Basic declarations (element, attribute, complexType, simpleType)
- [x] Content models (sequence, choice, all)
- [x] Cardinality (required, optional, unbounded)
- [x] Primitive types (string, boolean, decimal, integer)
- [x] Namespaces (qualified, unqualified, multi-ns)
- [x] Imports/includes
- [x] Negative test variants (7+)
- [x] xmlschema examples (vehicles, collection, stockquote, menù)
- [x] UBL Invoice + Order round-trip
- [x] CI workflow (fast on push/PR, extended on main/release)

## Phase 2 — Extended suite (future)
- [ ] W3C XSD 1.0 smoke tests (50-100)
- [ ] UBL CreditNote
- [ ] Import-resolution failure cases

## Phase 3 — Nightly conformance (current)
- [x] W3C XSD 1.0 smoke tests (4 Boeing IPO variants — 8 test cases)
- [x] Benchmark: parse all upstream XSDs under 5s
- [ ] Full W3C XSD 1.0 corpus (26k+ XML files — needs filtering)
- [ ] XSD 1.1 corpus (if licensing clarified)

## Known gaps (not yet supported by xsd2zod)
- Mixed content models
- xs:any / xs:anyAttribute wildcards
- Identity constraints (xs:key, xs:keyref, xs:unique)
- Substitution groups
- Simple type restrictions (enumeration, pattern, etc.)
