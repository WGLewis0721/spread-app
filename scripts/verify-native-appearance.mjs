import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Check the rendered native root in an unfiltered simulator accessibility snapshot. */
export function verifyNativeAppearance(snapshot, expected) {
  if (!['dark', 'light'].includes(expected)) throw new Error('Expected appearance must be dark or light');
  const values = [];
  function visit(value) {
    if (!value || typeof value !== 'object') return;
    if (value.identifier === 'native-content') values.push(value.value);
    for (const child of Object.values(value)) visit(child);
  }
  visit(snapshot);
  if (values.length === 0) throw new Error('The snapshot has no native-content accessibility root');
  if (values.some(value => typeof value !== 'string' || !value.endsWith(';' + expected))) {
    throw new Error(`Expected rendered ${expected}; native root values: ${JSON.stringify(values)}`);
  }
  return { expected, rootCount: values.length, values };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const snapshot = JSON.parse(readFileSync(process.argv[2], 'utf8'));
    console.log(JSON.stringify(verifyNativeAppearance(snapshot, process.argv[3])));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
