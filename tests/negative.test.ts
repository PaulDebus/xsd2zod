import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { createRootHelpers, irToZod, parseXsd } from '../src/index.js';
import type { RuntimeRootMetadata } from '../src/types.js';

const NEGATIVE_DIR = path.resolve('testdata/curated/negative');

interface NegativeCase {
  name: string;
  xmlFile: string;
  expectedToThrow: boolean;
}

function discoverNegativeCases(): NegativeCase[] {
  const cases: NegativeCase[] = [];
  for (const f of fs.readdirSync(NEGATIVE_DIR)) {
    if (f.endsWith('.xml')) {
      cases.push({
        name: f.replace(/\.xml$/, ''),
        xmlFile: path.join(NEGATIVE_DIR, f),
        expectedToThrow: f.includes('namespace'),
      });
    }
  }
  return cases;
}

function extractRootLocalName(xml: string): string {
  const match = xml.match(/<([^\s?>/]+)/);
  if (!match) throw new Error('Cannot find root element in XML');
  const name = match[1];
  const colonIdx = name.indexOf(':');
  return colonIdx >= 0 ? name.slice(colonIdx + 1) : name;
}

const negativeCases = discoverNegativeCases();

describe('negative — invalid XML handling', () => {
  const xsdPath = path.join(NEGATIVE_DIR, 'invalid.xsd');
  if (!fs.existsSync(xsdPath)) {
    it('skip — no negative test XSD found', () => {});
    return;
  }

  const ir = parseXsd([xsdPath]);
  const generated = irToZod(ir);

  const metadataMatch = generated.metadata.match(/runtimeMetadata = ([\s\S]+) as const;/);
  if (!metadataMatch) throw new Error('runtime metadata not found');
  const runtimeRoots = JSON.parse(metadataMatch[1]).roots as RuntimeRootMetadata[];

  for (const c of negativeCases) {
    if (c.expectedToThrow) {
      it(`rejects ${c.name}`, () => {
        const xml = fs.readFileSync(c.xmlFile, 'utf8');
        const xmlRootTag = extractRootLocalName(xml);
        const rootMeta = runtimeRoots.find(r => {
          const localName = r.rootElement.split('}').pop()!;
          return localName === xmlRootTag;
        });

        if (!rootMeta) {
          return;
        }

        const { parseXml } = createRootHelpers<Record<string, unknown>>(rootMeta);
        expect(() => parseXml(xml)).toThrow();
      });
    } else {
      it(`gracefully handles ${c.name} (no throw — lenient validation)`, () => {
        const xml = fs.readFileSync(c.xmlFile, 'utf8');
        const xmlRootTag = extractRootLocalName(xml);
        const rootMeta = runtimeRoots.find(r => {
          const localName = r.rootElement.split('}').pop()!;
          return localName === xmlRootTag;
        });

        if (!rootMeta) {
          return;
        }

        const { parseXml } = createRootHelpers<Record<string, unknown>>(rootMeta);
        expect(() => parseXml(xml)).not.toThrow();
      });
    }
  }
});
