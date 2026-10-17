#!/usr/bin/env node
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {validateDataset, buildEvidence, detectConflicts} from '../src/index.js';
import {askWithOllama} from '../src/ollama.js';
import {makeServer} from '../src/server.js';

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  return index < 0 ? fallback : process.argv[index + 1];
}

const command = process.argv[2];
if (!['ask', 'serve', 'inspect'].includes(command)) {
  console.log('Usage: fieldnotes <ask|serve|inspect> --data records.json [--model qwen3:8b] [--port 4173]');
  process.exit(command ? 1 : 0);
}

try {
  const dataPath = resolve(option('--data', 'examples/sample-records.json'));
  const dataset = validateDataset(JSON.parse(await readFile(dataPath, 'utf8')));
  const model = option('--model', process.env.OLLAMA_MODEL ?? 'qwen3:8b');
  if (command === 'inspect') {
    console.log(JSON.stringify({assets: dataset.assets.length, records: dataset.records.length, conflicts: detectConflicts(dataset.records)}, null, 2));
  } else if (command === 'ask') {
    const question = option('--question');
    if (!question) throw new Error('Pass --question "your question".');
    const result = await askWithOllama(dataset, question, {model});
    console.log(JSON.stringify(result, null, 2));
  } else {
    const port = Number(option('--port', '4173'));
    if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Port must be 1–65535.');
    const server = makeServer(dataset, {model});
    server.listen(port, '127.0.0.1', () => console.log(`Fieldnotes AI: http://127.0.0.1:${port}`));
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
