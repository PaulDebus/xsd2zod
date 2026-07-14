import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { createRootHelpers, irToZod, parseXsd } from '../src/index.js';
import type { RuntimeRootMetadata } from '../src/types.js';

interface TestCase {
  name: string;
  xsdFiles: string[];
  xmlFile: string;
}

function discoverCuratedCases(): TestCase[] {
  const cases: TestCase[] = [];
  const base = path.resolve('testdata/curated');

  for (const cat of fs.readdirSync(base, { withFileTypes: true }).filter(d => d.isDirectory() && d.name !== 'negative')) {
    const catPath = path.join(base, cat.name);
    const files = fs.readdirSync(catPath);
    const allXsdPaths = files.filter(f => f.endsWith('.xsd')).map(f => path.join(catPath, f));

    for (const xmlFile of files.filter(f => f.endsWith('.xml'))) {
      const stem = xmlFile.replace(/\.xml$/, '');
      cases.push({
        name: `${cat.name}/${stem}`,
        xsdFiles: allXsdPaths,
        xmlFile: path.join(catPath, xmlFile),
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

function runRoundTrip(xsdFiles: string[], xmlFile: string): void {
  const ir = parseXsd(xsdFiles);
  const generated = irToZod(ir);

  const metadataMatch = generated.metadata.match(/runtimeMetadata = ([\s\S]+) as const;/);
  if (!metadataMatch) throw new Error('runtime metadata not found in generated output');
  const runtimeRoots = JSON.parse(metadataMatch[1]).roots as RuntimeRootMetadata[];

  const xml = fs.readFileSync(xmlFile, 'utf8');
  const xmlRootTag = extractRootLocalName(xml);

  const rootMeta = runtimeRoots.find(r => {
    const localName = r.rootElement.split('}').pop()!;
    return localName === xmlRootTag;
  });

  if (!rootMeta) {
    return;
  }

  const { parseXml, serializeXml } = createRootHelpers<Record<string, unknown>>(rootMeta);

  const objectA = parseXml(xml);
  const serialized = serializeXml(objectA);
  expect(serialized).toBeTruthy();

  const objectB = parseXml(serialized);
  expect(objectB).toEqual(objectA);
}

const curatedCases = discoverCuratedCases();

describe('curated round-trip', () => {
  for (const c of curatedCases) {
    it(`round-trips ${c.name}`, () => {
      runRoundTrip(c.xsdFiles, c.xmlFile);
    });
  }
});
