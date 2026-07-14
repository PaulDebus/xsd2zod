# xsd2zod

Generate Zod schemas from XSD with a metadata-driven XML runtime for parsing and serialization.

```ts
const ir = parseXsd(['schema.xsd']);
const { schemas, metadata } = irToZod(ir);
```

## Install

```sh
npm install xsd2zod
```

## Pipeline

```
XSD files → parseXsd() → IR → irToZod() → { Zod schemas, runtime metadata }
                                                       ↓
                                              createRootHelpers() → parseXml / serializeXml
```

### 1. Parse XSD to IR

```ts
import { parseXsd } from 'xsd2zod';

const ir = parseXsd(['path/to/schema.xsd']);
// XsdIr with targetNamespaces, simpleTypes, complexTypes, elements, rootElements
```

Handles `xs:sequence`, `xs:choice` (discriminated unions), `xs:attribute`, `xs:simpleContent`, `xs:complexContent` (extension chains), `xs:include`/`xs:import`, element `ref`, nillable elements, qualified/unqualified form defaults.

### 2. Generate Zod code

```ts
import { irToZod } from 'xsd2zod';

const { schemas, metadata } = irToZod(ir);
// schemas:   emitted Zod schema code (string)
// metadata:  runtime type metadata for XML parsing (string)
```

The generated `schemas` output is ready to write to `.ts` files:

```ts
// AUTO-GENERATED — DO NOT EDIT
import { z } from 'zod';
const schemas: Record<string, z.ZodTypeAny> = {};
schemas["{urn:example}OrderType"] = z.object({ ... });
export const orderSchema = schemas["{urn:example}OrderType"];
```

### 3. Parse/serialize XML at runtime

```ts
import { createRootHelpers } from 'xsd2zod';
import { runtimeMetadata } from './generated-metadata';

const orderMeta = runtimeMetadata.roots.find(r => r.rootElement.endsWith('}order'))!;
const { parseXml, serializeXml } = createRootHelpers<Order>(orderMeta);

const order = parseXml(`<order xmlns="urn:example" id="42">...</order>`);
const xml = serializeXml(order);
```

## Features

- **XSD constructs**: `sequence`, `choice` (→ `z.discriminatedUnion`), `all`, `attribute`, `simpleContent`, `complexContent` (extension flattening)
- **Namespaces**: Clark notation `{ns}local` throughout, qualified/unqualified form defaults, `xs:include`/`xs:import` across files
- **Cardinality**: `minOccurs`/`maxOccurs` → `z.array()` / `.optional()`, `unbounded`
- **Nillable**: `xsi:nil="true"` → `.nullable()` in schema, round-trips through serialize
- **Element refs**: `<xs:element ref="t:global"/>` resolved via global element declarations
- **Runtime**: metadata-driven XML parsing and serialization with full ns prefix management

## Limitations (v1)

- Simple type restrictions (`enumeration`, `pattern`, etc.) are not modeled — base type is used
- `xs:any` / `xs:anyAttribute` wildcards are not supported
- Attribute `ref` is parsed but type defaults to `xs:string` (global attribute declarations not collected)
- Mixed content models are not supported
