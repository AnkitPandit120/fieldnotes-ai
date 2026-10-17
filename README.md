# Fieldnotes AI

An evidence-first asset intelligence copilot for oil-well inspections, maintenance, operations, manuals, and human feedback. Built for **Hacktoberfest Hack Day Pune x AI Hackers Collective** and its **Asset Intelligence Copilot Challenge**.

Fieldnotes combines scattered records into a searchable local workspace. It retrieves relevant evidence, detects conflicting numeric readings, and asks an **open-weight Qwen3 model running through Ollama** for a cited answer. The model is instructed to flag uncertainty and leave operational decisions to people. A local dashboard shows assets, source counts, conflicting readings, the answer, and the underlying records.

> The included records are fictional demo data. This prototype is not a safety system and should not be used for real operational decisions.

## Quick start

Requires Node.js 20+ and [Ollama](https://ollama.com/) with an installed open-weight model. The default model is `qwen3:8b`.

```sh
ollama pull qwen3:8b
git clone https://github.com/AnkitPandit120/fieldnotes-ai.git
cd fieldnotes-ai
npm run demo
```

Open <http://127.0.0.1:4173>. Ollama must be running for questions to receive model answers. The asset overview and conflict watch work without a model.

Use a different installed model:

```sh
node bin/fieldnotes.js serve --data examples/sample-records.json --model gemma4:31b
```

The model name above is an example of a configurable model tag. Use a tag actually installed on your machine.

## CLI and package API

```sh
node bin/fieldnotes.js inspect --data examples/sample-records.json
node bin/fieldnotes.js ask --data examples/sample-records.json --question "Are there conflicting pressure readings for Aster 17?"
node bin/fieldnotes.js serve --data examples/sample-records.json --port 4173
```

The package exports `validateDataset`, `retrieve`, `detectConflicts`, `buildEvidence`, `makePrompt`, and `normalizeAnswer` from `src/index.js`. It has no runtime npm dependencies.

## Data format

`assets` lists assets with an `id` and `name`. `records` holds one item per source, with a unique `id`, `asset_id`, `type`, `date` (`YYYY-MM-DD`), `text`, and `source`. Optional `title` and numeric `measurements` add context.

```json
{
  "assets": [{"id":"WELL-A17","name":"Aster 17","site":"North Ridge"}],
  "records": [{
    "id":"INS-101",
    "asset_id":"WELL-A17",
    "type":"inspection",
    "date":"2026-10-14",
    "title":"Weekly pressure inspection",
    "text":"Tubing pressure 182 bar. Minor seal seep at valve V-2.",
    "measurements":{"tubing_pressure_bar":182},
    "source":"inspection/INS-101.pdf"
  }]
}
```

The sample data uses labels that resemble document paths; those original documents are not included. Each label identifies the origin represented by the demo record. The application ingests structured JSON only; PDF/CSV parsing is a future extension.

## How answers are grounded

1. A transparent keyword retriever ranks records using the asset name, id, title, text, and source label.
2. A deterministic conflict pass compares numeric measurements for the same asset, date, and metric. Differences above 5% are surfaced as disagreements.
3. Only the selected records and detected conflicts go to the local model through Ollama's `/api/generate` API.
4. The model returns JSON containing an answer, record-id citations, caveats, and a suggested follow-up. Unknown citation IDs are discarded, and an answer with no valid citations is rejected.

## Honest limitations

- Retrieval is keyword based, so synonyms or misspellings can miss relevant records.
- Conflict detection groups by calendar day and metric; real deployments need timestamps, units, sensor provenance, and domain-specific tolerances.
- The model can still make mistakes even with citation checks. Citations prove only that a record was supplied, not that every sentence is entailed by it.
- The server binds to `127.0.0.1` and is meant for local demonstration. It has no authentication or multi-user storage.
- This submission was prepared without running tests at the user's request. No test result is claimed.

## AI disclosure

Codex helped implement and document this project. Runtime answers use the locally hosted open-weight Qwen3 model through Ollama. No cloud AI API key is needed for the default setup.

## License

MIT. See [LICENSE](LICENSE).
