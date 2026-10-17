import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {detectConflicts, validateDataset} from './index.js';
import {askWithOllama} from './ollama.js';

const webDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'web');
const assets = {'/': ['index.html', 'text/html'], '/app.js': ['app.js', 'text/javascript'], '/style.css': ['style.css', 'text/css']};

function send(res, status, value) {
  res.writeHead(status, {'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store'});
  res.end(JSON.stringify(value));
}

async function bodyJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 16_384) throw new Error('Question is too large.');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export function makeServer(dataset, options = {}) {
  validateDataset(dataset);
  return createServer(async (req, res) => {
    try {
      const path = new URL(req.url, 'http://localhost').pathname;
      if (req.method === 'GET' && path === '/api/overview') {
        return send(res, 200, {assets: dataset.assets, records: dataset.records, conflicts: detectConflicts(dataset.records), model: options.model ?? process.env.OLLAMA_MODEL ?? 'qwen3:8b'});
      }
      if (req.method === 'POST' && path === '/api/ask') {
        const body = await bodyJson(req);
        if (typeof body.question !== 'string' || body.question.trim().length < 4 || body.question.length > 500) return send(res, 400, {error: 'Question must be 4–500 characters.'});
        const answer = await askWithOllama(dataset, body.question.trim(), options);
        return send(res, 200, answer);
      }
      if (req.method === 'GET' && assets[path]) {
        const [file, mime] = assets[path];
        const content = await readFile(join(webDir, file));
        res.writeHead(200, {'content-type': `${mime}; charset=utf-8`});
        return res.end(content);
      }
      send(res, 404, {error: 'Not found'});
    } catch (error) {
      send(res, error instanceof SyntaxError ? 400 : 503, {error: error.message});
    }
  });
}
