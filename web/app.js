const $ = selector => document.querySelector(selector);
const make = (tag, className, text) => { const el = document.createElement(tag); if (className) el.className = className; if (text !== undefined) el.textContent = text; return el; };
const typeNames = {inspection: 'Inspection', operations: 'Operations', maintenance: 'Maintenance', manual: 'Manual', feedback: 'Field feedback'};
let overview;

function renderOverview(data) {
  overview = data;
  $('#model').textContent = data.model.toUpperCase();
  $('#asset-count').textContent = String(data.assets.length).padStart(2, '0');
  $('#record-count').textContent = `${String(data.records.length).padStart(2, '0')} RECORDS`;
  $('#conflict-count').textContent = String(data.conflicts.length).padStart(2, '0');
  for (const asset of data.assets) {
    const row = make('div', 'asset-row');
    const main = make('div'); main.append(make('strong', '', asset.name), make('span', '', `${asset.id} / ${asset.site}`));
    row.append(main, make('span', 'asset-kind', asset.kind)); $('#assets').append(row);
  }
  const types = [...new Set(data.records.map(r => r.type))];
  const max = Math.max(...types.map(type => data.records.filter(r => r.type === type).length));
  for (const type of types) {
    const count = data.records.filter(r => r.type === type).length;
    const row = make('div', 'chart-row'); row.append(make('span', '', typeNames[type] ?? type));
    const track = make('div', 'bar-track'); const bar = make('div', 'bar'); bar.style.width = `${count / max * 100}%`; track.append(bar);
    row.append(track, make('b', '', String(count).padStart(2, '0'))); $('#chart').append(row);
  }
  if (!data.conflicts.length) $('#conflicts').append(make('p', 'quiet', 'No numerical conflicts detected.'));
  for (const conflict of data.conflicts) {
    const card = make('div', 'conflict-card'); card.append(make('span', 'alert-label', 'RECORDS DISAGREE'), make('strong', '', `${conflict.asset_id} · ${conflict.metric.replaceAll('_', ' ')}`), make('p', '', `${conflict.readings.map(x => `${x.value} [${x.id}]`).join(' versus ')} on ${conflict.date}.`)); $('#conflicts').append(card);
  }
  for (const record of [...data.records].sort((a,b) => b.date.localeCompare(a.date))) {
    const row = make('div', 'record-row'); row.id = `record-${record.id}`;
    row.append(make('span', 'record-id', record.id), make('span', 'record-title', record.title), make('span', 'record-asset', record.asset_id), make('span', 'record-type', typeNames[record.type] ?? record.type), make('span', 'record-date', record.date));
    row.title = `${record.text}\nSource: ${record.source}`;
    $('#records').append(row);
  }
}

function renderAnswer(result) {
  const root = $('#answer'); root.replaceChildren();
  const header = make('div', 'answer-header'); header.append(make('span', '', 'FIELDNOTES RESPONSE'), make('span', '', `${result.citations.length} SOURCES`)); root.append(header);
  root.append(make('p', 'answer-text', result.answer));
  if (result.conflicts.length) root.append(make('div', 'answer-warning', `⚠ ${result.conflicts.length} numerical conflict(s) in the retrieved evidence. Confirm the reading with the responsible team.`));
  if (result.caveats.length) { const caveats = make('div', 'answer-caveats'); caveats.append(make('h3', '', 'CAVEATS')); for (const caveat of result.caveats) caveats.append(make('p', '', caveat)); root.append(caveats); }
  if (result.suggested_action) { const next = make('div', 'next-action'); next.append(make('span', '', 'SUGGESTED FOLLOW-UP'), make('p', '', result.suggested_action)); root.append(next); }
  const evidence = make('div', 'evidence'); evidence.append(make('h3', '', 'EVIDENCE')); for (const record of result.evidence) {
    const card = make('a', 'evidence-card'); card.href = `#record-${record.id}`; card.append(make('strong', '', record.id), make('span', '', record.title), make('small', '', `${record.date} / ${record.source}`)); evidence.append(card);
  } root.append(evidence);
}

$('#ask-form').addEventListener('submit', async event => {
  event.preventDefault(); const question = $('#question').value.trim(); if (!question) return;
  const button = $('#submit'); button.disabled = true; button.textContent = 'THINKING…';
  $('#answer').replaceChildren(make('p', 'loading', 'Reading the evidence and asking the local model…'));
  try {
    const response = await fetch('/api/ask', {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({question})});
    const body = await response.json(); if (!response.ok) throw new Error(body.error ?? 'Request failed.'); renderAnswer(body);
  } catch (error) { $('#answer').replaceChildren(make('p', 'error', `${error.message} Start Ollama and confirm the selected model is installed.`)); }
  finally { button.disabled = false; button.innerHTML = 'Ask Fieldnotes <span>↗</span>'; }
});
for (const button of document.querySelectorAll('[data-question]')) button.addEventListener('click', () => { $('#question').value = button.dataset.question; $('#ask-form').requestSubmit(); });
fetch('/api/overview').then(r => r.json()).then(renderOverview).catch(error => { $('#assets').textContent = `Could not load data: ${error.message}`; });
