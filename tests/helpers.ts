import fs from 'node:fs';
import { expect } from 'vitest';
import { createRootHelpers, irToZod, parseXsd } from '../src/index.js';
import type { RuntimeRootMetadata } from '../src/types.js';

export interface TestCase {
  name: string;
  xsdFiles: string[];
  xmlFile: string;
}

export function extractRootLocalName(xml: string): string {
  const match = xml.match(/<([^!?][^\s?>/]*)/);
  if (!match) throw new Error('Cannot find root element in XML');
  const name = match[1];
  const colonIdx = name.indexOf(':');
  return colonIdx >= 0 ? name.slice(colonIdx + 1) : name;
}

export function getRuntimeRoots(xsdFiles: string[]): RuntimeRootMetadata[] {
  const ir = parseXsd(xsdFiles);
  const generated = irToZod(ir);

  const metadataMatch = generated.metadata.match(/runtimeMetadata = ([\s\S]+) as const;/);
  if (!metadataMatch) throw new Error('runtime metadata not found in generated output');
  return JSON.parse(metadataMatch[1]).roots as RuntimeRootMetadata[];
}

export function findRootMetadata(
  runtimeRoots: RuntimeRootMetadata[],
  xml: string,
): RuntimeRootMetadata {
  const xmlRootTag = extractRootLocalName(xml);
  const rootMeta = runtimeRoots.find(r => {
    const localName = r.rootElement.split('}').pop()!;
    return localName === xmlRootTag;
  });
  if (!rootMeta) {
    expect.fail(`root element <${xmlRootTag}> not found in runtime metadata`);
  }
  return rootMeta;
}

export function runRoundTrip(xsdFiles: string[], xmlFile: string): void {
  const runtimeRoots = getRuntimeRoots(xsdFiles);
  const xml = fs.readFileSync(xmlFile, 'utf8');
  const rootMeta = findRootMetadata(runtimeRoots, xml);

  const { parseXml, serializeXml } = createRootHelpers<Record<string, unknown>>(rootMeta);

  const objectA = parseXml(xml);
  const serialized = serializeXml(objectA);
  expect(serialized).toBeTruthy();

  const objectB = parseXml(serialized);
  expect(objectB).toEqual(objectA);
}
