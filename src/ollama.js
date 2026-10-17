import {buildEvidence, makePrompt, normalizeAnswer} from './index.js';

export async function askWithOllama(dataset, question, options = {}) {
  const evidence = buildEvidence(dataset, question);
  if (!evidence.records.length) return {answer: 'I could not find relevant records for that question.', citations: [], caveats: ['No matching evidence was found.'], suggested_action: 'Try an asset id or a more specific term.', evidence: [], conflicts: []};
  const model = options.model ?? process.env.OLLAMA_MODEL ?? 'qwen3:8b';
  const base = options.baseUrl ?? process.env.OLLAMA_URL ?? 'http://127.0.0.1:11434';
  const response = await fetch(new URL('/api/generate', base), {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify({model, prompt: makePrompt(question, evidence), stream: false, format: 'json', think: false, options: {temperature: 0, num_predict: 700}}),
    signal: AbortSignal.timeout(options.timeoutMs ?? 90000)
  });
  if (!response.ok) throw new Error(`Ollama returned ${response.status}. Confirm the model ${model} is installed and the server is running.`);
  const result = await response.json();
  let parsed;
  try { parsed = JSON.parse(result.response); }
  catch { throw new Error('The model did not return valid JSON.'); }
  return {...normalizeAnswer(parsed, evidence), model};
}
