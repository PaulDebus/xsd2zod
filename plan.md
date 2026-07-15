# Comprehensive Test Suite Plan

## Overview

Implement a multi-tier test suite for xsd2zod using real-world XSD files with corresponding XML instances. The suite tests round-trip fidelity: parse XSD → generate Zod schemas → parse XML → serialize XML → re-parse → deep-compare.

---

## Test Data Sources

| Source | License | GPLv3 Compatible | Strategy |
|--------|---------|-----------------|----------|
| xmlschema examples (MIT) | MIT | ✅ | Check into `testdata/upstream/xmlschema/` |
| OASIS UBL 2.4 (relevant subset) | OASIS RF on Limited Terms | ✅ (with attribution) | Check into `testdata/upstream/oasis-ubl-2.4/` |
| W3C XSD test suite | W3C Document License | ⚠️ No derivatives | Git submodule at `testdata/upstream/w3c-xsdtests/` |
| Curated in-house fixtures | CC0-1.0 | ✅ | Write in-house at `testdata/curated/` |

**Note:** DocBook 5 XSD is **not** included — xsd2zod doesn't support mixed content, which DocBook is heavy on.

---

## Directory Layout

```
testdata/
  THIRD_PARTY_NOTICES.md
  curated/                          # CC0-1.0, hand-authored
    basic/
      simple-element.xsd, simple-element.xml
      attributes.xsd, attributes.xml
      simpleType.xsd, simpleType.xml
      complexType.xsd, complexType.xml
    content-models/
      sequence.xsd, sequence.xml
      choice.xsd, choice.xml
      all.xsd, all.xml
      nested-sequence.xsd, nested-sequence.xml
    cardinality/
      required.xsd, required.xml
      optional.xsd, optional.xml
      unbounded.xsd, unbounded.xml
      min-occurs-zero.xsd, min-occurs-zero.xml
    types/
      string.xsd, string.xml
      boolean.xsd, boolean.xml
      decimal.xsd, decimal.xml
      integer.xsd, integer.xml
    namespaces/
      qualified.xsd, qualified.xml
      unqualified.xsd, unqualified.xml
      multi-ns.xsd, multi-ns.xml
    imports/
      include.xsd, include.xml
      import.xsd, import.xml
      chained-imports.xsd, chained-imports.xml
    negative/
      invalid-missing-required-element.xml
      invalid-wrong-element-order.xml
      invalid-unexpected-element.xml
      invalid-min-occurs.xml
      invalid-max-occurs.xml
      invalid-nil-with-content.xml
      invalid-namespace.xml
  upstream/
    xmlschema/                    # MIT license — all 4 example sets
      vehicles/
      collection/
      stockquote/
      menù/
    oasis-ubl-2.4/                # OASIS Open license — relevant subset
      xsdrt/
      xml/
    w3c-xsdtests/                 # Git submodule, pinned commit
```

---

## Test Levels

| Level | Command | When | Scope | Est. Time |
|-------|---------|------|-------|-----------|
| **fast** | `npm test` | Every push/PR | Curated fixtures (20-30) + xmlschema (~15) + 1 UBL test | ~1-2s |
| **extended** | `npm run test:extended` | Merge to main, releases | Fast + UBL full subset + W3C smoke (50-100) | ~10-30s |
| **nightly** | `npm run test:nightly` | Scheduled / on demand | Extended + full W3C corpus | ~minutes |

---

## Vitest Configuration

Uses vitest's [project feature](https://vitest.dev/guide/projects.html) to define three test scopes with matching file-name conventions.

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts']
  },
  projects: [
    {
      name: 'fast',
      test: {
        include: ['tests/**/*.test.ts'],
        exclude: ['tests/**/*.extended.test.ts', 'tests/**/*.nightly.test.ts']
      }
    },
    {
      name: 'extended',
      test: {
        include: ['tests/**/*.test.ts', 'tests/**/*.extended.test.ts'],
        exclude: ['tests/**/*.nightly.test.ts']
      }
    },
    {
      name: 'nightly',
      test: {
        include: ['tests/**/*.test.ts', 'tests/**/*.extended.test.ts', 'tests/**/*.nightly.test.ts']
      }
    }
  ]
});
```

### File-naming convention

| Pattern | Level |
|---------|-------|
| `*.test.ts` | fast |
| `*.extended.test.ts` | extended |
| `*.nightly.test.ts` | nightly |

---

## Package.json Scripts

```json
{
  "scripts": {
    "test": "vitest run --project fast",
    "test:extended": "vitest run --project extended",
    "test:nightly": "vitest run --project nightly",
    "test:watch": "vitest"
  }
}
```

---

## CI Pipeline

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]

jobs:
  fast:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm test

  extended:
    if: github.ref == 'refs/heads/main' || github.event_name == 'release'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          submodules: recursive
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:extended
```

---

## Round-Trip Test Design

For each test case (XSD + XML pair):

1. Parse the XSD with `parseXsd()` → IR
2. Generate Zod schemas + metadata with `irToZod()`
3. For each root element in the metadata, find a matching XML file
4. Parse the XML using `parseXml()` → object A
5. Serialize back using `serializeXml()` → XML string
6. Re-parse the serialized XML → object B
7. Deep-compare object A and object B

### Edge cases in comparison

- **Whitespace in text values**: trim before comparison
- **Attribute order**: parsed objects are unordered maps, order is irrelevant
- **Namespace prefix differences**: parsed objects resolve prefixes to URIs, so `ns0:foo` and `ns1:foo` mapping to the same namespace are equivalent
- **Empty vs absent**: `<foo/>` vs no `<foo>` element — parser must produce consistent output
- **xsi:nil**: `xsi:nil="true"` → `null` → `xsi:nil="true"` must round-trip

---

## License Compliance

- `testdata/THIRD_PARTY_NOTICES.md` lists all upstream sources, their licenses, and URLs
- Each upstream directory retains its original license/notice file
- W3C test suite consumed via git submodule (pinned commit), not redistributed in our repo
- Curated in-house fixtures use CC0-1.0 (dedicated to public domain)

---

## TEST_STATUS.md

Create `TEST_STATUS.md` at repo root to track current state and roadmap:

```markdown
# Test Suite Status

## Levels
- **fast** (`npm test`): runs on every push/PR
- **extended** (`npm run test:extended`): runs on merge to main, releases
- **nightly** (`npm run test:nightly`): runs on demand / scheduled

## Phase 1 — Fast suite (current)
- [ ] Basic declarations (element, attribute, complexType, simpleType)
- [ ] Content models (sequence, choice, all)
- [ ] Cardinality (required, optional, unbounded)
- [ ] Primitive types (string, boolean, decimal, integer)
- [ ] Namespaces (qualified, unqualified, multi-ns)
- [ ] Imports/includes
- [ ] Negative test variants (10+)
- [ ] xmlschema examples (vehicles, collection, stockquote, menù)
- [ ] UBL Invoice round-trip
- [ ] CI workflow (fast on push/PR, extended on main/release)

## Phase 2 — Extended suite (future)
- [ ] W3C XSD 1.0 smoke tests (50-100)
- [ ] UBL Order, CreditNote
- [ ] Import-resolution failure cases

## Phase 3 — Nightly conformance (future)
- [ ] Full W3C XSD 1.0 corpus
- [ ] XSD 1.1 corpus (if licensing clarified)

## Known gaps (not yet supported by xsd2zod)
- Mixed content models
- xs:any / xs:anyAttribute wildcards
- Identity constraints (xs:key, xs:keyref, xs:unique)
- Substitution groups
- Simple type restrictions (enumeration, pattern, etc.)
```

---

## Implementation Order

1. Create `testdata/` directory structure with `THIRD_PARTY_NOTICES.md`
2. Download xmlschema examples (vehicles, collection, stockquote, menù) into `testdata/upstream/xmlschema/` with MIT notice
3. Download UBL 2.4 relevant subset (Invoice + Order + dependencies) into `testdata/upstream/oasis-ubl-2.4/` with OASIS notice
4. Add W3C test suite as git submodule at `testdata/upstream/w3c-xsdtests/`
5. Write curated in-house fixtures (CC0-1.0) at `testdata/curated/`:
   - ~15-20 positive test cases
   - ~10 negative test variants
6. Write `tests/roundtrip.test.ts` — auto-discovers test cases, runs round-trip
7. Update `vitest.config.ts` with project definitions
8. Update `package.json` with test scripts
9. Add `.github/workflows/test.yml`
10. Update `.gitignore`
11. Create `TEST_STATUS.md`
